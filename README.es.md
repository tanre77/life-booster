# Life Booster

[English](README.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Nota:** Esta traducción está asistida por máquina. El inglés es la versión autorizada: [README.md](README.md).

[Cómo se actualizan las traducciones](docs/TRANSLATIONS.md).

Una semana de cómo te sientes, y alguien con quien hablar. Los miembros registran un estado de ánimo, guardan notas, anotan medicamentos y reservan una visita por video de 30, 60, 90 o 120 minutos. Los acompañantes (en la aplicación: counselors) publican un perfil, un horario y un nombre de usuario de Venmo.

Esto es apoyo entre pares. Los acompañantes no son terapeutas con licencia, ni psicólogos, ni psiquiatras, ni proveedores médicos. Una visita no es terapia, diagnóstico ni tratamiento. Life Booster no es responsable de los consejos y puede dar de baja a un acompañante sin previo aviso. En una crisis, llama o envía un mensaje de texto al 988.

## Qué puedes hacer

| Pestaña | Quién | Qué |
|---|---|---|
| Today | Miembro | Registrar cualquier día de esta semana, ver el promedio, añadir medicamentos |
| Library | Cualquier persona que haya iniciado sesión | Prácticas por tema, acompañantes a los que seguir, reservar una visita |
| Visits | Ambos | Citas próximas y pasadas, y después la sala de video |
| Studio | Acompañante | Biografía, especialidades, tarifa por hora, horario, nombre de usuario de Venmo |
| You | Con sesión iniciada | Nombre visible, apariencia clara u oscura |

El inicio de sesión es con correo y contraseña, o con Apple. Las notas y los medicamentos siguen siendo privados hasta que el miembro los marca como compartibles y activa el uso compartido para esa visita.

## Pago

Al reservar se abre un enlace de pago de Venmo al nombre de usuario del acompañante (`venmo.com`, `txn=pay`). Eso no es una conexión de comercio y no confirma el pago. Google Pay es una segunda opción a través de la Payment Request API del navegador. Apple Pay no se ofrece en la pantalla de reserva.

El descuento opcional del patrocinador es del 2% (`AD_DISCOUNT` en [src/lib/life/money.ts](src/lib/life/money.ts)). Las tarifas van de $15 a $400 por hora.

## Ejecución

```bash
npm run dev
```

La aplicación escucha en el puerto 8080. `npm run typecheck` y `npm run build` deben completarse sin errores. Los cambios de esquema van en un archivo nuevo dentro de [migrations/](migrations/). No edites una migración que ya se haya publicado, salvo para impedir que vuelva a sembrar datos.

Sin `DATABASE_URL`, el servidor usa Postgres embebido (PGLite) y aplica [migrations/](migrations/) al arrancar. Con `DATABASE_URL`, `npm run db:migrate` aplica los mismos archivos en Neon.

## Disposición

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

La misma guía, en español: [arquitectura](docs/es/ARCHITECTURE.md) y [indicaciones](docs/es/PROMPTS.md).

Las ramas `main`, `web`, `ios` y `android` se mantienen en el mismo commit. Haz push de las cuatro juntas.

## Reglas del producto que es fácil romper

- Un acompañante aparece en People solo cuando su `standing` es `active` y tiene al menos una hora guardada.
- Las horas son el día de la semana `0` (domingo) a `6`, ajustadas a 30 minutos, y el final debe ser posterior al inicio.
- No siembres acompañantes de ejemplo (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Compartir son dos interruptores: la nota o el medicamento está marcado como compartible, y la visita tiene `share_mood`. Si uno de los dos está apagado, el acompañante no lo ve.
- El temporizador de la visita empieza cuando la otra persona se une, y cuenta hacia atrás la duración reservada.
- El iPhone reproduce la voz de la otra persona en su propio elemento de audio. El video remoto permanece silenciado para que el sonido no quede atrapado en una imagen oculta.
