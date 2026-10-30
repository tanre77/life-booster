# Mimari

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · **Türkçe** · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Not:** Bu çeviri makine desteklidir. Yetkili sürüm İngilizcedir: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Çeviriler nasıl güncellenir](../TRANSLATIONS.md).

Life Booster bir TanStack Start uygulamasıdır. Sayfalar `src/routes/` içindedir. Veri değişiklikleri [src/lib/life/api.ts](../../src/lib/life/api.ts) içindeki sunucu işlevlerinden geçer. Bir kişinin satırlarını okuyan veya yazan her işlev `authMiddleware` kullanır ve SQL'i `context.userId` ile sınırlar. İstemci asla bir kullanıcı kimliği göndermez.

## İstek yolu

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()`, `migrations/` içindeki bekleyen dosyaları süreç başına bir kez uygular. Dosyalar ada göre sıralıdır. `migrations/auth/` o glob'un içinde değildir. Auth şeması ayrıdır.

## Sayfalar

| Yol | Dosya | Sunucu işlevleri |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, e-posta ve Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, iletiler |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, tarayıcıdaki tema |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | operatör listesi; ilk oturum açan kişi desk'i alabilir |

[src/components/shell.tsx](../../src/components/shell.tsx) içindeki kabuk beş sekmedir. Video tam ekran bir sahnedir ve sekmelerin dolgusunun içinde değildir.

## Veri

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

Göçler:

| Dosya | Ne ekler |
|---|---|
| `0001_auth.sql` | auth tabloları |
| `0002_life_booster.sql` | yukarıdaki tablolar, Venmo ve ilaçlar hariç |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | `sample-%` satırlarını siler |
| `0005_medications.sql` | `medications` |

`0002` eskiden dört örnek akran destekçisi eklerdi. O ekleme gitti. Geri koymayın. `0004` eski `0002`'yi uygulamış veritabanlarında onları siler.

Etiketler (dinler, felsefeler, uzmanlıklar) birleştirme tabloları değil, metin sütunlarında JSON dizeleridir. İzin verilen uzmanlık etiketleri [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts) içindeki `SPECIALTIES` değeridir. Uzmanlık eklemek katalog değişikliğidir, göç değildir.

## People'da kim görünür

`loadDirectory`, `sample-` ile başlayan her `user_id` değerini düşürür. Herkese açık liste bir akran destekçisini yalnızca `standing = 'active'` ise ve en az bir uygunluk bloğu varsa tutar. Saat olmadan bir özgeçmiş kaydetmek onları listelemez. `saveAvailability` sonrasında Studio, `["counselors"]` sorgusunu geçersiz kılar.

Saatler gece yarısından itibaren dakika olarak saklanır. Form, zod `0…1440` denetlemeden önce 30 dakikaya yaslar. Boş bir pencere veya bitişi başlangıçtan sonra olmayan bir pencere atılır. Hiçbir şey kalmadan kaydetmek "Add an hour window for at least one day." fırlatır.

## Ayırtma ve para

`sessionPriceCents`, saatlik ücret çarpı sürenin 60'a bölümüdür. Sponsor kutusu işaretliyse bu fiyat `0.98` ile çarpılır.

`bookAppointment`, `payMethod` olarak `google_pay` veya `venmo` kabul eder. Venmo, ayırtma kartında kurulan bir derin bağlantıdır:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Kullanıcı adı `@` olmadan saklanır ve harflere, rakamlara, `_` ve `-` işaretine indirilir. Venmo OAuth yoktur ve ödeme webhook'u yoktur. `demo_authorized` olan bir `pay_status`, bağlantının açıldığı anlamına gelir; Venmo'nun parayı doğruladığı anlamına gelmez.

Slotlar, akran destekçisinin kendi saat dilimindeki bloklarından, önceden ayrılmış randevular çıkarılınca gelir. Süreler yalnızca 30, 60, 90 ve 120'dir.

## Duygu durumu, notlar, ilaçlar

Üye yalnızca bugünü değil, son yedi günden herhangi birini yazabilir. Grafik ve hafta listesi ikisi de `saveMood`'un yazdığı günü seçer.

Bir akran destekçisi notu ancak şunların hepsi doğruysa görür:

1. Not boş değildir.
2. `mood_entries.share_with_counselors` doğrudur.
3. Randevunun `share_mood` değeri doğrudur.
4. Notun tarihi, görüşme tarihinde biten 14 günün içindedir.

İlaçlar aynı görüşme anahtarını ve kendi paylaşım bayraklarını kullanır. O tarih penceresiyle sınırlı değildirler. Listeyi üye yazdı. Bu bir reçete kaydı değildir.

Bir sütun eklerseniz `getDashboard` duygu durumlarını döndürmeye devam etmelidir. Burada fırlayan bir sorgu, Today'i kayıt başarısız olmuş gibi gösterir. Today sayfası, yeniden getirmeden önce kayıtlı duygu durumunu React Query önbelleğine de yazar; böylece yavaş bir yenileme grafiği temizlemez.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) kamerayı açar, sonra `call_presence` ve `call_signals` sorgular. Üye ve akran destekçisi ikisi de teklif oluşturur. İkisinin de yerel bir teklifi varsa üye kendisininkini tutar, akran destekçisi geri alır ve yanıtlar.

Sayaç `remoteLive` doğru olunca başlar, sonra `durationMin` geri sayar. Kayıt isteğe bağlıdır, yereldedir ve karışık bir akışta `MediaRecorder` kullanır. Yüklenmez.

iPhone, gizli veya sessiz bir video öğesinden uzak sesi çalmaz ve sonraki bir `play()` dokunuşun dışındadır. Uzak `<video>` sessizdir. Ayrı bir `<audio>` öğesi sesi çalar. `play()` reddedilirse oda **Tap to hear** gösterir. Yerel önizleme videosu sessiz kalır ki oda yankı yapmasın.

## Görünüm

Açık varsayılandır. Koyu, `html.dark` koyar ve [src/styles.css](../../src/styles.css) içindeki belirteçleri değiştirir. Seçim You sekmesinden tarayıcıda saklanır ([src/lib/theme.ts](../../src/lib/theme.ts)). Bir veritabanı sütunu değildir.

## Kimlik doğrulama

E-posta ve parola, artı Apple, Better Auth üzerinden. Önizleme barındırıcısının desteklemediği sosyal düğmeler boş bir ekranla değil, görünen bir iletiyle başarısız olmalıdır. Bir kişiye ihtiyaç duyan sunucu işlevleri `authMiddleware` kullanır. İstek gövdesindeki bir kimliğe güvenmeyin.
