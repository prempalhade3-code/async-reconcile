from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.seed import seed_demo_data
from app.routers import health, accounts, tickets, operations, events, benchmark


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed initial demo accounts and tickets if not already present
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AsyncReconcile API",
    description="Evaluation platform for asynchronous enterprise IT operations and completion verification in AI-agent workflows.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": "HTTP_ERROR", "message": str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "The request body or parameters failed validation.",
            "details": exc.errors(),
        },
    )


# Attach routers under /api
api_prefix = "/api"
app.include_router(health.router, prefix=api_prefix)
app.include_router(accounts.router, prefix=api_prefix)
app.include_router(tickets.router, prefix=api_prefix)
app.include_router(operations.router, prefix=api_prefix)
app.include_router(events.router, prefix=api_prefix)
app.include_router(benchmark.router, prefix=api_prefix)


@app.get("/")
def root():
    return {
        "name": "AsyncReconcile Engine",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
    }
