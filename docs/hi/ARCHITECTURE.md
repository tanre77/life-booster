# वास्तुकला

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · **हिन्दी** · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **नोट:** यह अनुवाद मशीन की सहायता से है। अंग्रेज़ी आधिकारिक संस्करण है: [ARCHITECTURE.md](../ARCHITECTURE.md).

[अनुवाद कैसे अपडेट होते हैं](../TRANSLATIONS.md).

Life Booster एक TanStack Start ऐप है। पेज `src/routes/` में हैं। डेटा बदलाव [src/lib/life/api.ts](../../src/lib/life/api.ts) की सर्वर फ़ंक्शन से गुजरते हैं। किसी व्यक्ति की पंक्तियाँ पढ़ने या लिखने वाला हर फ़ंक्शन `authMiddleware` इस्तेमाल करता है और SQL को `context.userId` से सीमित करता है। क्लाइंट कभी उपयोगकर्ता id नहीं भेजता।

## अनुरोध का रास्ता

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` हर प्रक्रिया में एक बार `migrations/` की लंबित फ़ाइलें लागू करता है। फ़ाइलें नाम के क्रम में हैं। `migrations/auth/` उस glob में नहीं है। प्रमाणीकरण स्कीमा अलग है।

## पेज

| मार्ग | फ़ाइल | सर्वर फ़ंक्शन |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, ईमेल और Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, संदेश |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, ब्राउज़र में थीम |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | ऑपरेटर सूची; पहला साइन-इन व्यक्ति desk ले सकता है |

[src/components/shell.tsx](../../src/components/shell.tsx) का शेल पाँच टैब है। वीडियो पूरा पर्दा है और टैब की पैडिंग के अंदर नहीं है।

## डेटा

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

माइग्रेशन:

| फ़ाइल | क्या जोड़ती है |
|---|---|
| `0001_auth.sql` | प्रमाणीकरण तालिकाएँ |
| `0002_life_booster.sql` | ऊपर की तालिकाएँ, Venmo और दवाओं को छोड़कर |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | `sample-%` पंक्तियाँ हटाता है |
| `0005_medications.sql` | `medications` |

`0002` पहले चार नमूना काउंसलर डालता था। वह डालना हट गया है। उसे वापस न रखें। `0004` उन्हें उन डेटाबेस पर हटाता है जिन्होंने पुराना `0002` पहले ही लागू कर लिया है।

टैग (धर्म, दर्शन, विशेषज्ञताएँ) टेक्स्ट कॉलम में JSON स्ट्रिंग हैं, जॉइन तालिकाएँ नहीं। अनुमति वाली विशेषज्ञता लेबल `SPECIALTIES` हैं, [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts) में। विशेषज्ञता जोड़ना कैटलॉग बदलाव है, माइग्रेशन नहीं।

## People में कौन दिखता है

`loadDirectory` हर `user_id` गिरा देता है जो `sample-` से शुरू होता है। सार्वजनिक सूची काउंसलर को तभी रखती है जब `standing = 'active'` हो और कम से कम एक उपलब्धता ब्लॉक हो। बिना घंटों के जीवनी सहेजना उन्हें सूची में नहीं लाता। `saveAvailability` के बाद Studio `["counselors"]` क्वेरी को अमान्य करता है।

घंटे आधी रात से मिनट के रूप में सहेजे जाते हैं। फ़ॉर्म zod के `0…1440` जाँचने से पहले 30 मिनट पर टिकता है। खाली खिड़की, या ऐसा अंत जो शुरुआत के बाद नहीं है, हटा दी जाती है। कुछ न बचे तो सहेजना "Add an hour window for at least one day." फेंकता है।

## बुकिंग और पैसा

`sessionPriceCents` घंटे की दर गुणा अवधि, 60 से भाग है। प्रायोजक का बॉक्स चेक हो तो वह कीमत `0.98` से गुणा होती है।

`bookAppointment` `payMethod` के रूप में `google_pay` या `venmo` लेता है। Venmo बुकिंग कार्ड में बना गहरा लिंक है:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

उपयोगकर्ता नाम `@` के बिना सहेजा जाता है और अक्षर, अंक, `_`, और `-` तक काटा जाता है। Venmo OAuth नहीं है और भुगतान webhook नहीं है। `pay_status` का `demo_authorized` मतलब लिंक खुला, यह नहीं कि Venmo ने पैसे की पुष्टि की।

स्लॉट काउंसलर के ब्लॉक से उसके समयक्षेत्र में आते हैं, पहले से बुक अपॉइंटमेंट घटाकर। अवधियाँ केवल 30, 60, 90, और 120 हैं।

## मूड, नोट, दवाएँ

सदस्य पिछले सात दिनों में से कोई भी लिख सकता है, केवल आज नहीं। चार्ट और सप्ताह सूची दोनों उस दिन को चुनते हैं जिसे `saveMood` लिखता है।

काउंसलर नोट तभी देखता है जब यह सब सच हो:

1. नोट खाली नहीं है।
2. `mood_entries.share_with_counselors` सच है।
3. अपॉइंटमेंट का `share_mood` सच है।
4. नोट की तारीख उन 14 दिनों में है जो भेंट की तारीख पर समाप्त होते हैं।

दवाएँ वही भेंट स्विच और अपना साझा चिह्न इस्तेमाल करती हैं। वे उस तारीख खिड़की तक सीमित नहीं हैं। सूची सदस्य ने लिखी। यह नुस्खे का रिकॉर्ड नहीं है।

अगर आप कॉलम जोड़ें तो `getDashboard` मूड लौटाता रहे। यहाँ फेंकी गई क्वेरी Today को ऐसा दिखाती है जैसे सहेजना विफल रहा। Today पेज फिर से लाने से पहले सहेजा मूड React Query कैश में लिखता है, ताकि धीमा रिफ्रेश चार्ट न मिटाए।

## वीडियो

[src/components/video-room.tsx](../../src/components/video-room.tsx) कैमरा खोलता है, फिर `call_presence` और `call_signals` पूछता है। सदस्य और काउंसलर दोनों ऑफ़र बनाते हैं। अगर दोनों के पास स्थानीय ऑफ़र है, सदस्य अपना रखता है और काउंसलर पीछे हट कर उत्तर देता है।

टाइमर तब शुरू होता है जब `remoteLive` सच होता है, फिर `durationMin` की उलटी गिनती करता है। रिकॉर्डिंग वैकल्पिक, स्थानीय है, और मिश्रित स्ट्रीम पर `MediaRecorder` इस्तेमाल करती है। अपलोड नहीं होती।

iPhone छिपे या म्यूट वीडियो तत्व से दूर का ऑडियो नहीं बजाता, और बाद का `play()` टैप के बाहर है। दूर का `<video>` म्यूट है। अलग `<audio>` तत्व आवाज़ बजाता है। अगर `play()` अस्वीकार हो, कमरा **Tap to hear** दिखाता है। स्थानीय पूर्वावलोकन वीडियो म्यूट रहता है ताकि कमरा गूँजे नहीं।

## दिखावट

हल्का डिफ़ॉल्ट है। गहरा `html.dark` सेट करता है और [src/styles.css](../../src/styles.css) के टोकन बदलता है। चुनाव You टैब से ब्राउज़र में सहेजा जाता है ([src/lib/theme.ts](../../src/lib/theme.ts))। यह डेटाबेस कॉलम नहीं है।

## प्रमाणीकरण

ईमेल और पासवर्ड, साथ Apple, Better Auth के द्वारा। सामाजिक बटन जिन्हें पूर्वावलोकन होस्ट नहीं संभालता, खाली स्क्रीन से नहीं, दिखने वाले संदेश से विफल होने चाहिए। जिन्हें व्यक्ति चाहिए वे सर्वर फ़ंक्शन `authMiddleware` इस्तेमाल करते हैं। अनुरोध के शरीर की id पर भरोसा न करें।
