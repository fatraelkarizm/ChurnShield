/**
 * ChurnShield Telecom — churn prevention automation for fixed broadband (PRD/URD v1.0)
 *
 * daily schedule / manual run
 *   -> read customers || read open tickets (Data Fabric, parallel)
 *   -> build features -> scoring slot (rules by default; external ML endpoint with fallback)
 *   -> prioritize by churn score x revenue at risk (threshold, top N)
 *   -> per customer (parallel): open case -> escalate overdue ticket
 *        -> AI retention recommendation -> human approval (edit / approve / no action)
 *        -> case updated
 *   -> run report from the recorded cases
 *
 * Data is synthetic. No customer is contacted without approval.
 */
import {
  flow, scheduled, script, inlineAgent, hitl, http,
  dataFabricRead, dataFabricCreate, dataFabricUpdate,
  out, v, lit, js, types,
} from "@uipath/maestro-builder-sdk";

const MODEL = "anthropic.claude-sonnet-5";
const item = (field: string) => v(`eachCustomer.currentItem.${field}`);

export default flow("f10cb1af-e962-41ad-aba8-40d250ac2453")
  .schemaVersion("1.9")
  .name("ChurnShield")
  // Configuration: manual runs may override; the daily schedule uses the defaults.
  .var("cfgThreshold", types.number, 0.6)
  .var("cfgTopN", types.number, 5)
  .var("cfgMode", types.string, "rules")
  .var("cfgModelUrl", types.string, "")
  .input({
    riskThreshold: { type: types.number, default: 0.6, shared: "cfgThreshold" },
    topN: { type: types.number, default: 5, shared: "cfgTopN" },
    scoringMode: { type: types.string, default: "rules", shared: "cfgMode" }, // rules | external
    externalModelUrl: { type: types.string, default: "", shared: "cfgModelUrl" },
  })
  .entryPoint("dailyRun", scheduled({ every: "0 0 7 * * ?" }))
  .output({
    runId: types.string,
    scoringModeUsed: types.string,
    summary: types.string,
    customersScored: types.number,
    highRiskCount: types.number,
    revenueAtRisk: types.number,
    report: types.object,
  })
  .var("scored", types.array, [])
  .var("scoringUsed", types.string, "rules")
  .var("scoringNote", types.string, "")

  .step("newRun", script({
    code: `
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      return "RUN-" + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "-" +
        p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
    `,
    returns: "string",
  }))

  // FR-01 ingestion: customers and open tickets are independent reads
  .parallel("ingest", [
    (a) => a.step("readCustomers", dataFabricRead({
      entity: "CsCustomer", resultMode: "multiple", limit: 1000,
      sort: { field: "CustomerCode" },
    })),
    (b) => b.step("readTickets", dataFabricRead({
      entity: "CsTicket", resultMode: "multiple", limit: 1000,
      filters: [{ field: "TicketStatus", value: "Open" }],
      sort: { field: "OpenedAt" },
    })),
  ])

  // FR-02 feature building
  .step("buildFeatures", script({
    code: `
      const customers = $vars.readCustomers.output.results || [];
      const tickets = $vars.readTickets.output.results || [];
      const now = Date.now();
      const byCustomer = {};
      for (const t of tickets) {
        const hoursOpen = (now - new Date(t.OpenedAt).getTime()) / 3600000;
        const overdueBy = hoursOpen - Number(t.SlaHours || 0);
        const row = { id: t.Id, code: t.TicketCode, category: t.Category, overdueBy: overdueBy };
        (byCustomer[t.CustomerCode] = byCustomer[t.CustomerCode] || []).push(row);
      }
      const features = customers.map((c) => {
        const open = byCustomer[c.CustomerCode] || [];
        const overdue = open.filter((t) => t.overdueBy > 0).sort((x, y) => y.overdueBy - x.overdueBy);
        const worst = overdue[0];
        return {
          customerCode: c.CustomerCode, customerName: c.CustomerName, servicePlan: c.ServicePlan,
          monthlyFee: Number(c.MonthlyFee || 0), city: c.City, contactEmail: c.ContactEmail,
          tenureMonths: Number(c.TenureMonths || 0), contractMonthsLeft: Number(c.ContractMonthsLeft || 0),
          outages30d: Number(c.Outages30d || 0), avgPacketLoss: Number(c.AvgPacketLoss || 0),
          avgLatencyMs: Number(c.AvgLatencyMs || 0), complaints30d: Number(c.Complaints30d || 0),
          lastComplaint: c.LastComplaint || "",
          openTickets: open.length, overdueTickets: overdue.length,
          overdueTicketId: worst ? worst.id : "", overdueTicketCode: worst ? worst.code : "",
          overdueTicketCategory: worst ? worst.category : "",
          hoursOverdue: worst ? Math.round(worst.overdueBy) : 0,
          revenueAtRisk: Number(c.MonthlyFee || 0) * 12
        };
      });
      return { features: features, customerCount: features.length, openTicketCount: tickets.length };
    `,
    returns: { features: "array", customerCount: "number", openTicketCount: "number" },
  }))

  // FR-03 scoring slot, default implementation: explainable rule-based score
  .step("scoreRules", script({
    code: `
      const negative = ["pindah provider", "kecewa", "putus", "berhenti", "lag", "terganggu"];
      const scored = $vars.buildFeatures.output.features.map((f) => {
        const reasons = [];
        let s = 0;
        const add = (w, why) => { if (w > 0) { s += w; reasons.push(why); } };
        add(Math.min(f.outages30d / 6, 1) * 0.25, f.outages30d + " gangguan dalam 30 hari");
        add(Math.min(f.avgPacketLoss / 5, 1) * 0.15 * (f.avgPacketLoss >= 2 ? 1 : 0), "packet loss rata-rata " + f.avgPacketLoss + "%");
        add(Math.min(Math.max(f.avgLatencyMs - 60, 0) / 150, 1) * 0.10, "latency rata-rata " + f.avgLatencyMs + " ms");
        add(Math.min(f.complaints30d / 4, 1) * 0.15 * (f.complaints30d >= 2 ? 1 : 0), f.complaints30d + " keluhan dalam 30 hari");
        const text = String(f.lastComplaint).toLowerCase();
        if (negative.some((w) => text.indexOf(w) >= 0)) add(0.10, "keluhan bernada negatif: \\"" + f.lastComplaint + "\\"");
        if (f.overdueTickets > 0) add(0.15, "tiket " + f.overdueTicketCode + " lewat SLA " + f.hoursOverdue + " jam");
        if (f.contractMonthsLeft <= 0) add(0.10, "kontrak sudah habis bulan ini");
        else if (f.contractMonthsLeft <= 1) add(0.10, "kontrak habis dalam 1 bulan");
        else if (f.contractMonthsLeft <= 3) add(0.05, "kontrak habis dalam " + f.contractMonthsLeft + " bulan");
        if (f.tenureMonths < 6) add(0.05, "pelanggan baru (" + f.tenureMonths + " bulan)");
        const score = Math.round(Math.min(s, 1) * 100) / 100;
        return Object.assign({}, f, {
          churnScore: score,
          riskLevel: score >= 0.75 ? "Very High" : score >= 0.6 ? "High" : score >= 0.35 ? "Medium" : "Low",
          reasons: reasons.length ? reasons.join("; ") : "tidak ada sinyal risiko signifikan"
        });
      });
      return { scored: scored };
    `,
    returns: { scored: "array" },
  }), { updates: { scored: out("scoreRules", "scored"), scoringUsed: lit("rules") } })

  // FR-03 scoring slot, external model: same contract, falls back to rules on failure
  .branch(
    "useExternalModel",
    js`$vars.cfgMode === "external" && $vars.cfgModelUrl !== ""`,
    (ext) =>
      ext
        .step("callModel", http({
          managed: true,
          method: "POST",
          url: v("cfgModelUrl"),
          body: js`({ customers: $vars.buildFeatures.output.features })`,
          returns: { scores: "array" },
        }))
        .onError((h) =>
          h
            .step("modelFallback", script({
              code: `return "External model failed; rule-based scores were used";`,
              returns: "string",
            }), { updates: { scoringNote: out("modelFallback") } })
            .stepToRef("prioritize"),
        )
        .step("mergeModelScores", script({
          code: `
            const byCode = {};
            for (const s of ($vars.callModel.output.body.scores || [])) byCode[s.customerCode] = s;
            let matched = 0;
            const scored = $vars.scored.map((r) => {
              const m = byCode[r.customerCode];
              if (!m) return r;
              matched++;
              const score = Math.round(Number(m.churnScore) * 100) / 100;
              return Object.assign({}, r, {
                churnScore: score,
                riskLevel: score >= 0.75 ? "Very High" : score >= 0.6 ? "High" : score >= 0.35 ? "Medium" : "Low",
                reasons: (m.topReasons || []).join("; ") || r.reasons
              });
            });
            return { scored: scored, note: "External model scored " + matched + " customers" };
          `,
          returns: { scored: "array", note: "string" },
        }), {
          updates: {
            scored: out("mergeModelScores", "scored"),
            scoringUsed: lit("external"),
            scoringNote: out("mergeModelScores", "note"),
          },
        }),
  )

  // FR-04 prioritization
  .step("prioritize", script({
    code: `
      const threshold = Number($vars.cfgThreshold);
      const topN = Math.max(0, Math.floor(Number($vars.cfgTopN)));
      const high = $vars.scored.filter((r) => r.churnScore >= threshold);
      high.sort((a, b) => (b.churnScore * b.revenueAtRisk) - (a.churnScore * a.revenueAtRisk));
      const top = high.slice(0, topN);
      const total = high.reduce((s, r) => s + r.revenueAtRisk, 0);
      return { top: top, highRiskCount: high.length, highRiskRevenue: total, scoredCount: $vars.scored.length };
    `,
    returns: { top: "array", highRiskCount: "number", highRiskRevenue: "number", scoredCount: "number" },
  }))

  // per prioritized customer, in parallel: each one is an independent case
  .loop("eachCustomer", js`$vars.prioritize.output.top`, (body) =>
    body
      // FR-08 case record
      .step("openCase", dataFabricCreate({
        entity: "CsRetentionCase",
        values: {
          RunId: out("newRun"),
          CustomerCode: item("customerCode"),
          CustomerName: item("customerName"),
          ChurnScore: item("churnScore"),
          RiskLevel: item("riskLevel"),
          TopReasons: item("reasons"),
          RevenueAtRisk: item("revenueAtRisk"),
          ScoringMode: v("scoringUsed"),
          TicketEscalated: js`$vars.eachCustomer.currentItem.overdueTicketId !== ""`,
          CaseStatus: "Analyzing",
        },
      }))

      // FR-05 escalate the most overdue ticket of this customer
      .branch(
        "hasOverdueTicket",
        js`$vars.eachCustomer.currentItem.overdueTicketId !== ""`,
        (yes) =>
          yes.step("escalateTicket", dataFabricUpdate({
            entity: "CsTicket",
            record: { byId: item("overdueTicketId") },
            set: {
              TicketStatus: "Escalated",
              Escalated: true,
              EscalationNote: js`"ChurnShield " + $vars.newRun.output + ": pelanggan " + $vars.eachCustomer.currentItem.customerCode +
                " risiko churn " + $vars.eachCustomer.currentItem.churnScore + " (" + $vars.eachCustomer.currentItem.riskLevel +
                "), revenue at risk Rp " + $vars.eachCustomer.currentItem.revenueAtRisk + "/tahun, lewat SLA " +
                $vars.eachCustomer.currentItem.hoursOverdue + " jam. Prioritaskan penanganan."`,
            },
          })),
      )

      // FR-06 AI retention recommendation (inputs prepared as plain references for the agent)
      .step("agentContext", script({
        code: `
          const c = $vars.eachCustomer.currentItem;
          return {
            name: c.customerName, plan: c.servicePlan, fee: String(c.monthlyFee), city: c.city,
            tenure: String(c.tenureMonths), contractLeft: String(c.contractMonthsLeft),
            outages: String(c.outages30d), packetLoss: String(c.avgPacketLoss), latency: String(c.avgLatencyMs),
            complaints: String(c.complaints30d), lastComplaint: c.lastComplaint || "-",
            ticket: c.overdueTicketCode === "" ? "tidak ada" :
              c.overdueTicketCode + " (" + c.overdueTicketCategory + ", lewat SLA " + c.hoursOverdue + " jam, sudah dieskalasi ke NOC)",
            score: String(c.churnScore), level: c.riskLevel, reasons: c.reasons
          };
        `,
        returns: {
          name: "string", plan: "string", fee: "string", city: "string", tenure: "string", contractLeft: "string",
          outages: "string", packetLoss: "string", latency: "string", complaints: "string", lastComplaint: "string",
          ticket: "string", score: "string", level: "string", reasons: "string",
        },
      }))
      .step("recommend", inlineAgent({
        model: MODEL,
        systemPrompt:
          "Kamu adalah analis retensi pelanggan ISP fixed broadband di Indonesia. " +
          "Gunakan HANYA data pelanggan yang diberikan. Jangan menjanjikan hal yang tidak bisa dijamin " +
          "(misalnya 'tidak akan ada gangguan lagi'). Kebijakan penawaran: maksimal diskon 30% selama 3 bulan, " +
          "ATAU upgrade kecepatan gratis 3 bulan, ATAU 1 bulan gratis untuk pelanggan dengan kontrak <= 1 bulan; " +
          "kunjungan teknisi prioritas boleh ditambahkan bila ada gangguan jaringan. Pilih satu penawaran yang paling sesuai. " +
          "Return a result conforming to the output schema. " +
          "riskSummary: 1-2 kalimat ringkasan risiko. " +
          "recommendedAction: langkah retensi yang disarankan untuk tim. " +
          "offer: satu penawaran sesuai kebijakan, spesifik dan singkat. " +
          "followUpMessage: pesan follow-up ke pelanggan dalam Bahasa Indonesia yang sopan dan hangat, mengakui gangguan " +
          "yang dialami, menyebut tindak lanjut teknis bila ada tiket, dan menawarkan offer; maksimal 90 kata, tanpa tanda tangan nama orang.",
        userPrompt:
          "Nama: {{input.name}}\nPaket: {{input.plan}} (Rp {{input.fee}}/bulan)\nKota: {{input.city}}\n" +
          "Lama berlangganan: {{input.tenure}} bulan, sisa kontrak: {{input.contractLeft}} bulan\n" +
          "Gangguan 30 hari: {{input.outages}}, packet loss: {{input.packetLoss}}%, latency: {{input.latency}} ms\n" +
          "Keluhan 30 hari: {{input.complaints}}, keluhan terakhir: {{input.lastComplaint}}\n" +
          "Tiket lewat SLA: {{input.ticket}}\nSkor churn: {{input.score}} ({{input.level}})\nAlasan: {{input.reasons}}",
        inputs: {
          name: out("agentContext", "name"), plan: out("agentContext", "plan"), fee: out("agentContext", "fee"),
          city: out("agentContext", "city"), tenure: out("agentContext", "tenure"),
          contractLeft: out("agentContext", "contractLeft"), outages: out("agentContext", "outages"),
          packetLoss: out("agentContext", "packetLoss"), latency: out("agentContext", "latency"),
          complaints: out("agentContext", "complaints"), lastComplaint: out("agentContext", "lastComplaint"),
          ticket: out("agentContext", "ticket"), score: out("agentContext", "score"),
          level: out("agentContext", "level"), reasons: out("agentContext", "reasons"),
        },
        returns: { riskSummary: "string", recommendedAction: "string", offer: "string", followUpMessage: "string" },
      }))
      .step("markPending", dataFabricUpdate({
        entity: "CsRetentionCase",
        record: { byId: out("openCase", "Id") },
        set: {
          CaseStatus: "Pending Approval",
          RecommendedAction: out("recommend", "recommendedAction"),
          OfferDetail: out("recommend", "offer"),
          FollowUpMessage: out("recommend", "followUpMessage"),
        },
      }))

      // FR-07 human approval: the officer may edit offer and message before approving
      .stepSwitch("retentionReview", hitl({
        title: "ChurnShield: review retention offer",
        priority: "High",
        fields: [
          { id: "customer", label: "Pelanggan", type: "string", direction: "input",
            value: js`$vars.eachCustomer.currentItem.customerCode + " - " + $vars.eachCustomer.currentItem.customerName + " (" + $vars.eachCustomer.currentItem.servicePlan + ", " + $vars.eachCustomer.currentItem.city + ")"` },
          { id: "churnScore", label: "Skor churn", type: "number", direction: "input", value: item("churnScore") },
          { id: "riskLevel", label: "Level risiko", type: "string", direction: "input", value: item("riskLevel") },
          { id: "revenueAtRisk", label: "Revenue at risk (Rp/tahun)", type: "number", direction: "input", value: item("revenueAtRisk") },
          { id: "reasons", label: "Alasan", type: "string", direction: "input", value: item("reasons") },
          { id: "riskSummary", label: "Ringkasan AI", type: "string", direction: "input", value: out("recommend", "riskSummary") },
          { id: "recommendedAction", label: "Rekomendasi tindakan", type: "string", direction: "input", value: out("recommend", "recommendedAction") },
          { id: "offer", label: "Penawaran (boleh diedit)", type: "string", direction: "inOut", value: out("recommend", "offer") },
          { id: "followUpMessage", label: "Pesan follow-up (boleh diedit)", type: "string", direction: "inOut", value: out("recommend", "followUpMessage") },
          { id: "reviewerNote", label: "Catatan reviewer", type: "string", direction: "output" },
        ],
        outcomes: ["Approve Offer", "No Action"],
      }), [
        {
          value: "Approve Offer",
          body: (b) =>
            b.step("approveCase", dataFabricUpdate({
              entity: "CsRetentionCase",
              record: { byId: out("openCase", "Id") },
              set: {
                Decision: "Approved",
                CaseStatus: "Follow-up Ready",
                OfferDetail: out("retentionReview", "offer"),
                FollowUpMessage: out("retentionReview", "followUpMessage"),
                ReviewerNote: out("retentionReview", "reviewerNote"),
              },
            })),
        },
        {
          value: "No Action",
          body: (b) =>
            b.step("closeCase", dataFabricUpdate({
              entity: "CsRetentionCase",
              record: { byId: out("openCase", "Id") },
              set: {
                Decision: "No Action",
                CaseStatus: "Closed - No Action",
                ReviewerNote: out("retentionReview", "reviewerNote"),
              },
            })),
        },
      ]),
    { parallel: true },
  )

  // FR-10 run report, built from what was actually recorded
  .step("readRunCases", dataFabricRead({
    entity: "CsRetentionCase", resultMode: "multiple", limit: 1000,
    filters: [{ field: "RunId", value: out("newRun") }],
    sort: { field: "RevenueAtRisk", direction: "desc" },
  }))
  .step("buildReport", script({
    code: `
      const cases = $vars.readRunCases.output.results || [];
      const p = $vars.prioritize.output;
      const approved = cases.filter((c) => c.Decision === "Approved");
      const noAction = cases.filter((c) => c.Decision === "No Action");
      const escalated = cases.filter((c) => c.TicketEscalated === true);
      const protectedRevenue = approved.reduce((s, c) => s + Number(c.RevenueAtRisk || 0), 0);
      const rp = (n) => "Rp " + String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
      const summary = "ChurnShield " + $vars.newRun.output + ": " + p.scoredCount + " pelanggan dinilai (" +
        $vars.scoringUsed + "), " + p.highRiskCount + " berisiko tinggi dengan revenue at risk " + rp(p.highRiskRevenue) +
        "/tahun. " + cases.length + " kasus diproses: " + escalated.length + " tiket dieskalasi, " + approved.length +
        " penawaran disetujui (" + rp(protectedRevenue) + "/tahun dilindungi), " + noAction.length + " tanpa tindakan." +
        ($vars.scoringNote ? " Catatan: " + $vars.scoringNote + "." : "");
      return {
        summary: summary,
        report: {
          runId: $vars.newRun.output, scoringMode: $vars.scoringUsed, scoringNote: $vars.scoringNote,
          customersScored: p.scoredCount, openTickets: $vars.buildFeatures.output.openTicketCount,
          highRiskCount: p.highRiskCount, revenueAtRisk: p.highRiskRevenue,
          casesProcessed: cases.length, ticketsEscalated: escalated.length,
          offersApproved: approved.length, noAction: noAction.length, revenueProtected: protectedRevenue,
          cases: cases.map((c) => ({
            customer: c.CustomerCode + " " + c.CustomerName, churnScore: c.ChurnScore, riskLevel: c.RiskLevel,
            revenueAtRisk: c.RevenueAtRisk, ticketEscalated: c.TicketEscalated, decision: c.Decision,
            status: c.CaseStatus, offer: c.OfferDetail
          }))
        }
      };
    `,
    returns: { summary: "string", report: "object" },
  }))
  .return({
    runId: out("newRun"),
    scoringModeUsed: v("scoringUsed"),
    summary: out("buildReport", "summary"),
    customersScored: out("prioritize", "scoredCount"),
    highRiskCount: out("prioritize", "highRiskCount"),
    revenueAtRisk: out("prioritize", "highRiskRevenue"),
    report: out("buildReport", "report"),
  })
  .build();
