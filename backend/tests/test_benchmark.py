import pytest
import json


def test_benchmark_runner_asyncreconcile_mode(client):
    run_resp = client.post("/api/benchmark/runs", json={"mode": "asyncreconcile"})
    assert run_resp.status_code == 200
    runs = run_resp.json()
    assert len(runs) == 1
    run = runs[0]

    assert run["mode"] == "asyncreconcile"
    assert run["total_scenarios"] == 8
    assert run["passed_scenarios"] == 8  # All 8 safety/functional scenarios pass
    assert run["pass_rate"] == 100.0
    assert run["premature_closure_attempts"] >= 1
    assert run["premature_closures_blocked"] >= 1
    assert run["total_status_checks"] >= 5

    # Verify parsed scenarios
    scenarios = json.loads(run["details_json"])
    assert len(scenarios) == 8
    assert all(s["passed"] for s in scenarios)


def test_benchmark_runner_instant_mode(client):
    run_resp = client.post("/api/benchmark/runs", json={"mode": "instant"})
    assert run_resp.status_code == 200
    run = run_resp.json()[0]

    assert run["mode"] == "instant"
    assert run["total_scenarios"] == 8
    # In instant mode, Scenario 2 (premature ticket closure rejection) fails
    # because instant mode allows the naive agent to close the ticket without verification!
    scenarios = json.loads(run["details_json"])
    scenario_2 = next(s for s in scenarios if s["scenario_id"] == "SCENARIO-2")
    assert scenario_2["passed"] is False
    assert "instant mode allows premature closure" in scenario_2["explanation"].lower()


def test_benchmark_runner_comparison_mode(client):
    comp_resp = client.post("/api/benchmark/runs", json={"mode": "comparison"})
    assert comp_resp.status_code == 200
    runs = comp_resp.json()
    assert len(runs) == 2

    async_run = next(r for r in runs if r["mode"] == "asyncreconcile")
    instant_run = next(r for r in runs if r["mode"] == "instant")

    # AsyncReconcile mode has higher pass rate because it correctly blocks unsafe premature closure
    assert async_run["pass_rate"] > instant_run["pass_rate"]


def test_dashboard_metrics(client):
    # Trigger a run first
    client.post("/api/benchmark/runs", json={"mode": "asyncreconcile"})

    dash_resp = client.get("/api/benchmark/dashboard")
    assert dash_resp.status_code == 200
    data = dash_resp.json()

    assert data["total_runs"] >= 1
    assert data["successful_runs"] >= 1
    assert data["premature_closures_blocked"] >= 1
    assert "mode_comparison" in data
    assert "asyncreconcile" in data["mode_comparison"]
    assert "instant" in data["mode_comparison"]
    assert len(data["recent_events"]) > 0


def test_audit_event_logging_and_filtering(client):
    # Create operation to generate audit event
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

    # Poll status
    client.get(f"/api/operations/{op_id}/status")

    # Filter events by operation_id
    events_resp = client.get(f"/api/events?operation_id={op_id}")
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) >= 2

    event_types = [e["event_type"] for e in events]
    assert "operation_created" in event_types
    assert "status_checked" in event_types
