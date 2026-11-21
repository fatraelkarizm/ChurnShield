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

## What the robot does

```
daily schedule (07:00) or manual run
  -> read customers || read open tickets            (Data Fabric, in parallel)
  -> build features per customer                    (outages, packet loss, latency, complaints, overdue tickets, contract)
  -> score churn risk                               (scoring slot: rules by default, external ML model optional)
  -> prioritize: score x annual revenue at risk     (threshold 0.6, top 5)
  -> for each prioritized customer, in parallel:
       create retention case
       escalate the most overdue ticket to NOC      (if any)
       AI agent: risk summary, action, offer, follow-up message (Bahasa Indonesia)
       human approval in Action Center              (edit offer/message, Approve Offer or No Action)
       update case
  -> run report built from the recorded cases
```

**Human in the Lead:** no customer is contacted and no offer is given without a person's approval.
The reviewer can edit the AI's offer and message before approving; the edited version is what gets stored.

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
| Automatic ticket escalation (Data Fabric) | Working, tested |
| AI recommendation, offer and message per customer | Working, tested |
| Parallel human approval tasks with editable offer | Working, tested |
| Case tracking and run report | Working, tested |
| External model slot with fallback | Fallback path tested with an unreachable URL; no real model connected |
| Daily schedule | Configured (07:00, Quartz cron, platform time zone); fires after deployment |
| Sending follow-up / escalation / report emails | Not connected yet. Cases stop at `Follow-up Ready`; nothing is claimed as sent |

## Tools / technology

- UiPath Maestro Flow (authored with the UiPath VS Code extension and `uip` CLI)
- UiPath Data Fabric: `CsCustomer`, `CsTicket`, `CsRetentionCase`
- UiPath Action Center (human approval tasks)
- Inline AI agent (model `anthropic.claude-sonnet-5`)

## Setup

1. UiPath Automation Cloud tenant with Maestro, Data Fabric and Action Center.
2. Create the three entities from `sample-data/entity_*.json`:
   `uip df entities create CsCustomer --file sample-data/entity_CsCustomer.json` (same for the other two).
3. Load synthetic data:
   `python sample-data/generate_data.py sample-data`, then
   `uip df records import <CsCustomer-id> --file sample-data/customers.csv` and the same for `tickets.csv`.
4. Before each demo, reset tickets and cases: `bash sample-data/reset-demo-data.sh`.

## How to run

1. Open `ChurnShield.uipx`, project **ChurnShield**, file `ChurnShield/ChurnShield.flow`.
2. Run / Debug with the inputs in `sample-data/input-sample.json` (all have defaults).
3. Open Action Center: one **ChurnShield: review retention offer** task per prioritized customer.
   Edit the offer if needed, then choose **Approve Offer** or **No Action**.
4. Check the `CsRetentionCase` and `CsTicket` entities and the run outputs (`summary`, `report`).

## Run inputs

| Input | Default | Meaning |
|---|---|---|
| `riskThreshold` | 0.6 | Minimum churn score to count as high risk |
| `topN` | 5 | Customers processed per run |
| `scoringMode` | `rules` | `rules` or `external` |
| `externalModelUrl` | empty | Provider's churn model endpoint |

## Tested scenarios (synthetic data, Nov 2026)

| Scenario | Result |
|---|---|
| Default run | 150 customers scored, 21 high risk, Rp 150.6M/year at risk; 5 cases, 5 tickets escalated; 4 approved (one with an edited offer), 1 no action; report matches Data Fabric |
| External model URL unreachable | Fallback to rules; report notes the fallback; run completed |
| Prioritized customer without an overdue ticket | No escalation, case processed normally |
| Threshold 1.5 | 0 cases; run completed without errors |

See `sample-data/output-sample.md` for a full example output.
