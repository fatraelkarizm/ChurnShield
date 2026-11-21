# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## ChurnShield Telecom
**Human-in-the-Lead Churn Prevention Automation for Fixed Broadband Providers**

| Document Information | Details |
|---|---|
| Product Name | ChurnShield Telecom |
| Document Type | Product Requirements Document (PRD) |
| Version | 1.0 |
| Status | Initial Draft |
| Product Category | AI & Automation for Customer Retention |
| Target Users | ISPs and fixed broadband providers (retention, customer care and network operations teams) |
| Core Technology | UiPath Maestro Flow, UiPath Data Fabric, UiPath Action Center, AI Agents, pluggable ML scoring |

---

## 1. Product Overview

### 1.1 Product Description

ChurnShield Telecom is a churn prevention automation for internet service providers. It brings customer, network performance and trouble-ticket data together, scores each customer's churn risk, prioritizes the customers whose loss would hurt revenue most, and drives the follow-up work: escalating overdue network tickets, preparing a retention offer and message, getting human approval, and recording the outcome.

UiPath is the orchestration core. It ingests the data, runs the risk scoring step, calls the AI agent, opens approval tasks for people, escalates tickets, and produces the run report. The scoring step is a replaceable slot: ChurnShield ships with an explainable rule-based score and can call a provider's own machine learning model through a defined API contract.

### 1.2 Problem Statement

For a fixed broadband provider, the signals that a customer is about to leave are spread across systems that rarely talk to each other:

- Network quality data (outages, packet loss, latency) sits with network operations.
- Complaints and trouble tickets sit in the customer care or ticketing system.
- Subscription data (plan, monthly fee, contract end date) sits in billing or CRM.

As a result:

- At-risk customers are identified late, often after they have already requested termination.
- Trouble tickets that breach their SLA are not escalated consistently.
- After a network issue is fixed, nobody follows up with the affected customer.
- Retention offers are given without a consistent rule or approval record.
- Teams cannot see how much recurring revenue is at risk at any moment.

### 1.3 Proposed Solution

ChurnShield runs as a scheduled (daily) or on-demand automation that:

1. Ingests customer, network KPI and open ticket data.
2. Builds per-customer features (outages, packet loss, latency, complaints, overdue tickets, contract months left).
3. Scores churn risk through the scoring slot (rule-based by default, external ML model when configured).
4. Prioritizes customers by churn risk and revenue exposure.
5. Escalates overdue network tickets for prioritized customers automatically.
6. Generates an AI retention recommendation, offer and follow-up message per customer.
7. Sends each case to a retention officer for approval, with the option to edit the offer and message.
8. Records every decision and status in Data Fabric.
9. Produces a run report: customers scored, high-risk customers, revenue at risk, tickets escalated, offers approved.

### 1.4 Product Vision

To help broadband providers act on churn signals before customers leave, by turning scattered operational data into prioritized, approved and traceable retention actions.

### 1.5 Product Value Proposition

**Detect risk early. Fix the network issue first. Follow up with the right offer. Keep humans in control.**

ChurnShield closes the loop between network operations and customer retention: a network problem that threatens a valuable customer is escalated, and the customer is followed up with an approved retention action.

---

## 2. Product Goals and Objectives

### 2.1 Primary Goals

- Identify high-risk customers daily instead of after a termination request.
- Prioritize retention work by revenue exposure.
- Escalate SLA-breaching network tickets for at-risk customers automatically.
- Standardize retention offers through AI recommendations and human approval.
- Provide an auditable record of every retention decision.
- Let providers plug in their own churn model without changing the workflow.
- Demonstrate UiPath as the orchestration core across data, AI, people and actions.

### 2.2 Success Metrics

| Metric | Measurement |
|---|---|
| Time to identify at-risk customers | Time from data availability to a prioritized list |
| Revenue at risk visibility | Annual recurring revenue of high-risk customers, reported per run |
| SLA escalation coverage | Share of overdue tickets of prioritized customers escalated automatically |
| Time to retention action | Time from risk detection to an approved follow-up |
| Approval traceability | Share of retention cases with recorded decision and reviewer note |
| Manual effort | Manual steps per retention case, before and after automation |
| Workflow completion rate | Share of runs completed without unhandled errors |

