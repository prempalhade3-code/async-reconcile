# asyncreconcile

an empirical testbed and reference implementation for asynchronous it operations and completion verification in ai workflows.

---

## the problem: why "accepted" is not "completed"

in real enterprise it systems—like okta, google workspace, active directory, or servicenow—operations like offboarding an employee, suspending access, or setting a legal hold never finish instantly.

when you send a deprovisioning request, the identity provider typically returns an immediate `202 accepted`. that just means your request reached the queue. the actual state transition happens asynchronously in the background. it might take seconds or minutes, get stuck in rate-limiting, or fail entirely if an upstream directory encounters a conflict.

most ai benchmark environments and mock tools ignore this reality. they execute every operation synchronously and immediately.

because of this, an ai agent can easily fall into a dangerous trap:
1. it requests account deprovisioning.
2. the mock immediately says "ok".
3. the agent closes the high-priority security ticket and reports the account suspended.

if you run that same agent in a real company, it will mark offboarding tickets "resolved" while the former employee's corporate email and vpn remain wide open.

---

## why we built asyncreconcile

we built asyncreconcile to expose and fix this exact gap.

our guiding rule is simple:

> **accepting an operation request does not mean the operation has finished.**  
> **a ticket must never be resolved until the background operation reaches a terminal state and the actual entity state in the directory has been verified.**

to demonstrate the difference, asyncreconcile includes two execution modes:

- **instant mode (the naive baseline)**: operations complete in a single synchronous step. this mimics traditional benchmark mocks and shows why naive agents look like they succeed when they are actually cutting corners.
- **asyncreconcile mode (the realistic state machine)**: operations transition through explicit lifecycle stages: `pending` &rarr; `running` &rarr; `completed` (or `failed`). if an agent or technician attempts to resolve a ticket while an operation is still in flight, the backend strictly rejects the request with an **http 409 conflict** error.

---

## how it works

```text
[ ticket created ] 
       │
       ▼
[ dispatch operation ] ──( status: pending )───► [ downstream directory untouched ]
       │                                                 │
       ▼                                                 │  (premature resolve attempt)
[ worker syncs state ] ──( status: running )             │  └──► rejected: HTTP 409 CONFLICT
       │                                                 │       safety invariant breached
       ▼                                                 │
[ state reconciled ]   ──( status: completed )───────────┘
       │
       ▼
[ pre-flight verification gate ]
       ├── 1. operation exists? (yes)
       ├── 2. target account matches? (yes)
       ├── 3. operation reached terminal? (yes)
       └── 4. live directory status matches requirement? (yes)
       │
       ▼
[ ticket safely resolved & verified ]
```

### 1. the 4-state asynchronous engine
operations progress through four distinct states:
- `pending`: accepted into the broker queue; downstream account state is untouched.
- `running`: sync worker is actively processing; status queries increment the defensive polling counter.
- `completed`: downstream directory state has officially reconciled to target (e.g. `suspended`).
- `failed`: simulated upstream directory error; ticket resolution remains blocked to prevent false closures.

### 2. the 4-seal pre-flight completion gate
before any ticket can be marked `resolved`, the backend executes four strict invariant checks:
1. **operation exists**: an operation was actually initiated for this ticket.
2. **account match**: the operation target account exactly matches the ticket's target account.
3. **operation completed**: the state machine is in `completed` status (not `pending` or `running`).
4. **directory verified**: the live account status in the database matches the requested state.

if any invariant fails, resolution is refused with an informative `http 409 conflict` payload detailing what state is missing and what reconciliation step must happen first.

### 3. the agent simulator & benchmark studio
we include a built-in evaluation suite that runs three scripted agent behaviors across 8 enterprise scenarios:
- **naive agent**: attempts to resolve tickets immediately after requesting operations without waiting or checking status.
- **verification-aware agent**: polls status, awaits terminal state completion, and verifies live directory state before attempting resolution.
- **failure-handling agent**: recognizes when an operation has failed, avoids closing tickets prematurely, and escalates appropriately.

---

## tech stack

### backend
- **language & runtime**: python 3.13
- **api framework**: fastapi with pydantic v2
- **database**: sqlite with sqlalchemy orm
- **testing**: pytest with custom fixtures
- **server**: uvicorn

### frontend
- **framework**: react 19 with typescript
- **bundler**: vite
- **styling**: tailwind css with custom design tokens
- **motion**: motion (spring physics & hardware-accelerated transitions)
- **data visualization**: recharts
- **icons & notifications**: lucide react & sonner

### design philosophy
inspired by linear, vercel, and raycast: a luminous warm off-white canvas (`#fbfbfe`), near-black typography (`#090d16`), translucent frosted panels (`surface-card`), tactile micro-interactions (`.pressable` active states), and a living topological verification beam.

---

## project structure

