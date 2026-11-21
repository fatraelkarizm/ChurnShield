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
