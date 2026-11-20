# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · **Bahasa Indonesia** · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Catatan:** Terjemahan ini dibantu mesin. Bahasa Inggris adalah versi yang berlaku: [README.md](README.md).

[Cara memperbarui terjemahan](docs/TRANSLATIONS.md).

Seminggu tentang bagaimana perasaanmu, dan seseorang untuk diajak bicara. Anggota mencatat suasana hati, menyimpan catatan, mendaftar obat, dan memesan kunjungan video 30, 60, 90, atau 120 menit. Pendamping (di aplikasi: counselors) menerbitkan profil, jam, dan nama pengguna Venmo.

Ini dukungan sebaya. Pendamping bukan terapis berlisensi, psikolog, psikiater, atau penyedia medis. Kunjungan bukan terapi, diagnosis, atau pengobatan. Life Booster tidak bertanggung jawab atas saran dan dapat memberhentikan pendamping tanpa pemberitahuan. Dalam krisis, telepon atau kirim pesan ke 988.

## Yang bisa kamu lakukan

| Tab | Siapa | Apa |
|---|---|---|
| Today | Anggota | Catat hari apa pun minggu ini, lihat rata-rata, tambah obat |
| Library | Siapa pun yang masuk | Latihan menurut topik, pendamping untuk diikuti, pesan kunjungan |
| Visits | Keduanya | Janji yang akan datang dan yang lalu, lalu ruang video |
| Studio | Pendamping | Biografi, keahlian, tarif per jam, jam, nama pengguna Venmo |
| You | Sudah masuk | Nama tampilan, tampilan terang atau gelap |

Masuk memakai email dan kata sandi, atau Apple. Catatan dan obat tetap pribadi sampai anggota menandainya dapat dibagikan dan menyalakan berbagi untuk kunjungan itu.

## Bayar

Pemesanan membuka tautan bayar Venmo ke nama pengguna pendamping (`venmo.com`, `txn=pay`). Itu bukan sambungan pedagang dan tidak mengonfirmasi pembayaran. Google Pay adalah pilihan kedua lewat Payment Request API peramban. Apple Pay tidak ditawarkan di layar pemesanan.

Diskon sponsor opsional adalah 2% (`AD_DISCOUNT` di [src/lib/life/money.ts](src/lib/life/money.ts)). Tarif $15 sampai $400 per jam.

## Menjalankan

```bash
npm run dev
```

Aplikasi mendengarkan di port 8080. `npm run typecheck` dan `npm run build` keduanya harus lulus. Perubahan skema ditaruh di berkas baru di bawah [migrations/](migrations/). Jangan sunting migrasi yang sudah dirilis, kecuali untuk menghentikannya menanam data lagi.

Tanpa `DATABASE_URL`, server memakai Postgres tertanam (PGLite) dan menerapkan [migrations/](migrations/) saat mulai. Dengan `DATABASE_URL`, `npm run db:migrate` menerapkan berkas yang sama ke Neon.

## Tata letak

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Panduan yang sama, dalam bahasa Indonesia: [arsitektur](docs/id/ARCHITECTURE.md) dan [prompt](docs/id/PROMPTS.md).

Cabang `main`, `web`, `ios`, dan `android` dijaga pada commit yang sama. Push keempatnya bersama-sama.

## Aturan produk yang mudah rusak

- Pendamping muncul di People hanya jika `standing` adalah `active` dan ada sedikitnya satu jam tersimpan.
- Jam adalah hari dalam pekan `0` (Minggu) sampai `6`, dijepit ke 30 menit, dan akhir harus sesudah awal.
- Jangan menanam pendamping contoh (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Berbagi adalah dua sakelar: catatan atau obat ditandai dapat dibagikan, dan kunjungan memiliki `share_mood`. Salah satu mati berarti pendamping tidak melihatnya.
- Pewaktu kunjungan mulai saat orang lain bergabung, dan menghitung mundur durasi yang dipesan.
- iPhone memutar suara orang lain pada elemen audio sendiri. Video jarak jauh tetap bisu supaya suara tidak tersangkut pada gambar yang tersembunyi.
