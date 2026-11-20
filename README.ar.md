# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **العربية** · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

<blockquote dir="rtl" lang="ar"><p><strong>ملاحظة:</strong> هذه الترجمة بمساعدة آلية. النسخة الإنجليزية هي المرجع المعتمد: <a href="README.md"><span dir="ltr">README.md</span></a>.</p></blockquote>

<p dir="rtl" lang="ar">كيفية تحديث الترجمات: <a href="docs/TRANSLATIONS.md"><span dir="ltr">TRANSLATIONS.md</span></a>.</p>

<p dir="rtl" lang="ar">أسبوع من شعورك، وشخص تتحدث معه. يسجّل الأعضاء مزاجهم، ويحتفظون بملاحظات، ويسردون الأدوية، ويحجزون زيارة فيديو لمدد 30 أو 60 أو 90 أو 120 دقيقة. ينشر المرافقون (في التطبيق: counselors) ملفًا وساعات واسم مستخدم على Venmo.</p>

<p dir="rtl" lang="ar">هذا دعم أقران. المرافقون ليسوا معالجين مرخّصين ولا علماء نفس ولا أطباء نفسيين ولا مقدمي رعاية طبية. الزيارة ليست علاجًا ولا تشخيصًا ولا معالجة. Life Booster غير مسؤول عن النصيحة ويمكنه إيقاف مرافق دون إشعار. في الأزمة، اتصل أو أرسل رسالة نصية إلى 988.</p>

<h2 dir="rtl" lang="ar">ما الذي يمكنك فعله</h2>

<table dir="rtl" lang="ar">
<thead><tr><th>التبويب</th><th>من</th><th>ماذا</th></tr></thead>
<tbody>
<tr><td dir="ltr">Today</td><td>عضو</td><td>تسجيل أي يوم من هذا الأسبوع، ورؤية المتوسط، وإضافة أدوية</td></tr>
<tr><td dir="ltr">Library</td><td>أي شخص سجّل الدخول</td><td>ممارسات حسب الموضوع، ومرافقون للمتابعة، وحجز زيارة</td></tr>
<tr><td dir="ltr">Visits</td><td>الطرفان</td><td>المواعيد القادمة والسابقة، ثم غرفة الفيديو</td></tr>
<tr><td dir="ltr">Studio</td><td>مرافق</td><td>نبذة، تخصصات، أجر الساعة، الساعات، اسم مستخدم Venmo</td></tr>
<tr><td dir="ltr">You</td><td>من سجّل الدخول</td><td>الاسم المعروض، والمظهر الفاتح أو الداكن</td></tr>
</tbody>
</table>

<p dir="rtl" lang="ar">تسجيل الدخول بالبريد وكلمة السر، أو عبر Apple. تبقى الملاحظات والأدوية خاصة إلى أن يعلّمها العضو قابلة للمشاركة ويشغّل المشاركة لتلك الزيارة.</p>

<h2 dir="rtl" lang="ar">الدفع</h2>

<p dir="rtl" lang="ar">يفتح الحجز رابط دفع Venmo إلى اسم مستخدم المرافق (<code dir="ltr">venmo.com</code>، <code dir="ltr">txn=pay</code>). هذا ليس ربطًا تجاريًا ولا يؤكد الدفع. Google Pay خيار ثانٍ عبر Payment Request API في المتصفح. Apple Pay غير متاح في شاشة الحجز.</p>

<p dir="rtl" lang="ar">خصم الراعي الاختياري هو 2% (<code dir="ltr">AD_DISCOUNT</code> في <a href="src/lib/life/money.ts"><code dir="ltr">src/lib/life/money.ts</code></a>). الأسعار من $15 إلى $400 للساعة.</p>

<h2 dir="rtl" lang="ar">التشغيل</h2>

```bash
npm run dev
```

<p dir="rtl" lang="ar">يستمع التطبيق على المنفذ 8080. يجب أن ينجح <code dir="ltr">npm run typecheck</code> و<code dir="ltr">npm run build</code>. تغييرات المخطط توضع في ملف جديد ضمن <a href="migrations/"><code dir="ltr">migrations/</code></a>. لا تعدّل ترحيلًا تم نشره إلا لمنعه من إعادة بذر البيانات.</p>

<p dir="rtl" lang="ar">من دون <code dir="ltr">DATABASE_URL</code> يستخدم الخادم Postgres مضمّنًا (PGLite) ويطبّق <a href="migrations/"><code dir="ltr">migrations/</code></a> عند الإقلاع. مع <code dir="ltr">DATABASE_URL</code> يطبّق <code dir="ltr">npm run db:migrate</code> الملفات نفسها على Neon.</p>

<h2 dir="rtl" lang="ar">التخطيط</h2>

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

<p dir="rtl" lang="ar">النسخة العربية: <a href="docs/ar/ARCHITECTURE.md">البنية</a> و<a href="docs/ar/PROMPTS.md">الموجهات</a>.</p>

<p dir="rtl" lang="ar">تُبقى الفروع <code dir="ltr">main</code> و<code dir="ltr">web</code> و<code dir="ltr">ios</code> و<code dir="ltr">android</code> على نفس الالتزام. ادفع الأربعة معًا.</p>

<h2 dir="rtl" lang="ar">قواعد المنتج التي يسهل كسرها</h2>

<ul dir="rtl" lang="ar">
<li>يظهر المرافق في People فقط عندما يكون <code dir="ltr">standing</code> بالقيمة <code dir="ltr">active</code> ولديه ساعة محفوظة واحدة على الأقل.</li>
<li>الساعات هي أيام الأسبوع <code dir="ltr">0</code> (الأحد) حتى <code dir="ltr">6</code>، وتُضبط على 30 دقيقة، ويجب أن تكون النهاية بعد البداية.</li>
<li>لا تبذر مرافقين نموذجيين (<code dir="ltr">sample-amira</code>، <code dir="ltr">sample-jonah</code>، <code dir="ltr">sample-leila</code>، <code dir="ltr">sample-mateo</code>).</li>
<li>المشاركة مفتاحان: الملاحظة أو الدواء معلَّمان كقابلين للمشاركة، والزيارة فيها <code dir="ltr">share_mood</code>. إذا أُطفئ أحدهما، لا يراه المرافق.</li>
<li>يبدأ مؤقت الزيارة عندما ينضم الشخص الآخر، ويعد تنازليًا مدة الحجز.</li>
<li>يشغّل iPhone صوت الشخص الآخر على عنصر صوت خاص به. يبقى الفيديو البعيد مكتومًا حتى لا يعلق الصوت على صورة مخفية.</li>
</ul>
