# البنية

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · **العربية** · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

<blockquote dir="rtl" lang="ar"><p><strong>ملاحظة:</strong> هذه الترجمة بمساعدة آلية. النسخة الإنجليزية هي المرجع المعتمد: <a href="../ARCHITECTURE.md"><span dir="ltr">ARCHITECTURE.md</span></a>.</p></blockquote>

<p dir="rtl" lang="ar">كيفية تحديث الترجمات: <a href="../TRANSLATIONS.md"><span dir="ltr">TRANSLATIONS.md</span></a>.</p>

<p dir="rtl" lang="ar">Life Booster تطبيق TanStack Start. الصفحات في <code dir="ltr">src/routes/</code>. تغييرات البيانات تمر عبر دوال الخادم في <a href="../../src/lib/life/api.ts"><code dir="ltr">src/lib/life/api.ts</code></a>. كل دالة تقرأ أو تكتب صفوف شخص تستخدم <code dir="ltr">authMiddleware</code> وتقيّد SQL بـ <code dir="ltr">context.userId</code>. العميل لا يرسل أبدًا معرّف مستخدم.</p>

<h2 dir="rtl" lang="ar">مسار الطلب</h2>

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

<p dir="rtl" lang="ar"><code dir="ltr">getSql()</code> يطبّق الملفات المعلّقة من <code dir="ltr">migrations/</code> مرة واحدة لكل عملية. الملفات مرتبة بالاسم. <code dir="ltr">migrations/auth/</code> ليس ضمن ذلك الـ glob. مخطط المصادقة منفصل.</p>

<h2 dir="rtl" lang="ar">الصفحات</h2>

<table dir="rtl" lang="ar">
<thead><tr><th>المسار</th><th>الملف</th><th>دوال الخادم</th></tr></thead>
<tbody>
<tr><td dir="ltr"><code>/</code></td><td dir="ltr"><a href="../../src/routes/index.tsx">src/routes/index.tsx</a></td><td dir="ltr"><code>getDashboard</code>, <code>saveMood</code>, <code>saveMedication</code>, <code>deleteMedication</code></td></tr>
<tr><td dir="ltr"><code>/login</code></td><td dir="ltr"><a href="../../src/routes/login.tsx">src/routes/login.tsx</a></td><td>Better Auth، البريد و Apple</td></tr>
<tr><td dir="ltr"><code>/counselors</code></td><td dir="ltr"><a href="../../src/routes/counselors/index.tsx">src/routes/counselors/index.tsx</a></td><td dir="ltr"><code>listCounselors</code></td></tr>
<tr><td dir="ltr"><code>/counselors/$counselorId</code></td><td dir="ltr"><a href="../../src/routes/counselors/$counselorId.tsx">src/routes/counselors/$counselorId.tsx</a></td><td dir="ltr"><code>getCounselor</code>, <code>listSlots</code>, <code>bookAppointment</code></td></tr>
<tr><td dir="ltr"><code>/visits</code></td><td dir="ltr"><a href="../../src/routes/visits.tsx">src/routes/visits.tsx</a></td><td dir="ltr"><code>listVisits</code></td></tr>
<tr><td dir="ltr"><code>/session/$appointmentId</code></td><td dir="ltr"><a href="../../src/routes/session/$appointmentId.tsx">src/routes/session/$appointmentId.tsx</a></td><td dir="ltr"><code>getSessionRoom</code>، رسائل</td></tr>
<tr><td dir="ltr"><code>/studio</code></td><td dir="ltr"><a href="../../src/routes/studio.tsx">src/routes/studio.tsx</a></td><td dir="ltr"><code>getMyCounselor</code>, <code>saveCounselorBio</code>, <code>saveAvailability</code></td></tr>
<tr><td dir="ltr"><code>/you</code></td><td dir="ltr"><a href="../../src/routes/you.tsx">src/routes/you.tsx</a></td><td dir="ltr"><code>saveDisplayName</code>، السمة في المتصفح</td></tr>
<tr><td dir="ltr"><code>/desk</code></td><td dir="ltr"><a href="../../src/routes/desk.tsx">src/routes/desk.tsx</a></td><td>قائمة المشغّلين؛ أول شخص يسجّل الدخول يمكنه أخذ desk</td></tr>
</tbody>
</table>

