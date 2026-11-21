# ChurnShield — Skrip Video Demo (target 4 menit, maks. 100 MB MP4)

**Persiapan sebelum rekam**
1. `bash sample-data/reset-demo-data.sh` (tiket kembali Open, kasus lama dihapus).
2. Buka VS Code: `ChurnShield/ChurnShield.flow` di canvas Maestro.
3. Buka tab browser: Action Center (Tasks) dan Data Fabric (entity `CsRetentionCase`, `CsTicket`).
4. Rekam layar 1080p, mikrofon untuk voiceover.

| Waktu | Layar | Narasi (voiceover) |
|---|---|---|
| 0:00–0:20 | Slide judul | "Ini ChurnShield. ISP sering terlambat tahu pelanggan mana yang akan berhenti, karena data jaringan, tiket, dan langganan terpisah." |
| 0:20–0:45 | Canvas flow | "Alurnya dijalankan UiPath Maestro: baca data paralel, skor risiko, prioritas berdasarkan revenue, eskalasi tiket, rekomendasi AI, cek kebijakan, lalu approval manusia." |
| 0:45–1:00 | Data Fabric `CsCustomer`, `CsTicket` | "Ini data sintetis: 150 pelanggan dan 52 tiket terbuka, sebagian sudah lewat SLA." |
| 1:00–1:15 | Klik Run/Debug di VS Code (input default) | "Saya jalankan dengan pengaturan default: skor minimal 0,6, lima pelanggan teratas." |
| 1:15–1:35 | Data Fabric `CsTicket` di-refresh | "Tiket pelanggan prioritas yang lewat SLA sudah berstatus Escalated, lengkap dengan catatan skor risiko dan revenue." |
| 1:35–2:15 | Action Center: buka satu task | "Untuk setiap pelanggan muncul satu task: skor, alasan, revenue at risk, rekomendasi AI, dan hasil cek kebijakan untuk draf AI. Saya turunkan diskon ke 20%, lalu Approve." Task lain: satu Approve apa adanya, satu No Action. |
| 2:15–2:55 | Task berikutnya: ubah penawaran jadi "Diskon 50% selama 6 bulan", Approve → task supervisor muncul | "Kalau reviewer memberi penawaran di luar kebijakan, ChurnShield tidak langsung meloloskannya. Versi yang disetujui dicek ulang, dan muncul task supervisor dengan daftar pelanggarannya. Supervisor yang memutuskan: beri pengecualian dengan alasan, atau tolak." Pilih Approve Exception (atau Reject Offer). |
| 2:55–3:25 | Output run (`summary`) + `CsRetentionCase` | "Laporan run: pelanggan dinilai, berisiko, revenue at risk, tiket dieskalasi, penawaran disetujui, dan pengecualian supervisor. Semua keputusan dan catatan tersimpan di Data Fabric." |
| 3:25–3:45 | Jalankan lagi dengan `topN = 3` | "Kalau dijalankan lagi, pelanggan yang sudah punya kasus atau baru dihubungi tidak diproses ulang. Alasannya tercatat di laporan, jadi tidak ada task ganda dan pelanggan tidak di-spam." |
| 3:45–4:00 | Slide penutup | "AI menyiapkan, aturan membatasi, manusia memutuskan." |

**Opsional (kalau waktu cukup):** run dengan `scoringMode=external` + URL salah untuk menunjukkan fallback ke skor rules.

**Catatan kejujuran untuk narasi:** sebut bahwa data sintetis, model ML belum disambungkan (slot + fallback), email follow-up belum dikirim (status berhenti di Follow-up Ready), dan task yang lewat SLA ditandai, bukan dibatalkan otomatis.
