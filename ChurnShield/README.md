# ChurnShield Telecom

Churn prevention automation for fixed broadband providers, built on UiPath Maestro Flow.
ChurnShield combines customer, network quality and trouble-ticket data, scores churn risk,
escalates overdue tickets of valuable at-risk customers, prepares an AI retention offer, and
lets a retention officer approve or edit it. Every step is recorded in Data Fabric.

> All data in this project is **synthetic**. No real customer data, passwords or API keys are included.

## Problem

Network quality, complaints, tickets and subscription data live in different systems. ISPs spot
at-risk customers late, overdue tickets are not escalated consistently, and nobody follows up after
an outage is fixed. Retention offers are given without a consistent rule or approval record.

The demo models fixed broadband, but the same signals (network quality, complaints, tickets, contract end)
exist for a home-broadband brand such as IOH's HiFi and for postpaid mobile; only the data mapping changes.

## What the robot does

```
daily schedule (07:00) or manual run
  -> read customers || read open tickets || read existing cases   (Data Fabric, in parallel)
  -> build features per customer                    (outages, packet loss, latency, complaints, overdue tickets, contract)
  -> AI complaint analysis, one call for all complaints (negative tone, intent to leave; keyword fallback)
  -> score churn risk                               (scoring slot: explainable rules by default, external ML model optional)
  -> prioritize: score x annual revenue at risk     (threshold 0.6, top 5)
       skip customers with an open case or contacted in the last 30 days (no duplicate cases, no spamming)
       early warning: low-score customers whose complaint shows intent to leave
  -> flag approvals still waiting past the SLA (24 h) for the supervisor
  -> for each prioritized customer, in parallel:
       create retention case
       escalate the most overdue ticket to NOC      (if any) + email to NOC with risk and revenue context
       AI agent: risk summary, action, STRUCTURED offer (type, %, months, technician visit), follow-up message
         AI fails -> case set to Needs Manual Review, the other customers continue
       offer policy guardrail on the AI draft       (deterministic check, result shown to the reviewer)
       human approval in Action Center              (change offer fields / message, Approve Offer or No Action)
       approved version re-checked against policy
         within policy  -> Follow-up Ready
         out of policy  -> supervisor task: Approve Exception or Reject Offer
       approved -> follow-up email to the customer (Gmail) -> Follow-up Sent
       update case
  -> run report built from the recorded cases -> report email to the retention manager
```