<p dir="rtl" lang="ar">الغلاف في <a href="../../src/components/shell.tsx"><code dir="ltr">src/components/shell.tsx</code></a> هو التبويبات الخمسة. الفيديو منصة بملء الشاشة وليس داخل حشو التبويبات.</p>

<h2 dir="rtl" lang="ar">البيانات</h2>

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

<p dir="rtl" lang="ar">الترحيلات:</p>

<table dir="rtl" lang="ar">
<thead><tr><th>الملف</th><th>ما يضيفه</th></tr></thead>
<tbody>
<tr><td dir="ltr"><code>0001_auth.sql</code></td><td>جداول المصادقة</td></tr>
<tr><td dir="ltr"><code>0002_life_booster.sql</code></td><td>الجداول أعلاه، ما عدا Venmo والأدوية</td></tr>
<tr><td dir="ltr"><code>0003_venmo.sql</code></td><td dir="ltr"><code>counselor_profiles.venmo_handle</code></td></tr>
<tr><td dir="ltr"><code>0004_remove_sample_counselors.sql</code></td><td dir="ltr">يحذف صفوف <code>sample-%</code></td></tr>
<tr><td dir="ltr"><code>0005_medications.sql</code></td><td dir="ltr"><code>medications</code></td></tr>
</tbody>
</table>

<p dir="rtl" lang="ar"><code dir="ltr">0002</code> كان يدرج أربعة مرافقين نموذجيين. ذلك الإدراج زال. لا تُعده. <code dir="ltr">0004</code> يحذفهم في قواعد البيانات التي طبّقت <code dir="ltr">0002</code> القديم.</p>

<p dir="rtl" lang="ar">الوسوم (أديان، فلسفات، تخصصات) سلاسل JSON في أعمدة نص، وليست جداول ربط. تسميات التخصص المسموحة هي <code dir="ltr">SPECIALTIES</code> في <a href="../../src/lib/life/catalog.ts"><code dir="ltr">src/lib/life/catalog.ts</code></a>. إضافة تخصص تغيير في الفهرس، لا ترحيل.</p>

<h2 dir="rtl" lang="ar">من يظهر في People</h2>

<p dir="rtl" lang="ar"><code dir="ltr">loadDirectory</code> يسقط أي <code dir="ltr">user_id</code> يبدأ بـ <code dir="ltr">sample-</code>. القائمة العامة تبقي مرافقًا فقط عندما <code dir="ltr">standing = 'active'</code> ولديه كتلة توفر واحدة على الأقل. حفظ نبذة بلا ساعات لا يدرجهم. بعد <code dir="ltr">saveAvailability</code> يُبطل Studio استعلام <code dir="ltr">["counselors"]</code>.</p>

<p dir="rtl" lang="ar">الساعات تُخزَّن دقائق من منتصف الليل. النموذج يضبط على 30 دقيقة قبل أن يفحص zod المدى <code dir="ltr">0…1440</code>. النافذة الفارغة، أو النهاية التي ليست بعد البداية، تُسقَط. الحفظ بلا شيء متبقٍ يرمي "Add an hour window for at least one day."</p>

<h2 dir="rtl" lang="ar">الحجز والمال</h2>

<p dir="rtl" lang="ar"><code dir="ltr">sessionPriceCents</code> هو الأجر بالساعة مضروبًا في المدة، مقسومًا على 60. مع تحديد مربع الراعي، يُضرب ذلك السعر في <code dir="ltr">0.98</code>.</p>

<p dir="rtl" lang="ar"><code dir="ltr">bookAppointment</code> يقبل <code dir="ltr">payMethod</code> بقيمة <code dir="ltr">google_pay</code> أو <code dir="ltr">venmo</code>. Venmo رابط عميق يُبنى في بطاقة الحجز:</p>

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

<p dir="rtl" lang="ar">يُخزَّن اسم المستخدم بلا <code dir="ltr">@</code> ويُقصَر على الحروف والأرقام و<code dir="ltr">_</code> و<code dir="ltr">-</code>. لا يوجد OAuth لـ Venmo ولا webhook للدفع. <code dir="ltr">pay_status</code> بقيمة <code dir="ltr">demo_authorized</code> يعني أن الرابط فُتح، لا أن Venmo أكّد المال.</p>

