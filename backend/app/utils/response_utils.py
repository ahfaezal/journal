from typing import Any


def api_response(
    data: Any,
    status: str = "success",
    message: str = "OK",
    success: bool = True,
) -> dict[str, Any]:
    return {
        "success": success,
        "status": status,
        "message": message,
        "data": data,
    }


def is_standard_response(data: Any) -> bool:
    return (
        isinstance(data, dict)
        and {"success", "status", "message", "data"}.issubset(data.keys())
    )