Emails go through the Integration Service **Gmail** connector. In this demo every email is sent to one
inbox given by the `demoInbox` run input, and the subject names the intended recipient (NOC, the
customer's synthetic `@example.com` address, the manager). With `demoInbox` empty no email is sent and
approved cases stay at `Follow-up Ready`. If an email fails, the case stays at `Follow-up Ready` with the
error in the note and the run continues.

**Human in the Lead:** no customer is contacted and no offer is given without a person's approval.
The reviewer can change the AI's offer (picked from a dropdown, with percent and months as numbers) and
the message before approving; the edited version is what gets stored. The AI is bounded by policy:
neither the AI draft nor a reviewer's edit can go out of policy without a supervisor explicitly
approving an exception, and every exception is recorded with the reason.

## AI complaint analysis

Free-text complaints are read by an AI agent in one call per run (not one call per customer). It marks
each complaint as negative and/or showing intent to leave, including slang and implied intent
("mending cabut aja", "provider sebelah", "stop langganan"). The score uses it as one explainable signal
(intent +0.10, negative +0.07), and the reason names the complaint.

- **Early warning:** customers whose score is still low but who ask about leaving are listed in the report.
- **Fallback:** if the AI call fails, the keyword list is used and the report says so (tested).
- On the synthetic data (47 complaints) the AI flagged 6 risky complaints the keyword list missed and did not
  repeat the keyword list's 5 false alarms ("lagi" contains "lag"). These complaint texts were written by us
  for the demo, so this shows the behaviour, not a measured accuracy.

## Offer policy guardrail

The offer is structured, so the rules are exact. The same check runs on the AI draft and on the
reviewer-approved version, and it also checks that the message does not promise more than the offer:

| Rule | Example that is flagged |
|---|---|
| Offer type is one of `Diskon`, `Upgrade Kecepatan`, `Bulan Gratis`; a priority technician visit may be added | type "Cashback" |
| One offer type only | upgrade with discount 20% |
| Discount at most 30%, at most 3 months | discount 50% for 6 months |
| Speed upgrade at most 3 months | upgrade for 6 months |
| Free month: at most 1, and only when the contract has at most 1 month left | 2 free months; 1 free month with 6 months left |
| Message matches the offer | message says "diskon 50%", "lima puluh persen", "setengah harga", "selama 12 bulan", or a free month when the offer is a discount |
| No promises that cannot be guaranteed | "dijamin", "bebas gangguan", "tidak akan ada gangguan" |
| Follow-up message not empty, at most 150 words | — |

## Duplicate protection, contact cooldown and approval SLA

- A customer with a case in `Analyzing`, `Pending Approval`, `Follow-up Ready` or `Needs Manual Review` is never given a second case.
- A customer contacted in the last `contactCooldownDays` (30) is skipped. A supervisor-rejected offer never
  reached the customer, so it does not start the cooldown: the next run prepares a new, compliant offer.
- Every run flags cases waiting for approval longer than `approvalSlaHours` (24) with `ApprovalOverdue = true`
  and lists them in the report. Maestro Flow has no built-in timeout for a human task, so the open task is
  not cancelled; it is surfaced for the supervisor.
- The report lists every skipped customer with the reason.

## Pluggable ML scoring

ChurnShield does not ship a trained ML model. The scoring step is a slot:

- `scoringMode = "rules"` (default): explainable weighted score with human-readable reasons.
- `scoringMode = "external"` + `externalModelUrl`: posts the customer features to the provider's own model.
  If the call fails, the run **falls back to rule scores** and the report says so.

Contract:

```json
POST <externalModelUrl>
{ "customers": [ { "customerCode": "CUST-0001", "outages30d": 4, "avgPacketLoss": 3.2, "avgLatencyMs": 140,
                   "complaints30d": 3, "overdueTickets": 1, "contractMonthsLeft": 1, "tenureMonths": 8,
                   "monthlyFee": 450000, "...": "other feature fields" } ] }

200 OK
{ "scores": [ { "customerCode": "CUST-0001", "churnScore": 0.82, "topReasons": ["Frequent outages", "Overdue ticket"] } ] }
```

## Honest scope

| Capability | Status |
|---|---|
| Parallel data ingestion, features, rule scoring, prioritization | Working, tested |
| AI complaint analysis + early warning, keyword fallback | Working, tested (AI path and forced-failure fallback) |
| Automatic ticket escalation (Data Fabric) | Working, tested |
| AI recommendation with structured offer and message per customer | Working, tested |
| Parallel human approval tasks with editable offer fields | Working, tested |
| Offer policy guardrail + supervisor exception / rejection | Working, tested (AI draft, compliant edit, out-of-policy edit approved as exception, message that contradicts the offer rejected) |
| Duplicate protection, contact cooldown, approval SLA flag | Working, tested with overlapping runs |
| AI failure for one customer | Handled: case set to `Needs Manual Review` with the error, run continues (tested with a deliberately invalid model) |
| Case tracking and run report | Working, tested |
| Score weights | Set by us from domain judgement, not fitted to churn history. A provider would calibrate them, or plug in its own model |
| Retention outcome (did the customer stay?) | Not tracked yet; needs the provider's billing/CRM data. The report therefore says "revenue offered retention", not "revenue saved" |
| External model slot with fallback | Fallback path tested with an unreachable URL; no real model connected |
| Scale | Tested with 150 customers. Reads are capped at 1,000 rows and all scoring runs in one step, so millions of subscribers need scoring in the provider's model or warehouse (external slot) with only the top customers passed in; not tested at that scale |
| Customer opt-out / consent | Not implemented; the contact cooldown limits contact frequency. Only fields needed for the offer are sent to the AI (no email or phone) |
| Daily schedule | Configured (07:00, Quartz cron, platform time zone); fires after deployment |
| Escalation, follow-up and report emails (Gmail) | Working, tested in demo mode: all emails go to one test inbox (`demoInbox`), not to real customers or teams. Email failure tested: case stays `Follow-up Ready`, run continues |

## Tools / technology

- UiPath Maestro Flow (authored with the UiPath VS Code extension and `uip` CLI)
- UiPath Data Fabric: `CsCustomer`, `CsTicket`, `CsRetentionCase`
- UiPath Action Center (human approval tasks)
- UiPath Integration Service, Gmail connector (escalation, follow-up and report emails)
- Inline AI agents (model `anthropic.claude-sonnet-5`): complaint analysis (one call per run) and the retention recommendation (one call per prioritized customer)

## Setup

1. UiPath Automation Cloud tenant with Maestro, Data Fabric and Action Center.
2. Create the three entities from `sample-data/entity_*.json`:
   `uip df entities create CsCustomer --file sample-data/entity_CsCustomer.json` (same for the other two).
3. Load synthetic data:
   `python sample-data/generate_data.py sample-data`, then
   `uip df records import <CsCustomer-id> --file sample-data/customers.csv` and the same for `tickets.csv`.
4. Create a Gmail connection in Integration Service (a test Google account), then from `ChurnShield/` run
   `uip maestro registry prepare uipath-google-gmail --action send-email --source .flow-sdk/ChurnShield.flow.ts`
   to bind it (writes `.flow-sdk/bindings.json`).
5. Before each demo, reset tickets and cases: `bash sample-data/reset-demo-data.sh`.

## How to run

1. Open `ChurnShield.uipx`, project **ChurnShield**, file `ChurnShield/ChurnShield.flow`.
2. Run / Debug with the inputs in `sample-data/input-sample.json` (all have defaults). Set `demoInbox` to your
   test inbox to receive the emails.
3. Open Action Center: one **ChurnShield: review retention offer** task per prioritized customer.
   Check the policy result, change the offer type / percent / months / technician visit or the message if
   needed, then choose **Approve Offer** or **No Action**.
   If the approved version is out of policy, a **ChurnShield: penawaran di luar kebijakan** task appears
   for the supervisor: **Approve Exception** or **Reject Offer**.
4. Check the `CsRetentionCase` and `CsTicket` entities and the run outputs (`summary`, `report`).

## Run inputs

| Input | Default | Meaning |
|---|---|---|
| `riskThreshold` | 0.6 | Minimum churn score to count as high risk |
| `topN` | 5 | Customers processed per run |
| `scoringMode` | `rules` | `rules` or `external` |
| `externalModelUrl` | empty | Provider's churn model endpoint |
| `contactCooldownDays` | 30 | Days before a contacted customer can get a new case |
| `approvalSlaHours` | 24 | Hours a case may wait for approval before it is flagged |
| `demoInbox` | empty | Test inbox that receives every email (NOC, customer, manager). Empty = no email sent |

## Tested scenarios (synthetic data, Nov 2026)

| Scenario | Result |
|---|---|
| Default run (current version) | 150 customers scored, complaints read by AI, 21 high risk, Rp 150.6M/year at risk; 5 cases, 5 tickets escalated; 4 approved (one changed to a 20% discount), 1 no action; Rp 45.6M/year offered retention; 4 low-score customers flagged as early warning |
| Reviewer sets discount 50% / 6 months | Supervisor task lists 2 violations; Approve Exception stored as `Approved (Exception)` with both notes |
| Reviewer switches the offer to a discount but keeps a message promising "1 bulan gratis" | Re-check flags the message; supervisor Reject Offer; case `Closed - Offer Rejected` |
| Emails on, top 2 (one approved, one supervisor exception) | 2 NOC escalation emails, 2 customer follow-ups, 1 manager report received in the test inbox; both cases `Follow-up Sent` |
| Gmail binding missing at run time | Every email step failed with a 400; cases stayed `Follow-up Ready` with the error in the note; run completed |
| AI model unavailable (invalid model id) | Complaint analysis falls back to keywords; the customer's case goes to `Needs Manual Review` with the error; run completed |
| External model URL unreachable | Fallback to rules; report notes the fallback; run completed |
| Prioritized customer without an overdue ticket | No escalation, case processed normally |
| Threshold 1.5 | 0 cases; run completed without errors |
| Reviewer edits offer to "Diskon 50% selama 6 bulan" | Re-check flags 2 violations; supervisor task; Approve Exception stored as `Approved (Exception)` with both notes |
| Reviewer edits offer to "Gratis 2 bulan + upgrade kecepatan" | Re-check flags 3 violations; supervisor Reject Offer; case `Closed - Offer Rejected` |
| Second run started while the first run's 5 tasks were still open (SLA 0 h, top 3) | The 5 customers skipped with reason; their 5 cases flagged `ApprovalOverdue`; 3 new customers processed |
| Run after approvals and closures | 8 customers skipped (open case or cooldown); the supervisor-rejected customer picked again with a new compliant offer |
| Policy check unit cases | 22 structured offer/message examples, all classified as expected |

Earlier builds (free-text offer) were also tested with "Gratis 2 bulan + upgrade kecepatan" (rejected by the supervisor).

## Building the flow

The source is `ChurnShield/.flow-sdk/ChurnShield.flow.ts`. From `ChurnShield/`: `uip maestro flow compile .flow-sdk/ChurnShield.flow.ts -o ChurnShield.flow`,
then `uip maestro flow format ChurnShield.flow` **once**, `python .flow-sdk/enable-error-handlers.py ChurnShield.flow`,
and `uip maestro flow validate ChurnShield.flow` (must report `Valid`). The script enables the error handlers on
the AI agent steps; a second `format` would do the same but drops the Gmail connection bindings.
Close the `ChurnShield.flow` canvas in VS Code while building: an open canvas saves its own copy over the file
and also drops those bindings.

See `sample-data/output-sample.md` for a full example output.
