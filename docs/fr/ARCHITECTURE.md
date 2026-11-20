# Architecture

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · **Français** · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Note :** Cette traduction est assistée par machine. L'anglais fait foi : [ARCHITECTURE.md](../ARCHITECTURE.md).

[Comment mettre à jour les traductions](../TRANSLATIONS.md).

Life Booster est une application TanStack Start. Les pages vivent dans `src/routes/`. Les changements de données passent par des fonctions serveur dans [src/lib/life/api.ts](../../src/lib/life/api.ts). Chaque fonction qui lit ou écrit les lignes d'une personne utilise `authMiddleware` et limite le SQL avec `context.userId`. Le client n'envoie jamais d'id utilisateur.

## Chemin de la requête

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` applique les fichiers en attente de `migrations/` une fois par processus. Les fichiers sont ordonnés par nom. `migrations/auth/` n'est pas dans ce glob. Le schéma d'auth est à part.

## Pages

| Route | Fichier | Fonctions serveur |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, e-mail et Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, messages |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, thème dans le navigateur |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | liste des opérateurs ; la première personne connectée peut réclamer le desk |

Le shell dans [src/components/shell.tsx](../../src/components/shell.tsx) est les cinq onglets. La vidéo est une scène plein écran et n'est pas dans la marge des onglets.

## Données

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

Migrations :

| Fichier | Ce qu'il ajoute |
|---|---|
| `0001_auth.sql` | tables d'auth |
| `0002_life_booster.sql` | les tables ci-dessus, sauf Venmo et les médicaments |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | supprime les lignes `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` insérait autrefois quatre accompagnants d'exemple. Cet insert a disparu. Ne le remets pas. `0004` les supprime sur les bases qui ont déjà appliqué l'ancien `0002`.

Les étiquettes (religions, philosophies, spécialités) sont des chaînes JSON dans des colonnes texte, pas des tables de jointure. Les libellés de spécialité autorisés sont `SPECIALTIES` dans [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Ajouter une spécialité est un changement de catalogue, pas une migration.

## Qui apparaît dans People

`loadDirectory` écarte tout `user_id` qui commence par `sample-`. La liste publique ne garde un accompagnant que lorsque `standing = 'active'` et qu'il a au moins un bloc de disponibilité. Enregistrer une biographie sans heures ne le liste pas. Après `saveAvailability`, Studio invalide la requête `["counselors"]`.

Les heures sont stockées en minutes depuis minuit. Le formulaire cale sur 30 minutes avant que zod vérifie `0…1440`. Une fenêtre vide, ou une fin qui n'est pas après le début, est écartée. Enregistrer alors qu'il ne reste rien lance "Add an hour window for at least one day."

## Réservation et argent

`sessionPriceCents` est le tarif horaire fois la durée, divisé par 60. Si la case du sponsor est cochée, ce prix est multiplié par `0.98`.

`bookAppointment` accepte un `payMethod` de `google_pay` ou `venmo`. Venmo est un lien profond construit dans la carte de réservation :

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Le nom d'utilisateur est stocké sans `@` et réduit aux lettres, chiffres, `_` et `-`. Il n'y a pas d'OAuth Venmo ni de webhook de paiement. Un `pay_status` de `demo_authorized` signifie que le lien a été ouvert, pas que Venmo a confirmé l'argent.

Les créneaux viennent des blocs de l'accompagnant dans son fuseau horaire, moins les rendez-vous déjà réservés. Les durées sont seulement 30, 60, 90 et 120.

## Humeur, notes, médicaments

Un membre peut écrire n'importe lequel des sept derniers jours, pas seulement aujourd'hui. Le graphique et la liste de la semaine sélectionnent tous les deux le jour que `saveMood` écrit.

Un accompagnant voit une note seulement quand tout ceci est vrai :

1. La note n'est pas vide.
2. `mood_entries.share_with_counselors` est vrai.
3. Le `share_mood` du rendez-vous est vrai.
4. La date de la note est dans les 14 jours qui finissent à la date de la visite.

Les médicaments utilisent le même interrupteur de visite plus leur propre marque de partage. Ils ne sont pas limités à cette fenêtre de dates. Le membre a écrit la liste. Ce n'est pas un dossier d'ordonnance.

`getDashboard` doit continuer à renvoyer les humeurs si tu ajoutes une colonne. Une requête qui lance ici fait ressembler Today à un enregistrement raté. La page Today écrit aussi l'humeur enregistrée dans le cache React Query avant de recharger, pour qu'un rafraîchissement lent ne vide pas le graphique.

## Vidéo

[src/components/video-room.tsx](../../src/components/video-room.tsx) ouvre la caméra, puis interroge `call_presence` et `call_signals`. Le membre et l'accompagnant créent tous les deux des offres. Si les deux ont une offre locale, le membre garde la sienne et l'accompagnant revient en arrière et répond.

Le minuteur démarre quand `remoteLive` devient vrai, puis décompte `durationMin`. L'enregistrement est facultatif, local, et utilise `MediaRecorder` sur un flux mixé. Il n'est pas envoyé.

L'iPhone ne joue pas l'audio distant depuis un élément vidéo caché ou muet, et un `play()` plus tard est hors du toucher. Le `<video>` distant est muet. Un élément `<audio>` séparé joue la voix. Si `play()` est rejeté, la salle affiche **Tap to hear**. La vidéo d'aperçu locale reste muette pour que la salle ne fasse pas d'écho.

## Apparence

Clair est la valeur par défaut. Sombre pose `html.dark` et échange les jetons dans [src/styles.css](../../src/styles.css). Le choix est stocké dans le navigateur depuis l'onglet You ([src/lib/theme.ts](../../src/lib/theme.ts)). Ce n'est pas une colonne de base de données.

## Auth

E-mail et mot de passe, plus Apple, via Better Auth. Les boutons sociaux que l'hôte de l'aperçu ne prend pas en charge doivent échouer avec un message visible, pas un écran vide. Les fonctions serveur qui ont besoin d'une personne utilisent `authMiddleware`. Ne fais pas confiance à un id du corps de la requête.