Baseline and target values will be set through prototype testing with synthetic data that mirrors realistic provider volumes.

---

## 3. Target Users and Personas

### 3.1 Primary User: Retention Officer

**Profile:** Works in customer retention or customer care; decides which customers receive retention offers.

**Needs:**
- A short, prioritized list of customers who need attention today.
- Clear reasons why a customer is at risk.
- A ready-to-use offer and message that can be edited before approval.
- A record of what was decided and why.

### 3.2 Secondary User: Network Operations (NOC) Engineer

**Profile:** Handles network trouble tickets and field escalations.

**Needs:**
- Automatic escalation of overdue tickets that affect high-value, at-risk customers.
- Context on why a ticket was escalated.

### 3.3 Secondary User: Customer Experience / Retention Manager

**Profile:** Owns churn and revenue retention targets.

**Needs:**
- Daily view of revenue at risk and actions taken.
- Consistent offer policy and an audit trail.

### 3.4 Supporting User: Automation / Data Administrator

**Profile:** Maintains data sources, the scoring model connection and the automation schedule.

**Needs:**
- Configurable thresholds and scoring mode.
- A defined contract to plug in an external ML model.
- Error visibility and fallback behavior.

---

## 4. Product Scope

### 4.1 In Scope — MVP

| Module | Description | Priority |
|---|---|---|
| Data Ingestion | Read customers and open tickets from Data Fabric | Must Have |
| Feature Builder | Combine network KPIs, complaints, tickets and contract data per customer | Must Have |
| Risk Scoring Slot | Explainable rule-based scoring; optional external ML endpoint with fallback | Must Have |
| Prioritization | Rank by churn score and revenue at risk; apply threshold and top-N | Must Have |
| Ticket Escalation | Escalate the most overdue open ticket of each prioritized customer | Must Have |
| AI Retention Recommendation | Recommended action, offer and follow-up message in Bahasa Indonesia | Must Have |
| Human Approval | Approve (with optional edits) or decide no action | Must Have |
| Case Tracking | Retention case record and status in Data Fabric | Must Have |
| Run Report | Summary of scored customers, high risk, revenue at risk, escalations, approvals | Must Have |
| Scheduling | Daily scheduled run plus on-demand run | Should Have |
| Notifications | Email for escalations, follow-ups and the run report | Should Have (requires email connection) |

### 4.2 Future Enhancements

- Direct integration with the provider's ticketing system (for example ServiceNow) instead of Data Fabric tickets.
- Direct integration with CRM and billing systems.
- Sending follow-ups through WhatsApp Business or SMS.
- Closed-loop measurement: track whether contacted customers renewed or churned.
- Feeding outcomes back to the provider's ML model for retraining.
- Offer budget limits per period and per segment.
- Dashboards in UiPath Insights.

### 4.3 Out of Scope for MVP

- Training or hosting a machine learning model inside ChurnShield.
- Use of real customer data (the prototype uses synthetic data only).
- Automatic application of discounts in the billing system.
- Contacting customers without human approval.
- Real-time network monitoring; ChurnShield consumes aggregated KPIs.

---

## 5. Functional Requirements

### FR-01: Data Ingestion

The system shall read, at the start of each run:

- Customer records: customer code, name, service plan, monthly fee, tenure, contract months left, city, contact email.
- Network KPIs per customer for the last 30 days: outages, average packet loss, average latency.
- Complaint data: number of complaints in 30 days, last complaint text.
- Open trouble tickets: ticket code, customer, category, opened time, SLA hours, status.

Customer and ticket reads should run in parallel.

### FR-02: Feature Building

For each customer the system shall compute:
- Number of open tickets.
- Number of overdue tickets (hours open greater than the SLA).
- The most overdue open ticket and its hours overdue.
- Annual revenue at risk (monthly fee × 12).

### FR-03: Risk Scoring Slot

The system shall score churn risk from 0 to 1 per customer and return the top reasons.

