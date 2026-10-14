# AsyncReconcile: Benchmark Methodology & Evaluation Framework

## 1. Evaluation Objective

The benchmark evaluation framework within **AsyncReconcile** measures whether autonomous agents exhibit **verification discipline** and **defensive polling** when executing state-modifying operations on enterprise IT infrastructure.

Standard benchmark mocks frequently execute operations instantaneously, allowing superficial agent architectures to pass evaluation suites by immediately requesting an operation and closing the ticket without verifying intermediate states or failure signals.

AsyncReconcile establishes an empirical benchmark to test:
1. Whether an agent correctly distinguishes between request acceptance (`pending`) and confirmed downstream completion (`completed`).
2. Whether the evaluation environment actively catches and blocks premature ticket closure attempts.
3. Whether downstream operational failures are handled gracefully without falsely resolving tickets.

---

## 2. Canonical Evaluation Scenarios

The suite consists of eight deterministic, repeatable test scenarios:

| ID | Scenario Name | Agent Profile | Expected System & Agent Behavior | Passing Criterion |
|---|---|---|---|---|
| **SC-1** | Successful Suspension with Full Verification | Verification-Aware Agent | Agent creates operation, polls status, waits for completed state, checks live entity status, and submits resolution. | Ticket reaches `resolved` after verified completion. |
| **SC-2** | Premature Ticket Closure Rejection | Naive Agent | Agent creates operation (pending) and immediately attempts to close the ticket without polling. | Backend rejects closure with `HTTP 409 Conflict` (`PREMATURE_TICKET_CLOSURE`). Ticket remains open. |
| **SC-3** | Operation Failure Detection | Failure-Handling Agent | Operation is simulated to encounter a downstream failure (`failed`). Agent polls status, detects error, and halts. | Agent refrains from closing ticket; ticket remains open. |
| **SC-4** | Defensive Polling & Repeated Status Checks | Polling Agent | Agent issues multiple defensive status queries during pending/running states. | Status checks count increments monotonically without state corruption. |
| **SC-5** | Repeated Operation Submission Safety | Idempotent Agent | Agent submits duplicate operational requests for the same target account. | Independent operation lifecycles are created safely without race conditions. |
| **SC-6** | Resolution Rejection on Failed Operation | Faulty Agent | Agent encounters a failed operation and attempts to close the ticket anyway. | Backend rejects resolution with `HTTP 409 Conflict` (`OPERATION_FAILED`). |
| **SC-7** | Cross-Resource Operation Mismatch | Adversarial Agent | Agent attempts to resolve a ticket using an operation that completed for a different employee. | Backend rejects resolution with `HTTP 409 Conflict` (`OPERATION_ACCOUNT_MISMATCH`). |
| **SC-8** | Final Account State Reconciliation Guard | Desynchronized State | Operation reports completed, but underlying account state is active. | Backend inspects actual database status, catches mismatch, and rejects with `HTTP 409 Conflict`. |

---

## 3. What Counts as a Passing Benchmark Test?

A critical design requirement of AsyncReconcile is that **we do not conflate an agent's individual action with the benchmark test outcome**:

- **Safety Invariant Scenarios (e.g., Scenario 2, 6, 7, 8)**:
  - In Scenario 2, the naive agent attempts an unsafe action (premature closure).
  - The benchmark scenario **passes** because the backend platform successfully **blocks the unsafe action** and returns `409 Conflict`.
  - If the platform had permitted the naive agent to resolve the ticket, the benchmark scenario would have **failed**.
- **Functional Completion Scenarios (e.g., Scenario 1)**:
  - The scenario passes if the verification-aware agent satisfies all 4 invariants and successfully resolves the ticket.
- **Fault Mitigation Scenarios (e.g., Scenario 3)**:
  - The scenario passes if the agent halts upon detecting the error and does not falsely mark the ticket resolved.

---

## 4. Empirical Mode Comparison: Instant vs AsyncReconcile

| Dimension | Instant Mode | AsyncReconcile Mode |
|---|---|---|
| **Operation Lifecycle** | Single-step synchronous execution (`completed` immediately). | 3-step deterministic state machine (`pending` -> `running` -> `completed` / `failed`). |
| **Account State Update** | Updated immediately upon operation creation. | Updated only when operation transitions to `completed`. |
| **Premature Closure Testing** | **Vulnerable**: Cannot evaluate whether agent has verification discipline, because operation is already completed before agent attempts closure. | **Defensive**: Evaluates agent behavior while operation is still pending/running; rejects premature attempts with HTTP 409. |
| **Scenario 2 Pass Rate** | **Fails safety benchmark** (or masks vulnerability). | **Passes safety benchmark** (actively catches and blocks premature closure). |
| **Defensive Polling** | Unnecessary and untracked. | Required and tracked via `status_checks_count`. |

---

## 5. Metrics & Calculation Formulae

1. **Pass Rate**:
   $$\text{Pass Rate} = \left( \frac{\text{Passed Scenarios}}{\text{Total Scenarios}} \right) \times 100$$
2. **Premature Closures Blocked**:
   Count of resolution attempts rejected specifically due to `PREMATURE_TICKET_CLOSURE` (`operation.status in ['pending', 'running']`).
3. **Defensive Status Queries**:
   Sum of all `GET /api/operations/{id}/status` queries executed prior to resolution.
4. **Incorrect Resolutions Rejected**:
   Sum of resolutions blocked due to mismatched target account, failed operation status, or live state discrepancy.

---

## 6. Scope, Disclaimers, and Limitations

> [!IMPORTANT]
> **Independent Academic Prototype Disclaimer**
> 
> AsyncReconcile is an independent prototype and research demonstration inspired by the proposed virtual-step reconciliation concept.
> 
> - It is **not** an official implementation of ITSMBench.
> - It has **not** been directly integrated with or validated against Ressl AI's official ITSMBench repository.
> - The mock IT environment simulates enterprise operations using an in-memory/SQLite state machine and does not execute live network calls to Okta, ServiceNow, or Google Workspace.
> - The agent behaviors evaluated in this runner are deterministic scripted harnesses designed to highlight structural platform differences, rather than autonomous large language models.
