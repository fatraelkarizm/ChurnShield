# Sample output (real debug run, synthetic data)

Run `RUN-20261121-043811`, default inputs.

**summary**

> ChurnShield RUN-20261121-043811: 150 pelanggan dinilai (rules), 21 berisiko tinggi dengan revenue at risk Rp 150.600.000/tahun. 5 kasus diproses: 5 tiket dieskalasi, 4 penawaran disetujui (Rp 45.600.000/tahun dilindungi), 1 tanpa tindakan.

| Customer | Churn score | Ticket escalated | Decision | Status | Offer stored |
|---|---|---|---|---|---|
| CUST-0072 Arif Anggraini | 0.87 Very High | Yes (TKT-00024, 30h past SLA) | Approved | Follow-up Ready | Diskon 30% selama 3 bulan + kunjungan teknisi prioritas |
| CUST-0125 Budi Hidayat | 0.79 Very High | Yes (TKT-00044) | Approved (offer edited by reviewer) | Follow-up Ready | Diskon 20% selama 3 bulan + kunjungan teknisi prioritas |
| CUST-0100 Indra Kusuma | 0.90 Very High | Yes (TKT-00032) | Approved | Follow-up Ready | Diskon 30% selama 3 bulan + kunjungan teknisi prioritas |
| CUST-0070 Teguh Saputra | 0.94 Very High | Yes (TKT-00022) | No Action | Closed - No Action | (not offered) |
| CUST-0038 Ayu Nugroho | 0.82 Very High | Yes (TKT-00011) | Approved | Follow-up Ready | Diskon 30% selama 3 bulan + kunjungan teknisi prioritas |

**Example reasons (CUST-0072):** 6 gangguan dalam 30 hari; packet loss rata-rata 5.52%; latency rata-rata 89 ms; 4 keluhan dalam 30 hari; keluhan bernada negatif: "Internet putus-putus setiap malam, sudah lapor 3 kali belum beres"; tiket TKT-00024 lewat SLA 30 jam.

**Example AI follow-up message (CUST-0072, start):** "Selamat siang Bapak/Ibu Arif, kami mohon maaf atas gangguan internet putus-putus setiap malam yang telah dilaporkan beberapa kali dan belum tuntas. Tiket TKT-00024 ..."

**Fallback run** (`scoringMode = external`, unreachable URL): report note "External model failed; rule-based scores were used."

---

## Policy guardrail, supervisor, duplicate protection and SLA (real debug runs, synthetic data)

**Run A** `RUN-20261121-162007`, default inputs, reviewer decisions:

| Customer | Reviewer action | Policy re-check | Supervisor | Stored decision / status |
|---|---|---|---|---|
| CUST-0100 Indra Kusuma | Approve AI offer (1 free month, contract 0 months left) | Compliant | — | Approved / Follow-up Ready |
| CUST-0038 Ayu Nugroho | Edit to "Diskon 20% selama 3 bulan + kunjungan teknisi prioritas" | Compliant | — | Approved / Follow-up Ready |
| CUST-0022 Fajar Ramadhan | Edit to "Diskon 50% selama 6 bulan + kunjungan teknisi prioritas" | Violation: "diskon 50% melebihi batas 30%; durasi 6 bulan melebihi batas 3 bulan" | Approve Exception | Approved (Exception) / Follow-up Ready, PolicyStatus `Exception Approved` |
| CUST-0070 Teguh Saputra | No Action | — | — | No Action / Closed - No Action |

> ChurnShield RUN-20261121-162007: ... 5 kasus baru diproses: 5 tiket dieskalasi, 4 penawaran disetujui (Rp 45.600.000/tahun dilindungi, 1 lewat pengecualian supervisor), 1 tanpa tindakan.

**Run B** `RUN-20261121-162104`, started while Run A's 5 tasks were still open (`approvalSlaHours = 0`, `topN = 3`):

> ... 3 kasus baru diproses: 3 tiket dieskalasi, 2 penawaran disetujui (Rp 22.800.000/tahun dilindungi), 1 tanpa tindakan. 5 pelanggan berisiko dilewati karena sudah punya kasus atau masih masa jeda kontak. 5 approval lewat SLA 0 jam ditandai untuk supervisor.

Skipped: CUST-0070, CUST-0022, CUST-0100, CUST-0072, CUST-0038, each "kasus Pending Approval (RUN-20261121-162007)". Their 5 cases now have `ApprovalOverdue = true`.

**Run C** `RUN-20261121-163102`, `topN = 1`: reviewer edits CUST-0150's offer to "Gratis 2 bulan + upgrade kecepatan".
Supervisor task shows "gratis 2 bulan melebihi batas 1 bulan; bulan gratis hanya untuk kontrak <= 1 bulan (sisa kontrak 2 bulan); menggabungkan lebih dari satu jenis penawaran". Supervisor chooses Reject Offer:

> ... 1 kasus baru diproses: 1 tiket dieskalasi, 0 penawaran disetujui (Rp 0/tahun dilindungi), 1 ditolak supervisor, 0 tanpa tindakan. 8 pelanggan berisiko dilewati karena sudah punya kasus atau masih masa jeda kontak.

Skip reasons in the report: "kasus Follow-up Ready (RUN-...)" for approved customers, "sudah ditangani 0 hari lalu" for closed ones.

**Run D** `RUN-20261121-163305`, `topN = 1`: CUST-0150 (rejected in Run C, never contacted) is picked again; the AI offers "Diskon 30% ... selama 3 bulan ..." (Compliant), approved, Follow-up Ready.
