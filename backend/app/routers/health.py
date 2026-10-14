from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AsyncReconcile Engine",
        "environment": settings.ENVIRONMENT,
        "database": "sqlite_connected",
    }
