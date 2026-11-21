# ChurnShield — Skrip Video Demo (target 3–4 menit, maks. 100 MB MP4)

**Persiapan sebelum rekam**
1. `bash sample-data/reset-demo-data.sh` (tiket kembali Open, kasus lama dihapus).
2. Buka VS Code: `ChurnShield/ChurnShield.flow` di canvas Maestro.
3. Buka tab browser: Action Center (Tasks) dan Data Fabric (entity `CsRetentionCase`, `CsTicket`).
4. Rekam layar 1080p, mikrofon untuk voiceover.

| Waktu | Layar | Narasi (voiceover) |
|---|---|---|
| 0:00–0:20 | Slide judul | "Ini ChurnShield. ISP sering terlambat tahu pelanggan mana yang akan berhenti, karena data jaringan, tiket, dan langganan terpisah." |
| 0:20–0:45 | Canvas flow | "Alurnya dijalankan UiPath Maestro: baca data paralel, skor risiko, prioritas berdasarkan revenue, eskalasi tiket, rekomendasi AI, lalu approval manusia." |
| 0:45–1:05 | Data Fabric `CsCustomer`, `CsTicket` | "Ini data sintetis: 150 pelanggan dan 52 tiket terbuka, sebagian sudah lewat SLA." |
| 1:05–1:25 | Klik Run/Debug di VS Code (input default) | "Saya jalankan dengan pengaturan default: skor minimal 0,6, lima pelanggan teratas." |
| 1:25–1:50 | Data Fabric `CsTicket` di-refresh | "Dalam hitungan detik, tiket pelanggan prioritas yang lewat SLA sudah berstatus Escalated, lengkap dengan catatan skor risiko dan revenue." |
| 1:50–2:40 | Action Center: buka satu task | "Untuk setiap pelanggan muncul satu task. Ada skor, alasan, revenue at risk, rekomendasi AI, dan pesan follow-up. Saya ubah diskon dari 30% ke 20%, lalu Approve. Untuk satu pelanggan lain saya pilih No Action." (selesaikan semua task) |
| 2:40–3:10 | Output run (`summary`) + `CsRetentionCase` | "Laporan run: berapa pelanggan dinilai, berapa berisiko, revenue at risk, tiket dieskalasi, dan penawaran disetujui. Penawaran 20% yang saya edit tersimpan di Data Fabric." |
| 3:10–3:30 | (opsional) Run dengan `scoringMode=external` + URL salah | "Kalau model ML milik ISP tidak bisa diakses, ChurnShield tetap jalan dengan skor rules dan mencatat fallback-nya." |
| 3:30–3:45 | Slide penutup | "Deteksi lebih awal, perbaiki dulu, tawarkan yang tepat, dengan manusia tetap memegang keputusan." |

**Catatan kejujuran untuk narasi:** sebut bahwa data sintetis, model ML belum disambungkan (slot + fallback), dan email follow-up belum dikirim (status berhenti di Follow-up Ready).
