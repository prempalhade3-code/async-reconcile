from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.entities import (
    BenchmarkRunModel,
    AuditEventModel,
    OperationModel,
    TicketModel,
)
from app.schemas.entities import (
    BenchmarkRunRead,
    BenchmarkRunRequest,
    DashboardSummary,
    AuditEventRead,
)
from app.services.benchmark_service import run_benchmark_suite
from app.services.seed import seed_demo_data

router = APIRouter(prefix="/benchmark", tags=["Benchmark"])


@router.post("/runs", response_model=List[BenchmarkRunRead])
def trigger_benchmark_run(
    req: BenchmarkRunRequest,
    db: Session = Depends(get_db),
):
    """
    Triggers an automated benchmark evaluation run.
    If mode is 'comparison', runs both 'instant' and 'asyncreconcile' modes sequentially
    to enable a direct empirical comparison.
    """
    if req.mode == "comparison":
        run_instant = run_benchmark_suite(db, mode="instant")
        run_async = run_benchmark_suite(db, mode="asyncreconcile")
        return [run_async, run_instant]
    elif req.mode in ("asyncreconcile", "instant"):
        run = run_benchmark_suite(db, mode=req.mode)
        return [run]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_BENCHMARK_MODE",
                "message": f"Mode '{req.mode}' is invalid. Choose 'asyncreconcile', 'instant', or 'comparison'.",
            },
        )


@router.get("/runs", response_model=List[BenchmarkRunRead])
def list_benchmark_runs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return db.query(BenchmarkRunModel).order_by(BenchmarkRunModel.created_at.desc()).limit(limit).all()


@router.get("/runs/{run_id}", response_model=BenchmarkRunRead)
def get_benchmark_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(BenchmarkRunModel).filter(BenchmarkRunModel.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "RUN_NOT_FOUND",
                "message": f"Benchmark run '{run_id}' not found.",
                "resource_id": run_id,
            },
        )
    return run


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Calculates live dashboard metrics from real persistent database records.
    Never hardcoded.
    """
    runs = db.query(BenchmarkRunModel).all()
    total_runs = len(runs)
    successful_runs = sum(1 for r in runs if r.pass_rate >= 80.0)
    failed_runs = total_runs - successful_runs

    premature_closure_attempts = sum(r.premature_closure_attempts for r in runs)
    premature_closures_blocked = sum(r.premature_closures_blocked for r in runs)

    pending_or_running_ops = db.query(OperationModel).filter(
        OperationModel.status.in_(["pending", "running"])
    ).count()

    failed_ops = db.query(OperationModel).filter(OperationModel.status == "failed").count()
    total_ops = db.query(OperationModel).count()
    total_tickets = db.query(TicketModel).count()

    # Compare aggregated stats across modes
    async_runs = [r for r in runs if r.mode == "asyncreconcile"]
    instant_runs = [r for r in runs if r.mode == "instant"]

    def calc_mode_stats(run_list):
        if not run_list:
            return {
                "count": 0,
                "avg_pass_rate": 0.0,
                "premature_closures_blocked": 0,
                "premature_closure_attempts": 0,
                "total_status_checks": 0,
            }
        return {
            "count": len(run_list),
            "avg_pass_rate": round(sum(r.pass_rate for r in run_list) / len(run_list), 1),
            "premature_closures_blocked": sum(r.premature_closures_blocked for r in run_list),
            "premature_closure_attempts": sum(r.premature_closure_attempts for r in run_list),
            "total_status_checks": sum(r.total_status_checks for r in run_list),
        }

    mode_comparison = {
        "asyncreconcile": calc_mode_stats(async_runs),
        "instant": calc_mode_stats(instant_runs),
    }

    recent_events_records = (
        db.query(AuditEventModel)
        .order_by(AuditEventModel.created_at.desc(), AuditEventModel.sequence_number.desc())
        .limit(10)
        .all()
    )

    latest_run = (
        db.query(BenchmarkRunModel)
        .order_by(BenchmarkRunModel.created_at.desc())
        .first()
    )

    return DashboardSummary(
        total_runs=total_runs,
        successful_runs=successful_runs,
        failed_runs=failed_runs,
        premature_closure_attempts=premature_closure_attempts,
        premature_closures_blocked=premature_closures_blocked,
        pending_or_running_operations=pending_or_running_ops,
        failed_operations=failed_ops,
        total_operations=total_ops,
        total_tickets=total_tickets,
        mode_comparison=mode_comparison,
        recent_events=recent_events_records,
        latest_run=latest_run,
    )


@router.post("/reset-demo")
def reset_demo_state(db: Session = Depends(get_db)):
    """
    Reseeds the demo accounts and tickets for clean demonstrations.
    """
    seed_demo_data(db, force_reset=True)
    return {"message": "Demo data successfully reset to clean initial state."}