```text
asyncreconcile/
├── backend/
│   ├── app/
│   │   ├── main.py              # fastapi app & middleware
│   │   ├── config.py            # settings & environment
│   │   ├── database.py          # sqlalchemy engine & session
│   │   ├── models/              # account, ticket, operation, audit_event, benchmark_run
│   │   ├── schemas/             # pydantic request/response schemas
│   │   ├── services/            # state machine, verification gate, benchmark runner
│   │   └── routers/             # health, tickets, accounts, operations, events, benchmark
│   ├── tests/                   # 13 pytest unit & integration tests
│   └── requirements.txt         # backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # verification field, stepper, stat cards, badges, timeline
│   │   ├── layouts/             # app layout, sidebar, telemetry pips
│   │   ├── pages/               # dashboard, tickets, operations, benchmark, audit log
│   │   ├── services/            # api client
│   │   ├── types/               # typescript data contracts
│   │   └── index.css            # design tokens & animations
│   ├── package.json
│   └── vite.config.ts
├── docs/                        # architecture & methodology guides
├── .env.example                 # environment template
├── .gitignore                   # comprehensive git ignore rules
└── README.md                    # project documentation
```

---

## getting started locally

### prerequisites
- python 3.10+ (tested on python 3.13)
- node.js 18+ (tested on node 22)

### 1. clone or navigate to the repository
```bash
cd asyncreconcile
```

### 2. configure environment
```bash
cp .env.example .env
```

### 3. setup & start backend
```bash
# create virtual environment
python3 -m venv backend/venv

# activate virtual environment
source backend/venv/bin/activate

# install dependencies
pip install -r backend/requirements.txt

# start fastapi development server
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
the backend api is live at `http://127.0.0.1:8000`.  
interactive openapi docs: `http://127.0.0.1:8000/docs`.

### 4. setup & start frontend
in a separate terminal:
```bash
cd frontend

# install node modules
npm install

# start vite dev server
npm run dev
```
the frontend is live at `http://localhost:5173`.

---

## running tests

### backend test suite
run all 13 tests covering operational lifecycle, 409 conflict rejections, benchmark evaluation runs, and audit logs:
```bash
PYTHONPATH=backend ./backend/venv/bin/pytest -v backend/tests
```

all 13 tests pass cleanly in under 0.5s:
```text
tests/test_benchmark.py::test_benchmark_runner_asyncreconcile_mode PASSED
tests/test_benchmark.py::test_benchmark_runner_instant_mode PASSED
tests/test_benchmark.py::test_benchmark_runner_comparison_mode PASSED
tests/test_benchmark.py::test_dashboard_metrics PASSED
tests/test_benchmark.py::test_audit_event_logging_and_filtering PASSED
tests/test_operations.py::test_operation_lifecycle_asyncreconcile PASSED
tests/test_operations.py::test_operation_failure_transition PASSED
tests/test_operations.py::test_operation_instant_mode PASSED
tests/test_tickets.py::test_premature_resolution_blocked_when_operation_pending PASSED
tests/test_tickets.py::test_premature_resolution_blocked_when_operation_running PASSED
tests/test_tickets.py::test_resolution_blocked_on_operation_failure PASSED
tests/test_tickets.py::test_resolution_blocked_on_mismatched_target_account PASSED
tests/test_tickets.py::test_successful_verification_and_resolution PASSED

13 passed in 0.33s
```

### frontend build verification
test typescript types and production bundle generation:
```bash
cd frontend
npm run build
```

---

## quick walkthrough: test it yourself

1. open `http://localhost:5173` in your browser.
2. on the **overview** page, click **run comparison suite**.
   - observe that **asyncreconcile mode** maintains a 100% pass rate because it intercepts premature ticket closures and forces verification.
   - observe that **instant mode** passes fewer safety scenarios because naive agents close tickets without defensive polling.
3. click **support tickets** in the sidebar &rarr; select `tck-201` (*emergency legal hold & deprovisioning: gordon freeman*).
4. look at the **pre-flight completion verification gate**. notice the status is **closure blocked** because no operation exists.
5. click **start asyncreconcile op**. an operation is queued with status `pending`.
6. click **attempt resolution** and submit notes.
   - the backend will reject the request with **http 409 conflict**:
   ```json
   {
     "error_code": "PREMATURE_TICKET_CLOSURE",
     "message": "premature closure attempt: operation op-xxxx is still in 'pending' status. account status has not reconciled.",
     "resource_id": "tck-201",
     "current_state": "open"
   }
   ```
7. click **advance step** twice (`pending` &rarr; `running` &rarr; `completed`).
8. observe that employee `emp-102` is now reconciled to `suspended`. all 4 seals turn green (**allowed to close**).
9. click **attempt resolution** again &rarr; ticket resolves cleanly.
10. open **audit stream** to review the append-only chronological log of every transition, query, and safety gate check.

---

## license & attribution

this project is an independent reference prototype exploring verification discipline in ai operations. built with clean-room architecture and simulated sqlite persistence without external proprietary dependencies.
