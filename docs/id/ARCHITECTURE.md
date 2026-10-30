# Arsitektur

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · **Bahasa Indonesia** · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Catatan:** Terjemahan ini dibantu mesin. Bahasa Inggris adalah versi yang berlaku: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Cara memperbarui terjemahan](../TRANSLATIONS.md).

Life Booster adalah aplikasi TanStack Start. Halaman ada di `src/routes/`. Perubahan data lewat fungsi server di [src/lib/life/api.ts](../../src/lib/life/api.ts). Setiap fungsi yang membaca atau menulis baris seseorang memakai `authMiddleware` dan membatasi SQL dengan `context.userId`. Klien tidak pernah mengirim id pengguna.

## Jalur permintaan

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` menerapkan berkas yang tertunda dari `migrations/` sekali tiap proses. Berkas diurutkan menurut nama. `migrations/auth/` tidak ada dalam glob itu. Skema auth terpisah.

## Halaman

| Rute | Berkas | Fungsi server |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, email, dan Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, pesan |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, tema di peramban |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | daftar operator; orang pertama yang masuk dapat mengambil desk |

Kulit di [src/components/shell.tsx](../../src/components/shell.tsx) adalah lima tab. Video adalah panggung layar penuh dan tidak berada di dalam pengisi tab.

## Data

```text
profiles              display name, operator flag
mood_entries          one row per user per date, mood 1–5, note, share flag
medications           name, dose, when taken, share flag
counselor_profiles    bio, tags as JSON text, rate, timezone, venmo, standing
availability_blocks   weekday + start_min + end_min, cascade on counselor delete
appointments          member, counselor, start, duration, price, pay, share_mood
reviews               one per appointment
session_messages      chat on an appointment
call_signals          WebRTC offer, answer, ice
call_presence         who has the room open
```

Migrasi:

| Berkas | Yang ditambahkan |
|---|---|
| `0001_auth.sql` | tabel auth |
| `0002_life_booster.sql` | tabel di atas, kecuali Venmo dan obat |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | menghapus baris `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` dulu menyisipkan empat pendamping contoh. Sisipan itu sudah hilang. Jangan kembalikan. `0004` menghapus mereka di basis data yang sudah menerapkan `0002` lama.

Tag (agama, filsafat, keahlian) adalah string JSON di kolom teks, bukan tabel gabung. Label keahlian yang diizinkan adalah `SPECIALTIES` di [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Menambah keahlian adalah perubahan katalog, bukan migrasi.

## Siapa yang muncul di People

`loadDirectory` membuang setiap `user_id` yang diawali `sample-`. Daftar publik hanya menyimpan pendamping bila `standing = 'active'` dan ada sedikitnya satu blok ketersediaan. Menyimpan biografi tanpa jam tidak memasukkan mereka. Setelah `saveAvailability`, Studio membatalkan kueri `["counselors"]`.

Jam disimpan sebagai menit sejak tengah malam. Formulir menjepit ke 30 menit sebelum zod memeriksa `0…1440`. Jendela kosong, atau akhir yang tidak sesudah awal, dibuang. Menyimpan saat tidak ada yang tersisa melempar "Add an hour window for at least one day."

## Pemesanan dan uang

`sessionPriceCents` adalah tarif per jam kali durasi, dibagi 60. Jika kotak sponsor dicentang, harga itu dikalikan `0.98`.

`bookAppointment` menerima `payMethod` berupa `google_pay` atau `venmo`. Venmo adalah tautan dalam yang disusun di kartu pemesanan:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Nama pengguna disimpan tanpa `@` dan dipotong menjadi huruf, angka, `_`, dan `-`. Tidak ada OAuth Venmo dan tidak ada webhook pembayaran. `pay_status` bernilai `demo_authorized` berarti tautan dibuka, bukan bahwa Venmo mengonfirmasi uangnya.

Slot berasal dari blok pendamping di zona waktunya, dikurangi janji yang sudah dipesan. Durasi hanya 30, 60, 90, dan 120.

## Suasana hati, catatan, obat

Anggota dapat menulis salah satu dari tujuh hari terakhir, tidak hanya hari ini. Bagan dan daftar minggu sama-sama memilih hari yang ditulis `saveMood`.

Pendamping melihat catatan hanya bila semua ini benar:

1. Catatan tidak kosong.
2. `mood_entries.share_with_counselors` benar.
3. `share_mood` janji itu benar.
4. Tanggal catatan berada dalam 14 hari yang berakhir pada tanggal kunjungan.

Obat memakai sakelar kunjungan yang sama ditambah bendera berbagi sendiri. Mereka tidak dibatasi jendela tanggal itu. Anggota yang menulis daftar itu. Ini bukan catatan resep.

`getDashboard` harus tetap mengembalikan suasana hati jika kamu menambah kolom. Kueri yang melempar di sini membuat Today tampak seperti penyimpanan gagal. Halaman Today juga menulis suasana hati yang tersimpan ke cache React Query sebelum mengambil ulang, jadi penyegaran yang lambat tidak mengosongkan bagan.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) membuka kamera, lalu menanyakan `call_presence` dan `call_signals`. Anggota dan pendamping sama-sama membuat tawaran. Jika keduanya punya tawaran lokal, anggota menyimpan miliknya dan pendamping mengembalikan lalu menjawab.

Pewaktu mulai saat `remoteLive` menjadi benar, lalu menghitung mundur `durationMin`. Rekaman bersifat opsional, lokal, dan memakai `MediaRecorder` pada aliran campuran. Rekaman tidak diunggah.

iPhone tidak memutar audio jarak jauh dari elemen video yang tersembunyi atau dibisukan, dan `play()` yang belakangan berada di luar ketukan. `<video>` jarak jauh dibisukan. Elemen `<audio>` terpisah memutar suara. Jika `play()` ditolak, ruang menampilkan **Tap to hear**. Video pratinjau lokal tetap bisu supaya ruang tidak bergema.

## Tampilan

Terang adalah bawaan. Gelap memasang `html.dark` dan menukar token di [src/styles.css](../../src/styles.css). Pilihan disimpan di peramban dari tab You ([src/lib/theme.ts](../../src/lib/theme.ts)). Ini bukan kolom basis data.

## Autentikasi

Email dan kata sandi, plus Apple, lewat Better Auth. Tombol sosial yang tidak didukung host pratinjau harus gagal dengan pesan yang terlihat, bukan layar kosong. Fungsi server yang membutuhkan seseorang memakai `authMiddleware`. Jangan percaya id dari badan permintaan.
