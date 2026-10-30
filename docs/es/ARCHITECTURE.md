# Arquitectura

[English](../ARCHITECTURE.md) · **Español** · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Nota:** Esta traducción está asistida por máquina. El inglés es la versión autorizada: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Cómo se actualizan las traducciones](../TRANSLATIONS.md).

Life Booster es una aplicación TanStack Start. Las páginas viven en `src/routes/`. Los cambios de datos pasan por funciones de servidor en [src/lib/life/api.ts](../../src/lib/life/api.ts). Cada función que lee o escribe las filas de una persona usa `authMiddleware` y limita el SQL con `context.userId`. El cliente nunca envía un id de usuario.

## Ruta de la petición

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` aplica los archivos pendientes de `migrations/` una vez por proceso. Los archivos se ordenan por nombre. `migrations/auth/` no entra en ese glob. El esquema de auth va aparte.

## Páginas

| Ruta | Archivo | Funciones de servidor |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, correo y Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, mensajes |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, tema en el navegador |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | lista de operadores; la primera persona que inicia sesión puede reclamar el desk |

El shell en [src/components/shell.tsx](../../src/components/shell.tsx) son las cinco pestañas. El video es un escenario a pantalla completa y no está dentro del relleno de las pestañas.

## Datos

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

Migraciones:

| Archivo | Qué añade |
|---|---|
| `0001_auth.sql` | tablas de auth |
| `0002_life_booster.sql` | las tablas de arriba, excepto Venmo y los medicamentos |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | borra las filas `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` antes insertaba cuatro acompañantes de ejemplo. Esa inserción ya no está. No la devuelvas. `0004` los borra en las bases de datos que ya aplicaron el `0002` antiguo.

Las etiquetas (religiones, filosofías, especialidades) son cadenas JSON en columnas de texto, no tablas de unión. Las etiquetas de especialidad permitidas son `SPECIALTIES` en [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Añadir una especialidad es un cambio de catálogo, no una migración.

## Quién aparece en People

`loadDirectory` descarta cualquier `user_id` que empiece por `sample-`. La lista pública conserva a un acompañante solo cuando `standing = 'active'` y tiene al menos un bloque de disponibilidad. Guardar una biografía sin horas no lo incluye. Después de `saveAvailability`, Studio invalida la consulta `["counselors"]`.

Las horas se guardan como minutos desde la medianoche. El formulario ajusta a 30 minutos antes de que zod compruebe `0…1440`. Una ventana vacía, o un final que no sea posterior al inicio, se descarta. Guardar sin que quede nada lanza "Add an hour window for at least one day."

## Reserva y dinero

`sessionPriceCents` es la tarifa por hora por la duración, dividido entre 60. Con la casilla del patrocinador marcada, ese precio se multiplica por `0.98`.

`bookAppointment` acepta un `payMethod` de `google_pay` o `venmo`. Venmo es un enlace profundo que se construye en la tarjeta de reserva:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

El nombre de usuario se guarda sin `@` y se reduce a letras, números, `_` y `-`. No hay OAuth de Venmo ni webhook de pago. Un `pay_status` de `demo_authorized` significa que el enlace se abrió, no que Venmo confirmara el dinero.

Los huecos salen de los bloques del acompañante en su zona horaria, menos las citas ya reservadas. Las duraciones solo son 30, 60, 90 y 120.

## Estado de ánimo, notas, medicamentos

Un miembro puede escribir cualquiera de los últimos siete días, no solo hoy. El gráfico y la lista de la semana seleccionan el día que escribe `saveMood`.

Un acompañante ve una nota solo cuando todo esto es cierto:

1. La nota no está vacía.
2. `mood_entries.share_with_counselors` es verdadero.
3. El `share_mood` de la cita es verdadero.
4. La fecha de la nota está en los 14 días que terminan en la fecha de la visita.

Los medicamentos usan el mismo interruptor de la visita más su propia marca de compartir. No se limitan a esa ventana de fechas. La lista la escribió el miembro. No es un registro de prescripción.

`getDashboard` debe seguir devolviendo los estados de ánimo si añades una columna. Una consulta que lance aquí hace que Today parezca que el guardado falló. La página Today también escribe el estado de ánimo guardado en la caché de React Query antes de volver a pedir los datos, así un refresco lento no vacía el gráfico.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) abre la cámara y luego consulta `call_presence` y `call_signals`. El miembro y el acompañante crean ambos ofertas. Si los dos tienen una oferta local, el miembro conserva la suya y el acompañante revierte y responde.

El temporizador empieza cuando `remoteLive` pasa a verdadero, y luego cuenta hacia atrás `durationMin`. La grabación es opcional, local, y usa `MediaRecorder` sobre un flujo mezclado. No se sube.

El iPhone no reproduce el audio remoto desde un elemento de video oculto o silenciado, y un `play()` posterior queda fuera del toque. El `<video>` remoto está silenciado. Un elemento `<audio>` aparte reproduce la voz. Si `play()` se rechaza, la sala muestra **Tap to hear**. El video de vista previa local permanece silenciado para que la sala no haga eco.

## Apariencia

Claro es el valor por defecto. Oscuro pone `html.dark` y cambia los tokens en [src/styles.css](../../src/styles.css). La elección se guarda en el navegador desde la pestaña You ([src/lib/theme.ts](../../src/lib/theme.ts)). No es una columna de la base de datos.

## Auth

Correo y contraseña, más Apple, mediante Better Auth. Los botones sociales que el host de la vista previa no admite deben fallar con un mensaje visible, no con una pantalla en blanco. Las funciones de servidor que necesitan una persona usan `authMiddleware`. No confíes en un id del cuerpo de la petición.
