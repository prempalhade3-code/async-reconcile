import pytest


def test_premature_resolution_blocked_when_operation_pending(client):
    # 1. Create operation in AsyncReconcile mode (status = pending)
    create_op = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-102",
            "associated_ticket_id": "TCK-201",
            "mode": "asyncreconcile",
        },
    )
    op_id = create_op.json()["id"]

    # Pre-flight check should indicate blocked
    check_resp = client.get("/api/tickets/TCK-201/resolvability")
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["allowed"] is False
    assert "pending" in check_data["reason"].lower()

    # 2. Agent attempts premature resolution
    resolve_resp = client.post(
        "/api/tickets/TCK-201/resolve",
        json={"operation_id": op_id, "resolution_notes": "Attempting early closure"},
    )
    assert resolve_resp.status_code == 409
    err = resolve_resp.json()
    assert err["error_code"] == "PREMATURE_TICKET_CLOSURE"
    assert "pending" in err["message"].lower()

    # Verify ticket remained open
    tck = client.get("/api/tickets/TCK-201").json()
    assert tck["status"] == "open"


def test_premature_resolution_blocked_when_operation_running(client):
    create_op = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-102",
            "associated_ticket_id": "TCK-201",
            "mode": "asyncreconcile",
        },
    )
    op_id = create_op.json()["id"]

    # Advance to running
    client.post(f"/api/operations/{op_id}/advance")

    resolve_resp = client.post(
        "/api/tickets/TCK-201/resolve",
        json={"operation_id": op_id},
    )
    assert resolve_resp.status_code == 409
    assert resolve_resp.json()["error_code"] == "PREMATURE_TICKET_CLOSURE"


def test_resolution_blocked_on_operation_failure(client):
    create_op = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-102",
            "associated_ticket_id": "TCK-201",
            "mode": "asyncreconcile",
            "target_outcome": "failed",
        },
    )
    op_id = create_op.json()["id"]
    client.post(f"/api/operations/{op_id}/advance")  # pending -> running
    client.post(f"/api/operations/{op_id}/advance")  # running -> failed

    resolve_resp = client.post(
        "/api/tickets/TCK-201/resolve",
        json={"operation_id": op_id},
    )
    assert resolve_resp.status_code == 409
    assert resolve_resp.json()["error_code"] == "OPERATION_FAILED"


def test_resolution_blocked_on_mismatched_target_account(client):
    # Create operation for EMP-101
    create_op = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-101",
            "mode": "instant",
        },
    )
    op_id = create_op.json()["id"]

    # Attempt to resolve ticket TCK-201 (which targets EMP-102) using op for EMP-101
    resolve_resp = client.post(
        "/api/tickets/TCK-201/resolve",
        json={"operation_id": op_id},
    )
    assert resolve_resp.status_code == 409
    assert resolve_resp.json()["error_code"] == "OPERATION_ACCOUNT_MISMATCH"


def test_successful_verification_and_resolution(client):
    # 1. Create operation
    create_op = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-102",
            "associated_ticket_id": "TCK-201",
            "mode": "asyncreconcile",
        },
    )
    op_id = create_op.json()["id"]

    # 2. Advance to running then completed
    client.post(f"/api/operations/{op_id}/advance")
    client.post(f"/api/operations/{op_id}/advance")

    # 3. Check resolvability
    check_resp = client.get("/api/tickets/TCK-201/resolvability")
    assert check_resp.status_code == 200
    assert check_resp.json()["allowed"] is True

    # 4. Resolve ticket
    resolve_resp = client.post(
        "/api/tickets/TCK-201/resolve",
        json={
            "operation_id": op_id,
            "resolution_notes": "Deprovisioning confirmed complete and reconciled.",
        },
    )
    assert resolve_resp.status_code == 200
    tck_data = resolve_resp.json()
    assert tck_data["status"] == "resolved"
    assert tck_data["completed_at"] is not None

    # Attempting to resolve again returns 400
    resolve_again = client.post(
        "/api/tickets/TCK-201/resolve",
        json={"operation_id": op_id},
    )
    assert resolve_again.status_code == 400
