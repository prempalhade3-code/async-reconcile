from sqlalchemy.orm import Session
from app.models.entities import AccountModel, TicketModel, OperationModel, AuditEventModel, BenchmarkRunModel, utc_now
from app.database import Base, engine


DEMO_ACCOUNTS = [
    {
        "id": "EMP-101",
        "employee_id": "EMP-101",
        "name": "Elena Vance",
        "email": "elena.vance@blackmesa.internal",
        "department": "Research & Development",
        "role": "Principal Scientist",
        "status": "active",
    },
    {
        "id": "EMP-102",
        "employee_id": "EMP-102",
        "name": "Gordon Freeman",
        "email": "gordon.freeman@blackmesa.internal",
        "department": "Anomalous Materials",
        "role": "Research Associate",
        "status": "active",
    },
    {
        "id": "EMP-103",
        "employee_id": "EMP-103",
        "name": "Alyx Vance",
        "email": "alyx.vance@city17.internal",
        "department": "Infrastructure & Security",
        "role": "Systems Architect",
        "status": "active",
    },
    {
        "id": "EMP-104",
        "employee_id": "EMP-104",
        "name": "Barney Calhoun",
        "email": "barney.calhoun@blackmesa.internal",
        "department": "Physical Security",
        "role": "Security Operations Lead",
        "status": "active",
    },
    {
        "id": "EMP-105",
        "employee_id": "EMP-105",
        "name": "Judith Mossman",
        "email": "judith.mossman@borealis.internal",
        "department": "Executive Research",
        "role": "Director of Field Operations",
        "status": "suspended",
    },
]

DEMO_TICKETS = [
    {
        "id": "TCK-201",
        "title": "Emergency Legal Hold & Deprovisioning: Gordon Freeman",
        "description": (
            "URGENT: Legal hold freeze received from compliance. Immediately suspend all SSO, directory, "
            "and application access for Gordon Freeman (EMP-102). Verify directory confirmation before closing."
        ),
        "target_account_id": "EMP-102",
        "priority": "critical",
        "status": "open",
        "required_action": "suspend_account",
    },
    {
        "id": "TCK-202",
        "title": "Offboarding Deprovisioning: Elena Vance",
        "description": (
            "Standard employee separation ticket. Suspend account and archive mailboxes for Elena Vance (EMP-101). "
            "Requires confirmation from identity provider."
        ),
        "target_account_id": "EMP-101",
        "priority": "high",
        "status": "open",
        "required_action": "suspend_account",
    },
    {
        "id": "TCK-203",
        "title": "Security Incident Compromise Isolation: Alyx Vance",
        "description": (
            "SOC alert 9482 detected suspicious credential replay. Target account Alyx Vance (EMP-103) "
            "must be suspended immediately pending forensic review."
        ),
        "target_account_id": "EMP-103",
        "priority": "critical",
        "status": "in_progress",
        "required_action": "suspend_account",
    },
    {
        "id": "TCK-204",
        "title": "Routine Access Revocation: Barney Calhoun",
        "description": "Scheduled contract expiration. Deprovision directory credentials for Barney Calhoun (EMP-104).",
        "target_account_id": "EMP-104",
        "priority": "medium",
        "status": "open",
        "required_action": "suspend_account",
    },
    {
        "id": "TCK-205",
        "title": "Archived Separation Audit: Judith Mossman",
        "description": "Historical ticket verification for Judith Mossman (EMP-105). Account already suspended.",
        "target_account_id": "EMP-105",
        "priority": "low",
        "status": "resolved",
        "required_action": "suspend_account",
        "resolution_notes": "Historical deprovisioning confirmed. Account verified in suspended state.",
    },
]


def init_db():
    Base.metadata.create_all(bind=engine)


def seed_demo_data(db: Session, force_reset: bool = False):
    init_db()

    if force_reset:
        db.query(AuditEventModel).delete()
        db.query(BenchmarkRunModel).delete()
        db.query(OperationModel).delete()
        db.query(TicketModel).delete()
        db.query(AccountModel).delete()
        db.commit()

    # Seed accounts if empty
    existing_accs = db.query(AccountModel).count()
    if existing_accs == 0:
        for acc_data in DEMO_ACCOUNTS:
            acc = AccountModel(
                id=acc_data["id"],
                employee_id=acc_data["employee_id"],
                name=acc_data["name"],
                email=acc_data["email"],
                department=acc_data["department"],
                role=acc_data["role"],
                status=acc_data["status"],
                created_at=utc_now(),
                updated_at=utc_now(),
            )
            db.add(acc)
        db.commit()

    # Seed tickets if empty
    existing_tickets = db.query(TicketModel).count()
    if existing_tickets == 0:
        for t_data in DEMO_TICKETS:
            t = TicketModel(
                id=t_data["id"],
                title=t_data["title"],
                description=t_data["description"],
                target_account_id=t_data["target_account_id"],
                priority=t_data["priority"],
                status=t_data["status"],
                required_action=t_data["required_action"],
                resolution_notes=t_data.get("resolution_notes"),
                created_at=utc_now(),
                updated_at=utc_now(),
                completed_at=utc_now() if t_data["status"] == "resolved" else None,
            )
            db.add(t)
        db.commit()
