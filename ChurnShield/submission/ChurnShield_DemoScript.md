# ChurnShield — Skrip Video Demo (target 4 menit, maks. 100 MB MP4)

**Tokoh cerita:** Ibu Ayu Nugroho (CUST-0038, data sintetis). Keluhan terakhirnya: *"Udah seminggu lemot parah tiap malam, mending cabut aja kalau gini terus."* Paket BizNet Office 100 Mbps, revenue Rp 11,4 juta/tahun. Setelah reset data, Ibu Ayu selalu masuk lima besar.

**Persiapan sebelum rekam**
1. `bash sample-data/reset-demo-data.sh` (tiket kembali Open, kasus lama dihapus).
2. Kosongkan inbox demo (Gmail test), lalu buka di tab browser.
3. Tab lain: Action Center (Tasks), Data Fabric (`CsCustomer`, `CsTicket`, `CsRetentionCase`).
4. VS Code: buka canvas `ChurnShield.flow` hanya untuk dilihat; **jangan disimpan** (canvas yang disimpan menghapus binding Gmail).
5. Input run: default + `demoInbox` = alamat inbox demo.
6. Rekam 1080p dengan voiceover. **Potong** bagian menunggu: run berjalan sekitar 1 menit sampai task muncul, dan email masuk beberapa detik setelah approve.

| Waktu | Layar | Narasi (voiceover) |
|---|---|---|
| 0:00–0:25 | Data Fabric `CsCustomer`, baris Ibu Ayu, kolom keluhan disorot | "Ibu Ayu sudah seminggu internetnya lemot tiap malam. Keluhan terakhirnya: 'mending cabut aja kalau gini terus.' Tiket gangguannya lewat SLA. Datanya ada, tapi tersebar di tiga sistem: jaringan, tiket, dan billing. Tidak ada yang menghubungkannya, dan bulan depan Rp 11,4 juta per tahun bisa pergi. Untuk ISP seperti HiFi, ini terjadi setiap hari." |
| 0:25–0:40 | Canvas flow (zoom out) | "Ini ChurnShield, satu alur di UiPath Maestro: baca data, AI membaca keluhan, skor risiko, eskalasi ke NOC, rekomendasi AI, cek kebijakan, keputusan manusia, lalu email." |
| 0:40–0:55 | Klik Run di VS Code (potong saat menunggu) | "Alur ini punya jadwal harian jam 07.00 yang aktif setelah deploy. Untuk demo saya jalankan manual sekarang." |
| 0:55–1:15 | Inbox: email "[untuk NOC] Eskalasi TKT-…" | "Tiket Ibu Ayu langsung dieskalasi, dan NOC menerima email: skor risiko, revenue, berapa jam lewat SLA, dan alasannya. NOC tahu kenapa tiket ini harus didahulukan." |
| 1:15–1:45 | Action Center: task Ibu Ayu, sorot alasan "AI: keluhan menunjukkan niat berhenti" | "Tim retensi menerima satu task per pelanggan. AI membaca keluhan Ibu Ayu dan menangkap niat berhentinya, padahal kalimat seperti ini lolos dari daftar kata kunci. Ada draf penawaran AI, dan hasil cek kebijakannya." |
| 1:45–2:35 | Reviewer set Diskon 50%, 6 bulan, Approve → task supervisor | "Reviewer ingin memberi lebih: diskon 50% selama 6 bulan. ChurnShield tidak langsung meloloskannya. Penawaran dan isi pesannya dicek ulang, lalu supervisor menerima task dengan daftar pelanggarannya. Supervisor memutuskan dan menulis alasannya." Pilih Approve Exception. |
| 2:35–2:55 | Inbox: email "[untuk pelanggan …] Tindak lanjut layanan internet Anda" | "Begitu disetujui, email follow-up terkirim ke pelanggan: permintaan maaf, tindak lanjut teknis, dan penawaran yang disetujui. Tidak ada pelanggan dihubungi tanpa keputusan manusia." |
| 2:55–3:35 | Selesaikan task lain (approve / No Action), lalu inbox: email "[untuk manajer retensi] Laporan harian" | "Manajer menerima laporan harian: 150 pelanggan dinilai, 21 berisiko tinggi, Rp 150 juta revenue at risk, tiket yang dieskalasi, dan revenue yang ditawari retensi. Ada juga peringatan dini: pelanggan yang skornya masih rendah tapi sudah bertanya cara berhenti langganan." |
| 3:35–3:50 | Data Fabric `CsRetentionCase` | "Semua keputusan, catatan reviewer dan supervisor, serta status pengiriman tersimpan sebagai jejak audit." |
| 3:50–4:00 | Slide penutup | "AI membaca dan menyiapkan, aturan membatasi, manusia memutuskan." |

**Kalau ditanya juri (jangan dimasukkan ke video):** pelanggan yang sudah punya kasus tidak diproses ulang; kalau AI atau email gagal, kasusnya ditandai dan run tetap jalan; model ML milik ISP bisa disambungkan lewat slot external.

**Catatan kejujuran untuk narasi:** sebut bahwa data dan kalimat keluhannya sintetis (kami tulis sendiri), semua email demo dikirim ke satu inbox uji (subjeknya menyebut penerima sebenarnya), bobot skor belum dikalibrasi ke data churn asli, dan model ML belum disambungkan (slot + fallback).
