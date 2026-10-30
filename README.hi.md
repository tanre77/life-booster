# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · **हिन्दी** · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **नोट:** यह अनुवाद मशीन की सहायता से है। अंग्रेज़ी आधिकारिक संस्करण है: [README.md](README.md).

[अनुवाद कैसे अपडेट होते हैं](docs/TRANSLATIONS.md).

आप कैसा महसूस करते हैं, उसका एक सप्ताह, और बात करने के लिए कोई। सदस्य मूड दर्ज करते हैं, नोट रखते हैं, दवाओं की सूची बनाते हैं, और 30, 60, 90 या 120 मिनट की वीडियो भेंट बुक करते हैं। काउंसलर (ऐप में: counselors) प्रोफ़ाइल, घंटे और Venmo उपयोगकर्ता नाम प्रकाशित करते हैं।

यह सहकर्मी सहायता है। काउंसलर लाइसेंसशुदा चिकित्सक, मनोवैज्ञानिक, मनोचिकित्सक या चिकित्सा प्रदाता नहीं हैं। भेंट चिकित्सा, निदान या उपचार नहीं है। Life Booster सलाह के लिए उत्तरदायी नहीं है और बिना सूचना काउंसलर को हटा सकता है। संकट में 988 पर कॉल करें या संदेश भेजें।

## आप क्या कर सकते हैं

| टैब | कौन | क्या |
|---|---|---|
| Today | सदस्य | इस सप्ताह का कोई भी दिन दर्ज करें, औसत देखें, दवाएँ जोड़ें |
| Library | कोई भी साइन-इन व्यक्ति | विषय के अनुसार अभ्यास, फॉलो करने के काउंसलर, भेंट बुक करना |
| Visits | दोनों | आने वाली और पिछली अपॉइंटमेंट, फिर वीडियो कमरा |
| Studio | काउंसलर | परिचय, विशेषज्ञताएँ, घंटे की दर, घंटे, Venmo उपयोगकर्ता नाम |
| You | साइन-इन | दिखाया जाने वाला नाम, हल्की या गहरी दिखावट |

साइन-इन ईमेल और पासवर्ड से है, या Apple से। नोट और दवाएँ तब तक निजी रहती हैं जब तक सदस्य उन्हें साझा करने योग्य न चिह्नित करे और उस भेंट के लिए साझाकरण चालू न करे।

## भुगतान

बुकिंग काउंसलर के उपयोगकर्ता नाम पर Venmo भुगतान लिंक खोलती है (`venmo.com`, `txn=pay`)। यह व्यापारी कनेक्शन नहीं है और भुगतान की पुष्टि नहीं करता। Google Pay ब्राउज़र की Payment Request API से दूसरा विकल्प है। बुकिंग स्क्रीन पर Apple Pay नहीं दिया जाता।

वैकल्पिक प्रायोजक छूट 2% है (`AD_DISCOUNT`, [src/lib/life/money.ts](src/lib/life/money.ts) में)। दरें $15 से $400 प्रति घंटा हैं।

## चलाना

```bash
npm run dev
```

ऐप पोर्ट 8080 पर सुनता है। `npm run typecheck` और `npm run build` दोनों सफल होने चाहिए। स्कीमा बदलाव [migrations/](migrations/) के नीचे नई फ़ाइल में जाते हैं। पहले से जारी माइग्रेशन को संपादित न करें, सिवाय उसे डेटा दोबारा सीड करने से रोकने के।

`DATABASE_URL` के बिना सर्वर एम्बेडेड Postgres (PGLite) इस्तेमाल करता है और शुरू होते समय [migrations/](migrations/) लागू करता है। `DATABASE_URL` के साथ `npm run db:migrate` वही फ़ाइलें Neon पर लागू करता है।

## विन्यास

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

वही मार्गदर्शिका, हिन्दी में: [वास्तुकला](docs/hi/ARCHITECTURE.md) और [प्रॉम्प्ट](docs/hi/PROMPTS.md)।

शाखाएँ `main`, `web`, `ios` और `android` एक ही कमिट पर रहती हैं। चारों को एक साथ पुश करें।

## उत्पाद नियम जो आसानी से टूटते हैं

- काउंसलर People में तभी दिखता है जब उसका `standing` `active` हो और कम से कम एक घंटा सहेजा गया हो।
- घंटे सप्ताह का दिन `0` (रविवार) से `6` हैं, 30 मिनट पर टिके हुए, और अंत शुरुआत के बाद होना चाहिए।
- नमूना काउंसलर सीड न करें (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`)।
- साझाकरण दो स्विच हैं: नोट या दवा साझा करने योग्य चिह्नित है, और भेंट में `share_mood` है। एक भी बंद हो तो काउंसलर उसे नहीं देखता।
- भेंट का टाइमर तब शुरू होता है जब दूसरा व्यक्ति जुड़ता है, और बुक की गई अवधि की उलटी गिनती करता है।
- iPhone दूसरे व्यक्ति की आवाज़ अपने अलग ऑडियो तत्व पर बजाता है। दूर का वीडियो म्यूट रहता है ताकि आवाज़ छिपी तस्वीर पर अटकी न रहे।
