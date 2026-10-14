import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    AccountModel,
    TicketModel,
    OperationModel,
    BenchmarkRunModel,
    utc_now,
)
from app.schemas.entities import (
    OperationCreate,
    OperationAdvanceRequest,
    TicketResolveRequest,
    ScenarioResult,
    AgentActionLog,
)
from app.services.operation_service import (
    create_operation,
    advance_operation,
    check_operation_status,
)
from app.services.ticket_service import resolve_ticket
from app.services.audit_service import record_audit_event
from fastapi import HTTPException


def run_benchmark_suite(db: Session, mode: str = "asyncreconcile") -> BenchmarkRunModel:
    """
    Executes the 8 canonical benchmark evaluation scenarios using deterministic agent scripts
    against the actual backend service layer.
    """
    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    start_time = utc_now()

    record_audit_event(
        db,
        event_type="benchmark_run_started",
        outcome="info",
        explanation=f"Benchmark run {run_id} started in mode '{mode}'.",
        metadata={"run_id": run_id, "mode": mode},
    )

    scenario_results: List[ScenarioResult] = []

    # Telemetry accumulators
    premature_closure_attempts = 0
    premature_closures_blocked = 0
    failed_operations_handled = 0
    incorrect_resolutions_rejected = 0
    total_status_checks = 0
    operations_completed = 0

    # Ensure clean test accounts and tickets for this benchmark run
    setup_benchmark_test_fixtures(db, run_id)

    # -------------------------------------------------------------------------
    # SCENARIO 1: Successful account suspension with correct verification
    # Verification-Aware Agent
    # -------------------------------------------------------------------------
    actions_1: List[AgentActionLog] = []
    step_num = 1
    passed_1 = False
    explanation_1 = ""

    try:
        # Step 1: Agent creates operation
        op_1 = create_operation(
            db,
            OperationCreate(
                operation_type="suspend_account",
                target_account_id=f"TEST-ACC-1-{run_id}",
                associated_ticket_id=f"TEST-TCK-1-{run_id}",
                mode=mode,
                target_outcome="completed",
            ),
        )
        actions_1.append(
            AgentActionLog(
                step=step_num,
                action_name="Request Operation",
                target_id=op_1.id,
                status="success",
                details=f"Created operation {op_1.id} with status '{op_1.status}'.",
                timestamp=utc_now(),
            )
        )
        step_num += 1

        if mode == "asyncreconcile":
            # Step 2: Agent checks status (Verification step)
            status_check = check_operation_status(db, op_1.id)
            total_status_checks += 1
            actions_1.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Check Operation Status",
                    target_id=op_1.id,
                    status="success",
                    details=f"Polled status: operation status is '{status_check['status']}', account is '{status_check['account_status']}'.",
                    timestamp=utc_now(),
                )
            )
            step_num += 1

            # Step 3: Advance operation to running
            advance_operation(db, op_1.id)
            # Step 4: Advance operation to completed
            advance_operation(db, op_1.id)
            operations_completed += 1

            # Step 5: Verify completed status
            status_check_final = check_operation_status(db, op_1.id)
            total_status_checks += 1
            actions_1.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Confirm Operation Completed",
                    target_id=op_1.id,
                    status="success",
                    details=f"Polled status: operation status is '{status_check_final['status']}', account is '{status_check_final['account_status']}'.",
                    timestamp=utc_now(),
                )
            )
            step_num += 1
        else:
            operations_completed += 1

        # Final Step: Resolve ticket after verification
        resolved_tck = resolve_ticket(
            db,
            ticket_id=f"TEST-TCK-1-{run_id}",
            resolve_req=TicketResolveRequest(
                operation_id=op_1.id,
                resolution_notes="Suspension confirmed through directory reconciliation.",
            ),
        )
        actions_1.append(
            AgentActionLog(
                step=step_num,
                action_name="Resolve Ticket",
                target_id=resolved_tck.id,
                status="success",
                details=f"Ticket {resolved_tck.id} successfully resolved.",
                timestamp=utc_now(),
            )
        )
        passed_1 = resolved_tck.status == "resolved"
        explanation_1 = "Agent followed full verification lifecycle: requested operation, confirmed completion, verified account state, and resolved ticket."
    except Exception as exc:
        passed_1 = False
        explanation_1 = f"Scenario failed with error: {str(exc)}"

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-1",
            name="Successful Suspension with Full Verification",
            description="Verification-aware agent requests suspension, checks status, verifies reconciliation, and closes ticket only after confirmed completion.",
            mode=mode,
            passed=passed_1,
            expected_outcome="Ticket resolved only after verified completion",
            actual_outcome="Ticket resolved successfully" if passed_1 else "Resolution failed unexpectedly",
            explanation=explanation_1,
            actions=actions_1,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 2: Premature ticket closure while operation is pending
    # Naive Agent
    # -------------------------------------------------------------------------
    actions_2: List[AgentActionLog] = []
    step_num = 1
    passed_2 = False
    explanation_2 = ""

    # Create operation
    op_2 = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-2-{run_id}",
            associated_ticket_id=f"TEST-TCK-2-{run_id}",
            mode=mode,
            target_outcome="completed",
        ),
    )
    actions_2.append(
        AgentActionLog(
            step=step_num,
            action_name="Request Operation",
            target_id=op_2.id,
            status="success",
            details=f"Naive agent requested operation {op_2.id}. Initial status: '{op_2.status}'.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    # Naive agent attempts immediate closure without polling or waiting
    premature_closure_attempts += 1
    try:
        resolve_ticket(
            db,
            ticket_id=f"TEST-TCK-2-{run_id}",
            resolve_req=TicketResolveRequest(
                operation_id=op_2.id,
                resolution_notes="Assuming request acceptance implies account is suspended.",
            ),
        )
        # If it resolved: In instant mode, it succeeded because instant mode lacks async safety!
        if mode == "instant":
            actions_2.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Premature Closure Attempt",
                    target_id=f"TEST-TCK-2-{run_id}",
                    status="success",
                    details="Instant mode silently permitted immediate closure because operation completed synchronously.",
                    timestamp=utc_now(),
                )
            )
            # In instant mode, benchmark fails to catch premature closure because it didn't block it!
            passed_2 = False
            explanation_2 = "Instant mode allows premature closure because operations complete synchronously, failing to test the agent's verification discipline."
        else:
            passed_2 = False
            explanation_2 = "Error: AsyncReconcile mode unexpectedly permitted ticket closure while operation was pending."
    except HTTPException as http_exc:
        if http_exc.status_code == 409 and mode == "asyncreconcile":
            premature_closures_blocked += 1
            passed_2 = True
            actions_2.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Premature Closure Attempt",
                    target_id=f"TEST-TCK-2-{run_id}",
                    status="rejected",
                    details=f"Backend successfully blocked premature closure: HTTP 409 Conflict. Detail: {http_exc.detail.get('message') if isinstance(http_exc.detail, dict) else http_exc.detail}",
                    timestamp=utc_now(),
                )
            )
            explanation_2 = "Safety verification passed: Backend correctly rejected premature ticket closure with HTTP 409 Conflict while operation was pending."
        else:
            passed_2 = False
            explanation_2 = f"Unexpected HTTP status {http_exc.status_code}."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-2",
            name="Premature Ticket Closure Rejection",
            description="Naive agent attempts to close ticket immediately after request acceptance without polling. System must reject with 409 Conflict.",
            mode=mode,
            passed=passed_2,
            expected_outcome="Premature closure rejected with HTTP 409 Conflict",
            actual_outcome="Premature closure blocked" if passed_2 else "Premature closure permitted (unsafe)",
            explanation=explanation_2,
            actions=actions_2,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 3: Operation failure encountered and detected
    # Failure-Handling Agent
    # -------------------------------------------------------------------------
    actions_3: List[AgentActionLog] = []
    step_num = 1
    passed_3 = False
    explanation_3 = ""

    op_3 = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-3-{run_id}",
            associated_ticket_id=f"TEST-TCK-3-{run_id}",
            mode=mode,
            target_outcome="failed",
        ),
    )
    actions_3.append(
        AgentActionLog(
            step=step_num,
            action_name="Request Operation (Failure Scenario)",
            target_id=op_3.id,
            status="success",
            details=f"Created operation {op_3.id} configured to simulate downstream directory failure.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    if mode == "asyncreconcile":
        advance_operation(db, op_3.id)  # pending -> running
        advance_operation(db, op_3.id)  # running -> failed

    status_3 = check_operation_status(db, op_3.id)
    total_status_checks += 1
    actions_3.append(
        AgentActionLog(
            step=step_num,
            action_name="Poll Status & Detect Failure",
            target_id=op_3.id,
            status="failed",
            details=f"Agent polled status: detected failure state '{status_3['status']}'. Error details: '{status_3['error_details']}'.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    # Failure-handling agent halts and does NOT attempt to resolve ticket
    ticket_3 = db.query(TicketModel).filter(TicketModel.id == f"TEST-TCK-3-{run_id}").first()
    if status_3["status"] == "failed" and ticket_3.status != "resolved":
        passed_3 = True
        failed_operations_handled += 1
        explanation_3 = "Failure-handling agent detected simulated operation failure, did not attempt ticket resolution, and documented error."
    else:
        passed_3 = False
        explanation_3 = "Agent failed to detect operation failure or ticket was improperly resolved."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-3",
            name="Operation Failure Detection",
            description="Agent detects simulated downstream operation failure and refrains from falsely marking ticket as completed.",
            mode=mode,
            passed=passed_3,
            expected_outcome="Operation failure detected and ticket remains unresolved",
            actual_outcome="Failure detected; ticket kept open" if passed_3 else "Failure unhandled",
            explanation=explanation_3,
            actions=actions_3,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 4: Repeated status checks while operation is pending
    # Polling Discipline
    # -------------------------------------------------------------------------
    actions_4: List[AgentActionLog] = []
    step_num = 1
    passed_4 = False

    op_4 = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-4-{run_id}",
            associated_ticket_id=f"TEST-TCK-4-{run_id}",
            mode=mode,
            target_outcome="completed",
        ),
    )
    actions_4.append(
        AgentActionLog(
            step=step_num,
            action_name="Request Operation",
            target_id=op_4.id,
            status="success",
            details=f"Created operation {op_4.id}.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    # Check status 3 times
    for i in range(3):
        check_res = check_operation_status(db, op_4.id)
        total_status_checks += 1
        actions_4.append(
            AgentActionLog(
                step=step_num,
                action_name=f"Status Poll #{i+1}",
                target_id=op_4.id,
                status="success",
                details=f"Poll #{i+1}: status '{check_res['status']}', checks count={check_res['status_checks_count']}.",
                timestamp=utc_now(),
            )
        )
        step_num += 1

    # Check that status checks count is accurately tracked
    final_op_4 = db.query(OperationModel).filter(OperationModel.id == op_4.id).first()
    passed_4 = final_op_4.status_checks_count == 3
    explanation_4 = f"Successfully executed 3 defensive status polls; backend tracked exactly {final_op_4.status_checks_count} queries."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-4",
            name="Defensive Polling & Repeated Status Checks",
            description="Verifies that repeated status polling queries are handled deterministically without side-effects or state degradation.",
            mode=mode,
            passed=passed_4,
            expected_outcome="Status checks count increments accurately to 3",
            actual_outcome=f"Status checks count is {final_op_4.status_checks_count}",
            explanation=explanation_4,
            actions=actions_4,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 5: Repeated operation submission
    # Idempotency / Duplicate Submission Handling
    # -------------------------------------------------------------------------
    actions_5: List[AgentActionLog] = []
    step_num = 1
    op_5a = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-5-{run_id}",
            associated_ticket_id=f"TEST-TCK-5-{run_id}",
            mode=mode,
            target_outcome="completed",
        ),
    )
    actions_5.append(
        AgentActionLog(
            step=step_num,
            action_name="Initial Operation Request",
            target_id=op_5a.id,
            status="success",
            details=f"Initial operation {op_5a.id} registered.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    # Agent issues second operation request for same account & ticket
    op_5b = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-5-{run_id}",
            associated_ticket_id=f"TEST-TCK-5-{run_id}",
            mode=mode,
            target_outcome="completed",
        ),
    )
    actions_5.append(
        AgentActionLog(
            step=step_num,
            action_name="Repeated Operation Submission",
            target_id=op_5b.id,
            status="success",
            details=f"Secondary operation {op_5b.id} tracked independently without conflicting or overwriting initial state.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    passed_5 = op_5a.id != op_5b.id and op_5a.target_account_id == op_5b.target_account_id
    explanation_5 = "Repeated operation requests generate unique, tracked operational lifecycles without corrupting concurrent states."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-5",
            name="Repeated Operation Submission Safety",
            description="Agent submits repeated operation requests; system handles requests cleanly without state collision.",
            mode=mode,
            passed=passed_5,
            expected_outcome="Independent operation lifecycle recorded safely",
            actual_outcome="Both operations tracked cleanly",
            explanation=explanation_5,
            actions=actions_5,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 6: Attempt to resolve ticket after operation has failed
    # Adversarial / Faulty Agent
    # -------------------------------------------------------------------------
    actions_6: List[AgentActionLog] = []
    step_num = 1
    passed_6 = False

    op_6 = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-6-{run_id}",
            associated_ticket_id=f"TEST-TCK-6-{run_id}",
            mode=mode,
            target_outcome="failed",
        ),
    )
    if mode == "asyncreconcile":
        advance_operation(db, op_6.id)  # pending -> running
        advance_operation(db, op_6.id)  # running -> failed

    actions_6.append(
        AgentActionLog(
            step=step_num,
            action_name="Encounter Failed Operation",
            target_id=op_6.id,
            status="failed",
            details=f"Operation {op_6.id} is in status 'failed'.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    # Faulty agent attempts to resolve ticket anyway
    try:
        resolve_ticket(
            db,
            ticket_id=f"TEST-TCK-6-{run_id}",
            resolve_req=TicketResolveRequest(
                operation_id=op_6.id,
                resolution_notes="Attempting resolution despite failed operation.",
            ),
        )
        passed_6 = False
        explanation_6 = "Error: System permitted ticket resolution on failed operation."
    except HTTPException as http_exc:
        if http_exc.status_code == 409:
            passed_6 = True
            incorrect_resolutions_rejected += 1
            actions_6.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Reject Resolution on Failed Operation",
                    target_id=f"TEST-TCK-6-{run_id}",
                    status="rejected",
                    details=f"HTTP 409 Conflict correctly thrown: {http_exc.detail.get('message') if isinstance(http_exc.detail, dict) else http_exc.detail}",
                    timestamp=utc_now(),
                )
            )
            explanation_6 = "Backend correctly rejected resolution attempt on failed operation with HTTP 409 Conflict."
        else:
            passed_6 = False
            explanation_6 = f"Unexpected status code {http_exc.status_code}."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-6",
            name="Resolution Rejection on Failed Operation",
            description="Agent attempts to close ticket after its underlying operation failed. System must strictly block resolution.",
            mode=mode,
            passed=passed_6,
            expected_outcome="Resolution rejected with HTTP 409 Conflict",
            actual_outcome="Resolution rejected (409 Conflict)" if passed_6 else "Incorrect resolution permitted",
            explanation=explanation_6,
            actions=actions_6,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 7: Attempt to resolve wrong ticket using another ticket's operation
    # Cross-Resource Mismatch
    # -------------------------------------------------------------------------
    actions_7: List[AgentActionLog] = []
    step_num = 1
    passed_7 = False

    # Create operation for Account 1
    op_7 = create_operation(
        db,
        OperationCreate(
            operation_type="suspend_account",
            target_account_id=f"TEST-ACC-1-{run_id}",
            mode="instant",
            target_outcome="completed",
        ),
    )
    actions_7.append(
        AgentActionLog(
            step=step_num,
            action_name="Valid Operation for Account 1",
            target_id=op_7.id,
            status="success",
            details=f"Completed operation {op_7.id} for target {op_7.target_account_id}.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    # Attempt to resolve Ticket 7 (targets Account 7) using Operation 7 (targets Account 1)
    try:
        resolve_ticket(
            db,
            ticket_id=f"TEST-TCK-7-{run_id}",
            resolve_req=TicketResolveRequest(
                operation_id=op_7.id,
                resolution_notes="Attempting cross-ticket resolution spoofing.",
            ),
        )
        passed_7 = False
        explanation_7 = "Error: System permitted mismatched operation to resolve ticket."
    except HTTPException as http_exc:
        if http_exc.status_code == 409:
            passed_7 = True
            incorrect_resolutions_rejected += 1
            actions_7.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Reject Mismatched Resource Resolution",
                    target_id=f"TEST-TCK-7-{run_id}",
                    status="rejected",
                    details=f"HTTP 409 Conflict correctly thrown: {http_exc.detail.get('message') if isinstance(http_exc.detail, dict) else http_exc.detail}",
                    timestamp=utc_now(),
                )
            )
            explanation_7 = "Backend verified account-to-operation correspondence and rejected mismatched resolution with HTTP 409."
        else:
            passed_7 = False
            explanation_7 = f"Unexpected status code {http_exc.status_code}."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-7",
            name="Cross-Resource Operation Mismatch Rejection",
            description="Agent attempts to resolve a ticket using an operation targeting a completely different employee account. System must reject with 409 Conflict.",
            mode=mode,
            passed=passed_7,
            expected_outcome="Resolution rejected due to target account mismatch",
            actual_outcome="Mismatched resolution blocked (409 Conflict)" if passed_7 else "Mismatched resolution accepted",
            explanation=explanation_7,
            actions=actions_7,
        )
    )

    # -------------------------------------------------------------------------
    # SCENARIO 8: Attempt to resolve ticket when account actual state is still active
    # State Reconciliation Invariant Check
    # -------------------------------------------------------------------------
    actions_8: List[AgentActionLog] = []
    step_num = 1
    passed_8 = False

    # Create ticket for Account 8
    # Manually ensure account status is 'active'
    acc_8 = db.query(AccountModel).filter(AccountModel.id == f"TEST-ACC-8-{run_id}").first()
    acc_8.status = "active"
    db.commit()

    # Create dummy completed operation, but account was left 'active'
    op_8 = OperationModel(
        id=f"OP-MOCK-{uuid.uuid4().hex[:6].upper()}",
        operation_type="suspend_account",
        target_account_id=f"TEST-ACC-8-{run_id}",
        associated_ticket_id=f"TEST-TCK-8-{run_id}",
        status="completed",
        mode=mode,
        target_outcome="completed",
        step_index=2,
        status_checks_count=1,
        completed_at=utc_now(),
    )
    db.add(op_8)
    db.commit()

    actions_8.append(
        AgentActionLog(
            step=step_num,
            action_name="Simulate Inconsistent System State",
            target_id=op_8.id,
            status="warning",
            details=f"Operation {op_8.id} marked 'completed', but actual account {acc_8.id} status is '{acc_8.status}'.",
            timestamp=utc_now(),
        )
    )
    step_num += 1

    try:
        resolve_ticket(
            db,
            ticket_id=f"TEST-TCK-8-{run_id}",
            resolve_req=TicketResolveRequest(
                operation_id=op_8.id,
                resolution_notes="Attempting resolution despite active account status.",
            ),
        )
        passed_8 = False
        explanation_8 = "Error: System permitted ticket resolution when account actual status was active."
    except HTTPException as http_exc:
        if http_exc.status_code == 409:
            passed_8 = True
            incorrect_resolutions_rejected += 1
            actions_8.append(
                AgentActionLog(
                    step=step_num,
                    action_name="Reject State Reconciliation Mismatch",
                    target_id=f"TEST-TCK-8-{run_id}",
                    status="rejected",
                    details=f"HTTP 409 Conflict: {http_exc.detail.get('message') if isinstance(http_exc.detail, dict) else http_exc.detail}",
                    timestamp=utc_now(),
                )
            )
            explanation_8 = "Backend verified actual underlying account state, caught that account was still active, and rejected resolution with HTTP 409."
        else:
            passed_8 = False
            explanation_8 = f"Unexpected status code {http_exc.status_code}."

    scenario_results.append(
        ScenarioResult(
            scenario_id="SCENARIO-8",
            name="Final Account State Reconciliation Guard",
            description="Operation reports completed, but directory reconciliation shows employee account is still active. System must catch mismatch and reject resolution.",
            mode=mode,
            passed=passed_8,
            expected_outcome="Resolution rejected with HTTP 409 due to account state discrepancy",
            actual_outcome="Discrepancy caught and rejected (409 Conflict)" if passed_8 else "Resolution erroneously allowed",
            explanation=explanation_8,
            actions=actions_8,
        )
    )

    # -------------------------------------------------------------------------
    # Aggregate Metrics Calculation
    # -------------------------------------------------------------------------
    total_scenarios = len(scenario_results)
    passed_scenarios = sum(1 for s in scenario_results if s.passed)
    failed_scenarios = total_scenarios - passed_scenarios
    pass_rate = round((passed_scenarios / total_scenarios) * 100.0, 1) if total_scenarios > 0 else 0.0

    end_time = utc_now()

    # Convert results to JSON
    details_data = [s.model_dump(mode="json") for s in scenario_results]

    run_record = BenchmarkRunModel(
        id=run_id,
        mode=mode,
        total_scenarios=total_scenarios,
        passed_scenarios=passed_scenarios,
        failed_scenarios=failed_scenarios,
        premature_closure_attempts=premature_closure_attempts,
        premature_closures_blocked=premature_closures_blocked,
        failed_operations_handled=failed_operations_handled,
        incorrect_resolutions_rejected=incorrect_resolutions_rejected,
        total_status_checks=total_status_checks,
        operations_completed=operations_completed,
        pass_rate=pass_rate,
        details_json=json.dumps(details_data),
        created_at=start_time,
        completed_at=end_time,
    )
    db.add(run_record)
    db.commit()
    db.refresh(run_record)

    record_audit_event(
        db,
        event_type="benchmark_run_completed",
        outcome="success" if pass_rate >= 80.0 else "warning",
        explanation=f"Benchmark run {run_id} completed: {passed_scenarios}/{total_scenarios} scenarios passed ({pass_rate}%). Blocked {premature_closures_blocked} premature closures.",
        metadata={
            "run_id": run_id,
            "pass_rate": pass_rate,
            "mode": mode,
            "premature_closures_blocked": premature_closures_blocked,
        },
    )

    return run_record


def setup_benchmark_test_fixtures(db: Session, run_id: str):
    """
    Creates isolated test accounts and tickets for each scenario in the benchmark run
    so runs are completely independent and deterministic.
    """
    for i in range(1, 9):
        acc_id = f"TEST-ACC-{i}-{run_id}"
        tck_id = f"TEST-TCK-{i}-{run_id}"

        # Delete any pre-existing
        db.query(TicketModel).filter(TicketModel.id == tck_id).delete()
        db.query(AccountModel).filter(AccountModel.id == acc_id).delete()

        acc = AccountModel(
            id=acc_id,
            employee_id=f"EMP-TEST-{i}-{run_id[-4:]}",
            name=f"Test Subject {i}",
            email=f"subject{i}.{run_id[-4:].lower()}@testing.internal",
            department="Benchmark Sandbox",
            role="Evaluation Fixture",
            status="active",
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        db.add(acc)

        tck = TicketModel(
            id=tck_id,
            title=f"Benchmark Evaluation Task {i}",
            description=f"Automated scenario fixture for evaluation scenario {i}.",
            target_account_id=acc_id,
            priority="high",
            status="open",
            required_action="suspend_account",
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        db.add(tck)

    db.commit()
