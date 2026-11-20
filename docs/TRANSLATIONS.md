# Updating translations

English is the source of truth for Life Booster documentation. The files in other languages are machine-assisted. If a translation and the English disagree, follow the English.

## What is translated

| English | Translations |
|---|---|
| [README.md](../README.md) | `README.<lang>.md` next to it |
| [ARCHITECTURE.md](ARCHITECTURE.md) | `<lang>/ARCHITECTURE.md` |
| [PROMPTS.md](PROMPTS.md) | `<lang>/PROMPTS.md` |

Languages: Spanish (`es`), French (`fr`), German (`de`), Portuguese-Brazil (`pt-BR`), Italian (`it`), Chinese Simplified (`zh-CN`), Chinese Traditional (`zh-TW`), Japanese (`ja`), Korean (`ko`), Arabic (`ar`), Hindi (`hi`), Russian (`ru`), Vietnamese (`vi`), Turkish (`tr`), Indonesian (`id`), Polish (`pl`), Dutch (`nl`), Ukrainian (`uk`), Filipino (`fil`), Swahili (`sw`).

Each translation starts with a language switcher and a short note that English is authoritative. Arabic prose is wrapped so it reads right to left. Code blocks stay left to right.

## When English changes

Update the translations of that same file in the same change. Do not leave a translated file describing behavior the English no longer describes.

1. Edit the English file.
2. Edit every `README.<lang>.md`, or every `docs/<lang>/` copy of the doc you changed.
3. Keep the switcher. It lists English and all twenty languages. The current language is bold and is not a link.
4. Keep the machine-assisted note at the top.
5. Read the result in the target language if you can. A speaker review is welcome. English still wins on conflict.

## What to leave in English

- Fenced code blocks, commands, file paths, URLs, and badges.
- Product and API names: Life Booster, Venmo, Google Pay, Apple Pay, Apple, TanStack Start, TanStack Query, Better Auth, Neon, PGLite, WebRTC, MediaRecorder, React Query, iPhone.
- Tab labels as shown in the app: Today, Library, Visits, Studio, You. Also People, where the docs use that name.
- Identifiers and exact UI strings, including `standing`, `active`, `share_mood`, "Add an hour window for at least one day.", and **Tap to hear**.
- The paste-ready prompts in [PROMPTS.md](PROMPTS.md). Translate the title, the introduction, and the headings only. The fenced text is pasted into an English codebase and must stay byte-for-byte.

## Links

`README.<lang>.md` sits in the repository root, so links to `src/` and `migrations/` use the same relative path as in [README.md](../README.md). Point documentation links at the translated copy: `docs/<lang>/ARCHITECTURE.md` and `docs/<lang>/PROMPTS.md`.

A file in `docs/<lang>/` is one directory deeper than `docs/`. A link that is `../src/...` in English is `../../src/...` in the translation. The layout tree inside the README code block is the real English layout. Leave that block unchanged, and link the translated docs in the prose under it.

## Not translated

This guide stays in English. It describes how to update the English source.

Also left untranslated: code comments, in-app UI strings, `AGENTS.md` and `AGENTS.project.md` (agent instructions, not product docs), and any legal or privacy text. There is no LICENSE, privacy policy, or CONTRIBUTING file in the repo today. If one is added and it is legal text, link it from the docs and do not translate it.
