from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import AccountModel, utc_now
from app.schemas.entities import AccountRead, AccountCreate

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=List[AccountRead])
def list_accounts(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(AccountModel)
    if status_filter:
        query = query.filter(AccountModel.status == status_filter)
    return query.order_by(AccountModel.id).all()


@router.get("/{account_id}", response_model=AccountRead)
def get_account(account_id: str, db: Session = Depends(get_db)):
    account = db.query(AccountModel).filter(AccountModel.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "ACCOUNT_NOT_FOUND",
                "message": f"Account '{account_id}' was not found.",
                "resource_id": account_id,
            },
        )
    return account


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(account_in: AccountCreate, db: Session = Depends(get_db)):
    acc_id = account_in.id or f"EMP-{account_in.employee_id}"
    existing = db.query(AccountModel).filter(
        (AccountModel.id == acc_id) | (AccountModel.email == account_in.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error_code": "ACCOUNT_ALREADY_EXISTS",
                "message": f"Account with ID '{acc_id}' or email '{account_in.email}' already exists.",
                "resource_id": acc_id,
            },
        )

    account = AccountModel(
        id=acc_id,
        employee_id=account_in.employee_id,
        name=account_in.name,
        email=account_in.email,
        department=account_in.department,
        role=account_in.role,
        status=account_in.status,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