- **Rule-based mode (default):** weighted, explainable scoring on outages, packet loss, latency, complaints, negative complaint wording, overdue tickets, contract months left and tenure.
- **External model mode:** send the features to a configured endpoint and use the returned scores.
- **Fallback:** if the external model fails or is not configured, the system shall use rule-based scores and record that a fallback happened.

External model contract:

```json
POST <externalModelUrl>
{ "customers": [ { "customerCode": "CUST-0001", "outages30d": 4, "avgPacketLoss": 3.2,
  "avgLatencyMs": 140, "complaints30d": 3, "overdueTickets": 1,
  "contractMonthsLeft": 1, "tenureMonths": 8, "monthlyFee": 450000 } ] }

200 OK
{ "scores": [ { "customerCode": "CUST-0001", "churnScore": 0.82,
  "topReasons": ["Frequent outages", "Overdue ticket"] } ] }
```

### FR-04: Prioritization

The system shall select customers whose churn score is at or above a configurable threshold (default 0.6), rank them by churn score × revenue at risk, and keep the top N (default 5) per run.

### FR-05: Ticket Escalation

For each prioritized customer with an overdue open ticket, the system shall mark the most overdue ticket as escalated, record an escalation note (customer value, risk score, hours overdue), and flag the retention case as having an escalated ticket.

### FR-06: AI Retention Recommendation

For each prioritized customer, an AI agent shall produce in Bahasa Indonesia:
- A short risk summary.
- A recommended retention action.
- A proposed offer, within stated policy limits.
- A follow-up message to the customer that acknowledges the service issue.

The agent shall use only the provided customer data and shall not promise outcomes that cannot be guaranteed.

### FR-07: Human Approval

The system shall create one approval task per prioritized customer showing customer details, churn score, reasons, revenue at risk, ticket status, the recommended action, and the editable offer and message.

The reviewer shall be able to:
- Approve the offer, optionally editing the offer and message.
- Choose no action.
- Add a reviewer note.

No follow-up may be sent without approval.

### FR-08: Case Tracking

The system shall create a retention case per prioritized customer and update its status through the run.

Statuses: Analyzing, Pending Approval, Follow-up Ready, Follow-up Sent, Closed - No Action, Failed.

### FR-09: Follow-up Delivery

After approval, the system shall prepare the follow-up for delivery. When an email connection is configured, it shall send the follow-up and set the status to Follow-up Sent. Without it, the case stays at Follow-up Ready and nothing is claimed as sent.

### FR-10: Run Report

At the end of each run, the system shall produce a report with run ID, scoring mode, customers scored, high-risk customers, total revenue at risk, tickets escalated, offers approved, no-action decisions, and the list of cases.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Explainability | Every churn score must come with human-readable reasons. |
| Human control | No customer contact or offer without explicit approval. |
| Auditability | Escalations, approvals, edits and reviewer notes must be recorded per case. |
| Security & Privacy | No credentials in source; prototype uses synthetic data only; customer contact data is visible only to authorized roles. |
| Reliability | External model failure must fall back to rule-based scoring without stopping the run. |
| Configurability | Threshold, top-N, scoring mode and model URL are configurable without changing the workflow. |
| Interoperability | External models are integrated through a documented JSON contract. |
| Performance | A run over 150 customers must complete its automated steps within minutes, excluding human approval time. |
| Maintainability | Scoring, recommendation and escalation steps are separate and replaceable. |

---

## 7. System Workflow

### 7.1 Main Workflow

1. Run starts on schedule (daily) or on demand.
2. UiPath reads customers and open tickets in parallel from Data Fabric.
3. UiPath builds per-customer features.
4. UiPath scores churn risk (rules, or external model with fallback).
5. UiPath prioritizes customers by risk and revenue at risk.
6. For each prioritized customer:
   1. Create a retention case.
   2. Escalate the most overdue ticket, if any.
   3. AI agent prepares the recommendation, offer and message.
   4. Retention officer approves (with edits) or chooses no action.
   5. Case is updated; approved follow-ups are prepared or sent.
