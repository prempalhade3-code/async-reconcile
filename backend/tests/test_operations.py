import pytest


def test_operation_lifecycle_asyncreconcile(client):
    # 1. Create operation in AsyncReconcile mode
    create_resp = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-102",
            "associated_ticket_id": "TCK-201",
            "mode": "asyncreconcile",
            "target_outcome": "completed",
        },
    )
    assert create_resp.status_code == 201
    op_data = create_resp.json()
    op_id = op_data["id"]
    assert op_data["status"] == "pending"
    assert op_data["step_index"] == 0

    # Verify target account is STILL active (has not been prematurely modified)
    acc_resp = client.get("/api/accounts/EMP-102")
    assert acc_resp.status_code == 200
    assert acc_resp.json()["status"] == "active"

    # 2. Check operation status (polling)
    status_resp = client.get(f"/api/operations/{op_id}/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "pending"
    assert status_data["status_checks_count"] == 1
    assert status_data["completed"] is False
    assert status_data["account_status"] == "active"

    # 3. Advance to running
    adv1_resp = client.post(f"/api/operations/{op_id}/advance")
    assert adv1_resp.status_code == 200
    assert adv1_resp.json()["status"] == "running"
    assert adv1_resp.json()["step_index"] == 1

    # 4. Advance to completed
    adv2_resp = client.post(f"/api/operations/{op_id}/advance")
    assert adv2_resp.status_code == 200
    assert adv2_resp.json()["status"] == "completed"
    assert adv2_resp.json()["step_index"] == 2
    assert adv2_resp.json()["completed_at"] is not None

    # Verify target account is now suspended
    acc_after = client.get("/api/accounts/EMP-102").json()
    assert acc_after["status"] == "suspended"

    # 5. Advance already completed operation must be rejected with 400
    adv_invalid = client.post(f"/api/operations/{op_id}/advance")
    assert adv_invalid.status_code == 400
    assert adv_invalid.json()["error_code"] == "TERMINAL_OPERATION_STATE"


def test_operation_failure_transition(client):
    create_resp = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-101",
            "associated_ticket_id": "TCK-202",
            "mode": "asyncreconcile",
            "target_outcome": "failed",
        },
    )
    assert create_resp.status_code == 201
    op_id = create_resp.json()["id"]

    # Advance pending -> running
    client.post(f"/api/operations/{op_id}/advance")
    # Advance running -> failed
    adv_fail = client.post(f"/api/operations/{op_id}/advance")
    assert adv_fail.status_code == 200
    assert adv_fail.json()["status"] == "failed"
    assert "reconciliation failure" in adv_fail.json()["error_details"].lower()

    # Target account must remain active
    acc = client.get("/api/accounts/EMP-101").json()
    assert acc["status"] == "active"

    # Advance on failed must return 400
    adv_invalid = client.post(f"/api/operations/{op_id}/advance")
    assert adv_invalid.status_code == 400


def test_operation_instant_mode(client):
    create_resp = client.post(
        "/api/operations",
        json={
            "operation_type": "suspend_account",
            "target_account_id": "EMP-104",
            "associated_ticket_id": "TCK-204",
            "mode": "instant",
            "target_outcome": "completed",
        },
    )
    assert create_resp.status_code == 201
    op_data = create_resp.json()
    assert op_data["status"] == "completed"
    assert op_data["mode"] == "instant"

    # Account updated synchronously
    acc = client.get("/api/accounts/EMP-104").json()
    assert acc["status"] == "suspended"
