import logging
from pathlib import Path
from uuid import uuid4

from sqlalchemy import or_, select

from app.core.constants import GENERATED_OUTPUT_ROOT
from app.database.database import SessionLocal, is_database_available
from app.database.models import Project, WorkflowActivity
from app.utils.file_utils import ensure_dir, safe_read_json, safe_write_json, utc_now_iso

ACTIVITY_LOG_FILENAME = "workflow_activity_log.json"


def get_activity_log_path(project_id: str) -> Path:
    return ensure_dir(GENERATED_OUTPUT_ROOT / project_id) / ACTIVITY_LOG_FILENAME


def database_enabled() -> bool:
    return bool(SessionLocal is not None and is_database_available())


def serialize_activity(activity: WorkflowActivity) -> dict[str, str]:
    return {
        "activity_id": activity.activity_id,
        "project_id": activity.project_id,
        "paper_id": activity.paper_id or "",
        "activity_type": activity.activity_type,
        "activity_title": activity.activity_title,
        "activity_description": activity.activity_description or "",
        "source_module": activity.source_module,
        "status": activity.status,
        "created_at": activity.created_at.isoformat() if activity.created_at else "",
    }


def build_activity_payload(
    project_id: str,
    activity_type: str,
    activity_title: str,
    activity_description: str,
    source_module: str,
    paper_id: str | None = None,
    status: str = "completed",
) -> dict[str, str]:
    return {
        "activity_id": str(uuid4()),
        "project_id": project_id,
        "paper_id": paper_id or "",
        "activity_type": activity_type,
        "activity_title": activity_title,
        "activity_description": activity_description,
        "source_module": source_module,
        "status": status,
        "created_at": utc_now_iso(),
    }


def read_json_activities(project_id: str) -> list[dict[str, str]]:
    data = safe_read_json(get_activity_log_path(project_id))
    if not data:
        return []

    activities = data.get("activities", [])
    return activities if isinstance(activities, list) else []


def write_json_activity(activity: dict[str, str]) -> dict[str, str]:
    project_id = activity["project_id"]
    activities = read_json_activities(project_id)
    activities.insert(0, activity)
    safe_write_json(
        get_activity_log_path(project_id),
        {"project_id": project_id, "activities": activities[:250]},
        status="updated",
    )
    return activity


def log_activity(
    project_id: str,
    activity_type: str,
    activity_title: str,
    activity_description: str,
    source_module: str,
    paper_id: str | None = None,
    status: str = "completed",
) -> dict[str, str]:
    activity = build_activity_payload(
        project_id=project_id,
        paper_id=paper_id,
        activity_type=activity_type,
        activity_title=activity_title,
        activity_description=activity_description,
        source_module=source_module,
        status=status,
    )

    if not database_enabled():
        return write_json_activity(activity)

    try:
        assert SessionLocal is not None
        with SessionLocal() as db:
            project = db.scalars(
                select(Project).where(
                    Project.is_deleted.is_(False),
                    or_(
                        Project.project_id == project_id,
                        Project.human_readable_code == project_id,
                        Project.id == project_id,
                    ),
                )
            ).first()
            if project is None:
                return write_json_activity(activity)

            db_activity = WorkflowActivity(
                activity_id=activity["activity_id"],
                project_id=project.id,
                paper_id=paper_id,
                activity_type=activity_type,
                activity_title=activity_title,
                activity_description=activity_description,
                source_module=source_module,
                status=status,
            )
            db.add(db_activity)
            db.commit()
            db.refresh(db_activity)
            stored_activity = serialize_activity(db_activity)
            stored_activity["project_id"] = project_id
            write_json_activity(stored_activity)
            return stored_activity
    except Exception:
        logging.exception("Activity logging failed; falling back to JSON log.")
        return write_json_activity(activity)


def get_activities(project_id: str, paper_id: str | None = None) -> list[dict[str, str]]:
    json_activities = read_json_activities(project_id)

    if database_enabled():
        try:
            assert SessionLocal is not None
            with SessionLocal() as db:
                project = db.scalars(
                    select(Project).where(
                        Project.is_deleted.is_(False),
                        or_(
                            Project.project_id == project_id,
                            Project.human_readable_code == project_id,
                            Project.id == project_id,
                        ),
                    )
                ).first()
                if project is not None:
                    statement = select(WorkflowActivity).where(WorkflowActivity.project_id == project.id)
                    if paper_id:
                        statement = statement.where(WorkflowActivity.paper_id == paper_id.upper())
                    activities = db.scalars(statement.order_by(WorkflowActivity.created_at.desc())).all()
                    return [
                        {**serialize_activity(activity), "project_id": project_id}
                        for activity in activities
                    ]
        except Exception:
            logging.exception("Unable to read workflow activities from database.")

    if paper_id:
        return [activity for activity in json_activities if activity.get("paper_id") == paper_id.upper()]

    return json_activities
