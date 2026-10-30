# Life Booster

[English](README.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Note :** Cette traduction est assistée par machine. L'anglais fait foi : [README.md](README.md).

[Comment mettre à jour les traductions](docs/TRANSLATIONS.md).

Une semaine de ce que tu ressens, et quelqu'un à qui parler. Les membres notent une humeur, gardent des notes, listent des médicaments et réservent une visite vidéo de 30, 60, 90 ou 120 minutes. Les accompagnants (dans l'application : counselors) publient un profil, des horaires et un nom d'utilisateur Venmo.

C'est du soutien par les pairs. Les accompagnants ne sont pas des thérapeutes agréés, ni des psychologues, ni des psychiatres, ni des soignants. Une visite n'est pas une thérapie, un diagnostic ou un traitement. Life Booster n'est pas responsable des conseils et peut retirer un accompagnant sans préavis. En cas de crise, appelle ou envoie un texto au 988.

## Ce que tu peux faire

| Onglet | Qui | Quoi |
|---|---|---|
| Today | Membre | Noter n'importe quel jour de cette semaine, voir la moyenne, ajouter des médicaments |
| Library | Toute personne connectée | Pratiques par sujet, accompagnants à suivre, réserver une visite |
| Visits | Les deux | Rendez-vous à venir et passés, puis la salle vidéo |
| Studio | Accompagnant | Biographie, spécialités, tarif horaire, horaires, nom d'utilisateur Venmo |
| You | Connecté | Nom affiché, apparence claire ou sombre |

La connexion se fait par e-mail et mot de passe, ou avec Apple. Les notes et les médicaments restent privés jusqu'à ce que le membre les marque comme partageables et active le partage pour cette visite.

## Paiement

La réservation ouvre un lien de paiement Venmo vers le nom d'utilisateur de l'accompagnant (`venmo.com`, `txn=pay`). Ce n'est pas une connexion marchande et cela ne confirme pas le paiement. Google Pay est une seconde option via la Payment Request API du navigateur. Apple Pay n'est pas proposé sur l'écran de réservation.

La remise optionnelle du sponsor est de 2 % (`AD_DISCOUNT` dans [src/lib/life/money.ts](src/lib/life/money.ts)). Les tarifs vont de $15 à $400 de l'heure.

## Lancement

```bash
npm run dev
```

L'application écoute sur le port 8080. `npm run typecheck` et `npm run build` doivent tous les deux réussir. Les changements de schéma vont dans un nouveau fichier sous [migrations/](migrations/). Ne modifie pas une migration déjà publiée, sauf pour l'empêcher de réensemencer des données.

Sans `DATABASE_URL`, le serveur utilise Postgres intégré (PGLite) et applique [migrations/](migrations/) au démarrage. Avec `DATABASE_URL`, `npm run db:migrate` applique les mêmes fichiers sur Neon.

## Disposition

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Le même guide, en français : [architecture](docs/fr/ARCHITECTURE.md) et [prompts](docs/fr/PROMPTS.md).

Les branches `main`, `web`, `ios` et `android` restent sur le même commit. Pousse les quatre ensemble.

## Règles du produit faciles à casser

- Un accompagnant apparaît dans People seulement quand son `standing` est `active` et qu'il a au moins une heure enregistrée.
- Les heures sont le jour de semaine `0` (dimanche) à `6`, calées sur 30 minutes, et la fin doit être après le début.
- N'ensemence pas d'accompagnants d'exemple (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Le partage, ce sont deux interrupteurs : la note ou le médicament est marqué partageable, et la visite a `share_mood`. Si l'un des deux est éteint, l'accompagnant ne le voit pas.
- Le minuteur de la visite démarre quand l'autre personne rejoint, et il décompte la durée réservée.
- L'iPhone joue la voix de l'autre personne sur son propre élément audio. La vidéo distante reste muette pour que le son ne reste pas coincé sur une image cachée.
