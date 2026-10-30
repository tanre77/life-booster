# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · **Türkçe** · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Not:** Bu çeviri makine desteklidir. Yetkili sürüm İngilizcedir: [README.md](README.md).

[Çeviriler nasıl güncellenir](docs/TRANSLATIONS.md).

Nasıl hissettiğinin bir haftası ve konuşacak birisi. Üyeler bir duygu durumu kaydeder, not tutar, ilaçları listeler ve 30, 60, 90 veya 120 dakikalık bir video görüşmesi ayırtır. Akran destekçileri (uygulamadaki ad: counselors) bir profil, saatler ve bir Venmo kullanıcı adı yayımlar.

Bu akran desteğidir. Akran destekçileri lisanslı terapist, psikolog, psikiyatrist veya sağlık hizmeti sunucusu değildir. Bir görüşme terapi, tanı veya tedavi değildir. Life Booster tavsiyeden sorumlu değildir ve bir akran destekçisini haber vermeden kaldırabilir. Krizde 988'i ara veya mesaj gönder.

## Ne yapabilirsin

| Sekme | Kim | Ne |
|---|---|---|
| Today | Üye | Bu haftanın herhangi bir gününü kaydet, ortalamayı gör, ilaç ekle |
| Library | Oturum açmış herkes | Konuya göre uygulamalar, izlenecek akran destekçileri, görüşme ayırtma |
| Visits | İkisi de | Gelecek ve geçmiş randevular, sonra video odası |
| Studio | Akran destekçisi | Özgeçmiş, uzmanlıklar, saatlik ücret, saatler, Venmo kullanıcı adı |
| You | Oturum açık | Görünen ad, açık veya koyu görünüm |

Oturum açma e-posta ve paroladır, ya da Apple. Notlar ve ilaçlar, üye onları paylaşılabilir işaretleyip o görüşme için paylaşımı açana kadar gizli kalır.

## Ödeme

Ayırtma, akran destekçisinin kullanıcı adına bir Venmo ödeme bağlantısı açar (`venmo.com`, `txn=pay`). Bu bir satıcı bağlantısı değildir ve ödemeyi doğrulamaz. Google Pay, tarayıcının Payment Request API'si üzerinden ikinci seçenektir. Apple Pay ayırtma ekranında sunulmaz.

İsteğe bağlı sponsor indirimi %2'dir (`AD_DISCOUNT`, [src/lib/life/money.ts](src/lib/life/money.ts) içinde). Ücretler saatte $15 ile $400 arasındadır.

## Çalıştırma

```bash
npm run dev
```

Uygulama 8080 portunu dinler. `npm run typecheck` ve `npm run build` ikisi de geçmelidir. Şema değişiklikleri [migrations/](migrations/) altında yeni bir dosyaya konur. Yayımlanmış bir göçü, veriyi yeniden tohumlamasını durdurmak dışında düzenleme.

`DATABASE_URL` yoksa sunucu gömülü Postgres (PGLite) kullanır ve başlangıçta [migrations/](migrations/) uygular. `DATABASE_URL` varsa `npm run db:migrate` aynı dosyaları Neon'a uygular.

## Yerleşim

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Aynı rehber, Türkçe: [mimari](docs/tr/ARCHITECTURE.md) ve [istemler](docs/tr/PROMPTS.md).

`main`, `web`, `ios` ve `android` dalları aynı commit'te tutulur. Dördünü birlikte push et.

## Kolay bozulan ürün kuralları

- Bir akran destekçisi People'da ancak `standing` değeri `active` ise ve kayıtlı en az bir saati varsa görünür.
- Saatler haftanın günü `0` (Pazar) ile `6` arasındadır, 30 dakikaya yaslanır ve bitiş başlangıçtan sonra olmalıdır.
- Örnek akran destekçilerini tohumlama (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Paylaşım iki anahtardır: not veya ilaç paylaşılabilir işaretlidir ve görüşmede `share_mood` vardır. Biri kapalıysa akran destekçisi onu görmez.
- Görüşme sayacı karşıdaki kişi katılınca başlar ve ayrılan süreyi geri sayar.
- iPhone karşıdaki kişinin sesini kendi audio öğesinde çalar. Uzak video sessiz kalır; böylece ses gizli bir görüntüde takılı kalmaz.