<p dir="rtl" lang="ar">الفتحات تأتي من كتل المرافق في منطقته الزمنية، ناقص المواعيد المحجوزة. المدد فقط 30 و60 و90 و120.</p>

<h2 dir="rtl" lang="ar">المزاج والملاحظات والأدوية</h2>

<p dir="rtl" lang="ar">يمكن للعضو أن يكتب أيًا من الأيام السبعة الأخيرة، لا اليوم فقط. الرسم وقائمة الأسبوع يختاران كلاهما اليوم الذي يكتبه <code dir="ltr">saveMood</code>.</p>

<p dir="rtl" lang="ar">يرى المرافق ملاحظة فقط عندما يصدق كل ما يلي:</p>

<ol dir="rtl" lang="ar">
<li>الملاحظة غير فارغة.</li>
<li dir="ltr"><code>mood_entries.share_with_counselors</code> صحيح.</li>
<li><code dir="ltr">share_mood</code> للموعد صحيح.</li>
<li>تاريخ الملاحظة ضمن الأيام الأربعة عشر التي تنتهي في تاريخ الزيارة.</li>
</ol>

<p dir="rtl" lang="ar">الأدوية تستخدم مفتاح الزيارة نفسه إضافة إلى علامة المشاركة الخاصة بها. ليست محدودة بنافذة التاريخ تلك. القائمة كتبها العضو. ليست سجل وصفة.</p>

<p dir="rtl" lang="ar">يجب أن يواصل <code dir="ltr">getDashboard</code> إرجاع الأمزجة إذا أضفت عمودًا. استعلام يُرمى هنا يجعل Today يبدو كأن الحفظ فشل. صفحة Today تكتب أيضًا المزاج المحفوظ في ذاكرة React Query قبل إعادة الجلب، حتى لا يمسح تحديث بطيء الرسم.</p>

<h2 dir="rtl" lang="ar">الفيديو</h2>

<p dir="rtl" lang="ar"><a href="../../src/components/video-room.tsx"><code dir="ltr">src/components/video-room.tsx</code></a> يفتح الكاميرا ثم يستطلع <code dir="ltr">call_presence</code> و<code dir="ltr">call_signals</code>. العضو والمرافق ينشئان كلاهما عروضًا. إذا كان لدى الاثنين عرض محلي، يحتفظ العضو بعرضه ويتراجع المرافق ويجيب.</p>

<p dir="rtl" lang="ar">يبدأ المؤقت عندما يصبح <code dir="ltr">remoteLive</code> صحيحًا، ثم يعد تنازليًا <code dir="ltr">durationMin</code>. التسجيل اختياري ومحلي ويستخدم <code dir="ltr">MediaRecorder</code> على دفق ممزوج. لا يُرفع.</p>

<p dir="rtl" lang="ar">لن يشغّل iPhone الصوت البعيد من عنصر فيديو مخفي أو مكتوم، و<code dir="ltr">play()</code> اللاحق خارج النقرة. عنصر <code dir="ltr">&lt;video&gt;</code> البعيد مكتوم. عنصر <code dir="ltr">&lt;audio&gt;</code> منفصل يشغّل الصوت. إذا رُفض <code dir="ltr">play()</code> تعرض الغرفة <strong>Tap to hear</strong>. يبقى فيديو المعاينة المحلي مكتومًا حتى لا يتردد صدى الغرفة.</p>

<h2 dir="rtl" lang="ar">المظهر</h2>

<p dir="rtl" lang="ar">الفاتح هو الافتراضي. الداكن يضع <code dir="ltr">html.dark</code> ويبدّل الرموز في <a href="../../src/styles.css"><code dir="ltr">src/styles.css</code></a>. الاختيار يُخزَّن في المتصفح من تبويب You (<a href="../../src/lib/theme.ts"><code dir="ltr">src/lib/theme.ts</code></a>). ليس عمودًا في قاعدة البيانات.</p>

<h2 dir="rtl" lang="ar">المصادقة</h2>

<p dir="rtl" lang="ar">البريد وكلمة السر، إضافة إلى Apple، عبر Better Auth. أزرار التواصل التي لا يدعمها مضيف المعاينة يجب أن تفشل برسالة ظاهرة، لا بشاشة فارغة. دوال الخادم التي تحتاج شخصًا تستخدم <code dir="ltr">authMiddleware</code>. لا تثق بمعرّف من جسم الطلب.</p>
