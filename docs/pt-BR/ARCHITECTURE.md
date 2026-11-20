# Arquitetura

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · **Português (Brasil)** · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Nota:** Esta tradução é assistida por máquina. O inglês é a versão autorizada: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Como as traduções são atualizadas](../TRANSLATIONS.md).

O Life Booster é um aplicativo TanStack Start. As páginas ficam em `src/routes/`. Mudanças de dados passam por funções de servidor em [src/lib/life/api.ts](../../src/lib/life/api.ts). Toda função que lê ou escreve as linhas de uma pessoa usa `authMiddleware` e limita o SQL com `context.userId`. O cliente nunca envia um id de usuário.

## Caminho da requisição

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` aplica os arquivos pendentes de `migrations/` uma vez por processo. Os arquivos são ordenados pelo nome. `migrations/auth/` não entra nesse glob. O esquema de auth fica separado.

## Páginas

| Rota | Arquivo | Funções de servidor |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, e-mail e Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, mensagens |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, tema no navegador |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | lista de operadores; a primeira pessoa que entra pode reivindicar o desk |

O shell em [src/components/shell.tsx](../../src/components/shell.tsx) são as cinco abas. O vídeo é um palco em tela cheia e não fica dentro do preenchimento das abas.

## Dados

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

Migrações:

| Arquivo | O que adiciona |
|---|---|
| `0001_auth.sql` | tabelas de auth |
| `0002_life_booster.sql` | as tabelas acima, exceto Venmo e medicamentos |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | apaga linhas `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` inseria quatro acompanhantes de exemplo. Essa inserção sumiu. Não a devolva. `0004` os apaga em bancos que já aplicaram o `0002` antigo.

Tags (religiões, filosofias, especialidades) são strings JSON em colunas de texto, não tabelas de junção. Os rótulos de especialidade permitidos são `SPECIALTIES` em [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Acrescentar uma especialidade é mudança de catálogo, não migração.

## Quem aparece em People

`loadDirectory` descarta qualquer `user_id` que comece com `sample-`. A lista pública mantém um acompanhante só quando `standing = 'active'` e há pelo menos um bloco de disponibilidade. Salvar uma biografia sem horários não o lista. Depois de `saveAvailability`, o Studio invalida a consulta `["counselors"]`.

As horas são guardadas como minutos desde a meia-noite. O formulário ajusta para 30 minutos antes de o zod checar `0…1440`. Uma janela vazia, ou um fim que não seja depois do início, é descartada. Salvar sem nada restante lança "Add an hour window for at least one day."

## Reserva e dinheiro

`sessionPriceCents` é a tarifa horária vezes a duração, dividida por 60. Com a caixa do patrocinador marcada, esse preço é multiplicado por `0.98`.

`bookAppointment` aceita `payMethod` de `google_pay` ou `venmo`. Venmo é um link profundo montado no cartão de reserva:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

O nome de usuário é guardado sem `@` e reduzido a letras, números, `_` e `-`. Não há OAuth do Venmo nem webhook de pagamento. `pay_status` de `demo_authorized` significa que o link foi aberto, não que o Venmo confirmou o dinheiro.

Os horários vêm dos blocos do acompanhante no fuso dele, menos os compromissos já reservados. As durações são só 30, 60, 90 e 120.

## Humor, notas, medicamentos

Um membro pode escrever qualquer um dos últimos sete dias, não só hoje. O gráfico e a lista da semana selecionam o dia que `saveMood` grava.

Um acompanhante vê uma nota só quando tudo isto é verdadeiro:

1. A nota não está vazia.
2. `mood_entries.share_with_counselors` é verdadeiro.
3. O `share_mood` do compromisso é verdadeiro.
4. A data da nota está nos 14 dias que terminam na data da visita.

Medicamentos usam o mesmo interruptor da visita mais a própria marca de compartilhar. Não ficam limitados a essa janela de datas. O membro escreveu a lista. Não é um registro de prescrição.

`getDashboard` precisa continuar devolvendo humores se você acrescentar uma coluna. Uma consulta que lance aqui faz Today parecer que o salvamento falhou. A página Today também escreve o humor salvo no cache do React Query antes de buscar de novo, para uma atualização lenta não limpar o gráfico.

## Vídeo

[src/components/video-room.tsx](../../src/components/video-room.tsx) abre a câmera e depois consulta `call_presence` e `call_signals`. O membro e o acompanhante criam ofertas. Se os dois tiverem uma oferta local, o membro fica com a dele e o acompanhante desfaz e responde.

O timer começa quando `remoteLive` fica verdadeiro e então conta `durationMin` para trás. A gravação é opcional, local, e usa `MediaRecorder` num fluxo misturado. Não é enviada.

O iPhone não toca áudio remoto a partir de um elemento de vídeo oculto ou mudo, e um `play()` posterior fica fora do toque. O `<video>` remoto fica mudo. Um elemento `<audio>` separado toca a voz. Se `play()` for rejeitado, a sala mostra **Tap to hear**. O vídeo de prévia local fica mudo para a sala não ecoar.

## Aparência

Claro é o padrão. Escuro define `html.dark` e troca os tokens em [src/styles.css](../../src/styles.css). A escolha fica no navegador, a partir da aba You ([src/lib/theme.ts](../../src/lib/theme.ts)). Não é uma coluna do banco.

## Auth

E-mail e senha, mais Apple, pelo Better Auth. Botões sociais que o host da prévia não aceita devem falhar com uma mensagem visível, não com uma tela em branco. Funções de servidor que precisam de uma pessoa usam `authMiddleware`. Não confie num id do corpo da requisição.