7. UiPath produces the run report.

### 7.2 Exception Handling

| Exception | System Response |
|---|---|
| External model unavailable or returns an error | Fall back to rule-based scoring and record the fallback in the report |
| External model URL not configured | Use rule-based scoring |
| No customer above threshold | Complete the run with an empty case list and report it |
| Data source unavailable | Fail the run visibly; no partial customer contact |
| Reviewer chooses no action | Close the case without contact |
| Email connection unavailable | Keep case at Follow-up Ready; report that delivery is pending |

---

## 8. High-Level Technical Architecture

### Core Automation
- **UiPath Maestro Flow:** orchestration, parallel ingestion, scoring slot, per-customer loop, approvals, reporting.
- **UiPath Data Fabric:** entities `CsCustomer`, `CsTicket`, `CsRetentionCase`.
- **UiPath Action Center:** retention approval tasks.
- **UiPath Integration Service:** email delivery (Gmail connector) for escalations, follow-ups and reports.

### AI Services
- Inline AI agent for retention recommendations and messages.
- Optional external ML churn model through HTTP.

### Data Model (MVP)

| Entity | Key fields |
|---|---|
| CsCustomer | CustomerCode, CustomerName, ServicePlan, MonthlyFee, TenureMonths, ContractMonthsLeft, City, ContactEmail, Outages30d, AvgPacketLoss, AvgLatencyMs, Complaints30d, LastComplaint |
| CsTicket | TicketCode, CustomerCode, Category, Description, OpenedAt, SlaHours, TicketStatus, Escalated, EscalationNote |
| CsRetentionCase | RunId, CustomerCode, CustomerName, ChurnScore, RiskLevel, TopReasons, RevenueAtRisk, ScoringMode, TicketEscalated, RecommendedAction, OfferDetail, FollowUpMessage, Decision, ReviewerNote, CaseStatus |

### Configuration

| Setting | Default |
|---|---|
| Risk threshold | 0.6 |
| Top N customers per run | 5 |
| Scoring mode | rules |
| External model URL | empty |
| Schedule | Daily |

---

## 9. Human-in-the-Lead Principles

The system shall:
1. Explain every risk score with reasons.
2. Require approval before any customer contact or offer.
3. Let the reviewer edit the offer and the message before approving.
4. Allow the reviewer to choose no action.
5. Record every decision, edit and note.
6. Never claim a follow-up was sent without delivery confirmation.

AI and automation prepare the work; people make the retention decisions.

---

## 10. MVP Acceptance Criteria

The MVP is successful when:

1. A run reads customer and ticket data from Data Fabric.
2. Every customer receives a churn score with reasons.
3. High-risk customers are ranked by risk and revenue at risk.
4. Overdue tickets of prioritized customers are escalated automatically.
5. Each prioritized customer gets an AI recommendation, offer and message.
6. Each case requires human approval or a no-action decision.
7. Decisions and statuses are recorded in Data Fabric.
8. A run report shows customers scored, high risk, revenue at risk, escalations and approvals.
9. Scoring can switch to an external model through configuration, with fallback.
10. At least one failure scenario is handled and visible.

---

## 11. Risks and Dependencies

| Risk | Mitigation |
|---|---|
| No access to real provider data | Use realistic synthetic data; state it clearly |
| ML claims not backed by a model | Ship explainable rule scoring; offer an ML slot instead of claiming a model |
| External model contract mismatch | Document the contract; fall back to rules on error |
| Email connection not available | Keep follow-ups at Follow-up Ready; do not claim delivery |
| Over-generous AI offers | Policy limits in the agent prompt; human approval required |
| Scope expansion | Prioritize MVP modules |

---

## 12. Future Product Direction

After the MVP, ChurnShield can grow into a retention operations layer for broadband providers: direct ticketing, CRM and billing integration, multichannel follow-ups, outcome tracking, model feedback loops, and budget-aware offer policies, while keeping retention decisions under human control.

**Product Positioning:** ChurnShield is not a churn model. It is the automation that turns churn signals, from any model or rule, into escalations, approved retention actions and a traceable record.
