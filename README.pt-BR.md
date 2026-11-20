# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Português (Brasil)** · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Nota:** Esta tradução é assistida por máquina. O inglês é a versão autorizada: [README.md](README.md).

[Como as traduções são atualizadas](docs/TRANSLATIONS.md).

Uma semana de como você se sente, e alguém com quem falar. Os membros registram um humor, guardam notas, listam medicamentos e marcam uma visita em vídeo de 30, 60, 90 ou 120 minutos. Os acompanhantes (no aplicativo: counselors) publicam um perfil, horários e um nome de usuário do Venmo.

Isto é apoio entre pares. Os acompanhantes não são terapeutas licenciados, nem psicólogos, nem psiquiatras, nem prestadores médicos. Uma visita não é terapia, diagnóstico nem tratamento. O Life Booster não se responsabiliza por conselhos e pode dispensar um acompanhante sem aviso. Em uma crise, ligue ou envie uma mensagem de texto para o 988.

## O que você pode fazer

| Aba | Quem | O quê |
|---|---|---|
| Today | Membro | Registrar qualquer dia desta semana, ver a média, adicionar medicamentos |
| Library | Qualquer pessoa conectada | Práticas por tema, acompanhantes para seguir, marcar uma visita |
| Visits | Ambos | Consultas futuras e passadas, depois a sala de vídeo |
| Studio | Acompanhante | Biografia, especialidades, valor por hora, horários, nome de usuário do Venmo |
| You | Conectado | Nome de exibição, aparência clara ou escura |

O acesso é por e-mail e senha, ou Apple. Notas e medicamentos ficam privados até o membro marcá-los como compartilháveis e ligar o compartilhamento daquela visita.

## Pagamento

A reserva abre um link de pagamento do Venmo para o nome de usuário do acompanhante (`venmo.com`, `txn=pay`). Isso não é uma conexão de comerciante e não confirma o pagamento. O Google Pay é uma segunda opção pela Payment Request API do navegador. O Apple Pay não é oferecido na tela de reserva.

O desconto opcional do patrocinador é de 2% (`AD_DISCOUNT` em [src/lib/life/money.ts](src/lib/life/money.ts)). Os valores vão de $15 a $400 por hora.

## Execução

```bash
npm run dev
```

O aplicativo escuta na porta 8080. `npm run typecheck` e `npm run build` devem passar. Mudanças de esquema vão em um arquivo novo em [migrations/](migrations/). Não edite uma migração que já foi publicada, exceto para impedi-la de semear dados de novo.

Sem `DATABASE_URL`, o servidor usa Postgres embutido (PGLite) e aplica [migrations/](migrations/) na inicialização. Com `DATABASE_URL`, `npm run db:migrate` aplica os mesmos arquivos no Neon.

## Disposição

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

O mesmo guia, em português: [arquitetura](docs/pt-BR/ARCHITECTURE.md) e [prompts](docs/pt-BR/PROMPTS.md).

Os branches `main`, `web`, `ios` e `android` ficam no mesmo commit. Faça push dos quatro juntos.

## Regras do produto que quebram fácil

- Um acompanhante aparece em People somente quando o `standing` é `active` e há pelo menos uma hora salva.
- As horas são o dia da semana `0` (domingo) a `6`, ajustadas a 30 minutos, e o fim precisa ser depois do início.
- Não semeie acompanhantes de exemplo (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Compartilhar são dois interruptores: a nota ou o medicamento está marcado como compartilhável, e a visita tem `share_mood`. Se um dos dois estiver desligado, o acompanhante não vê.
- O timer da visita começa quando a outra pessoa entra, e conta regressivamente a duração reservada.
- O iPhone toca a voz da outra pessoa no próprio elemento de áudio. O vídeo remoto fica mudo para o som não ficar preso numa imagem oculta.
