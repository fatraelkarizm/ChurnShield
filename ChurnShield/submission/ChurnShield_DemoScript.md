# ChurnShield — Skrip Video Demo (target 4 menit, maks. 100 MB MP4)

**Persiapan sebelum rekam**
1. `bash sample-data/reset-demo-data.sh` (tiket kembali Open, kasus lama dihapus).
2. Buka VS Code: `ChurnShield/ChurnShield.flow` di canvas Maestro.
3. Buka tab browser: Action Center (Tasks) dan Data Fabric (entity `CsRetentionCase`, `CsTicket`, `CsCustomer`).
4. Rekam layar 1080p, mikrofon untuk voiceover.

| Waktu | Layar | Narasi (voiceover) |
|---|---|---|
| 0:00–0:20 | Slide judul | "Ini ChurnShield. ISP sering terlambat tahu pelanggan mana yang akan berhenti, karena data jaringan, tiket, dan langganan terpisah." |
| 0:20–0:40 | Canvas flow | "Alurnya dijalankan UiPath Maestro: baca data paralel, AI membaca keluhan, skor risiko, prioritas berdasarkan revenue, eskalasi tiket, rekomendasi AI, cek kebijakan, lalu approval manusia." |
| 0:40–0:55 | Data Fabric `CsCustomer`, kolom `LastComplaint` | "Data sintetis: 150 pelanggan, 52 tiket terbuka. Keluhannya ditulis apa adanya, misalnya 'mending cabut aja kalau gini terus'. Daftar kata kunci tidak menangkap kalimat seperti ini, AI menangkapnya." |
| 0:55–1:10 | Klik Run/Debug di VS Code (input default) | "Saya jalankan dengan pengaturan default: skor minimal 0,6, lima pelanggan teratas." |
| 1:10–1:25 | Data Fabric `CsTicket` di-refresh | "Tiket pelanggan prioritas yang lewat SLA sudah berstatus Escalated, lengkap dengan catatan skor risiko dan revenue." |
| 1:25–2:05 | Action Center: buka satu task | "Setiap pelanggan punya satu task: skor, alasan (termasuk hasil baca keluhan oleh AI), revenue at risk, draf penawaran AI, dan hasil cek kebijakannya. Penawaran bukan teks bebas: jenisnya dipilih dari dropdown, persen dan bulannya angka. Saya ubah jadi Diskon 20% selama 3 bulan, sesuaikan pesannya, lalu Approve." Task lain: satu Approve apa adanya, satu No Action. |
| 2:05–2:45 | Task berikutnya: set Diskon 50%, 6 bulan, Approve → task supervisor muncul | "Kalau reviewer memberi penawaran di luar kebijakan, ChurnShield tidak langsung meloloskannya. Versi yang disetujui dicek ulang, termasuk isi pesannya, jadi pesan yang menjanjikan lebih dari penawaran juga tertangkap. Muncul task supervisor dengan daftar pelanggarannya; supervisor memutuskan: beri pengecualian dengan alasan, atau tolak." Pilih Approve Exception (atau Reject Offer). |
| 2:45–3:20 | Output run (`summary`, `report.earlyWarningIntent`) + `CsRetentionCase` | "Laporan run: pelanggan dinilai, berisiko, revenue at risk, tiket dieskalasi, penawaran disetujui, dan revenue yang ditawari retensi. Kami sengaja tidak menyebutnya revenue terselamatkan, karena hasil akhirnya belum dilacak. Ada juga peringatan dini: pelanggan yang skornya masih rendah tapi sudah bertanya cara berhenti langganan." |
| 3:20–3:45 | Jalankan lagi dengan `topN = 3` | "Kalau dijalankan lagi, pelanggan yang sudah punya kasus atau baru dihubungi tidak diproses ulang, jadi tidak ada task ganda. Kalau AI gagal untuk satu pelanggan, kasusnya masuk review manual dan pelanggan lain tetap jalan." |
| 3:45–4:00 | Slide penutup | "AI membaca dan menyiapkan, aturan membatasi, manusia memutuskan." |

**Opsional (kalau waktu cukup):** run dengan `scoringMode=external` + URL salah untuk menunjukkan fallback ke skor rules.

**Catatan kejujuran untuk narasi:** sebut bahwa data dan kalimat keluhannya sintetis (kami tulis sendiri), bobot skor ditentukan dari penilaian domain dan belum dikalibrasi ke data churn asli, model ML belum disambungkan (slot + fallback), email follow-up belum dikirim (status berhenti di Follow-up Ready), dan task yang lewat SLA ditandai, bukan dibatalkan otomatis.
