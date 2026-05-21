import logging
from typing import Any

from app.services.activity_logger_service import read_json_activities
from app.services.paper_progress_service import build_project_paper_progress, read_json

logger = logging.getLogger(__name__)


def read_reviewer_probability(project_id: str, paper_id: str) -> int:
    reviewer_report = read_json(project_id, f"reviewer_report_{paper_id}.json")
    if not reviewer_report:
        return 0
    return int(reviewer_report.get("acceptance_probability", 0) or 0)


def build_readiness_distribution(papers: list[dict[str, Any]]) -> dict[str, int]:
    distribution = {
        "planned": 0,
        "in_progress": 0,
        "in_review": 0,
        "submission_ready": 0,
    }
    for paper in papers:
        status = str(paper.get("status", "planned"))
        distribution[status] = distribution.get(status, 0) + 1
    return distribution


def build_pipeline_overview(papers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    steps = [
        ("Structure", "structure_ready"),
        ("Sections", "sections_generated"),
        ("Reviewer", "reviewer_completed"),
        ("Revision", "revision_applied"),
        ("Full Paper", "full_paper_ready"),
        ("References", "references_ready"),
        ("Formatting", "formatting_ready"),
        ("Submission", "submission_ready"),
    ]
    total = len(papers) or 1
    return [
        {
            "label": label,
            "completed": sum(1 for paper in papers if paper.get(key)),
            "total": len(papers),
            "percent": round((sum(1 for paper in papers if paper.get(key)) / total) * 100),
        }
        for label, key in steps
    ]


def build_project_portfolio(project_id: str) -> dict[str, Any]:
    logger.info("portfolio start: project_id=%s", project_id)
    progress = build_project_paper_progress(project_id)
    papers = progress.get("papers", [])
    logger.info("papers loaded count: %s", len(papers))
    logger.info("progress loaded: average=%s", progress.get("average_progress", 0))
    activities = read_json_activities(project_id)[:8]
    logger.info("activities loaded count: %s", len(activities))
    portfolio_cards = []

    for paper in papers:
        paper_id = str(paper.get("paper_id", ""))
        acceptance_probability = read_reviewer_probability(project_id, paper_id)
        revision_status = "applied" if paper.get("revision_applied") else "pending"
        submission_readiness = "ready" if paper.get("submission_ready") else "not_ready"
        reviewer_readiness = "completed" if paper.get("reviewer_completed") else "pending"
        portfolio_cards.append(
            {
                **paper,
                "reviewer_readiness": reviewer_readiness,
                "submission_readiness": submission_readiness,
                "revision_status": revision_status,
                "acceptance_probability": acceptance_probability,
            }
        )

    ready_count = sum(1 for paper in portfolio_cards if paper["submission_readiness"] == "ready")
    reviewed_count = sum(1 for paper in portfolio_cards if paper["reviewer_readiness"] == "completed")
    average_acceptance = round(
        sum(int(paper["acceptance_probability"]) for paper in portfolio_cards) / len(portfolio_cards)
    ) if portfolio_cards else 0

    portfolio = {
        "project_id": project_id,
        "portfolio_summary": {
            "total_papers": progress.get("total_papers", 0),
            "active_papers": progress.get("active_papers", 0),
            "submission_ready": ready_count,
            "reviewed_papers": reviewed_count,
            "average_completion": progress.get("average_progress", 0),
            "average_acceptance_probability": average_acceptance,
        },
        "paper_portfolio_cards": portfolio_cards,
        "readiness_distribution": build_readiness_distribution(portfolio_cards),
        "average_completion": progress.get("average_progress", 0),
        "publication_pipeline_overview": build_pipeline_overview(portfolio_cards),
        "latest_activity": activities[:8],
        "submission_ready_highlights": [
            paper for paper in portfolio_cards if paper["submission_readiness"] == "ready"
        ],
        "status": "loaded",
    }
    logger.info("portfolio complete: project_id=%s cards=%s", project_id, len(portfolio_cards))
    return portfolio
