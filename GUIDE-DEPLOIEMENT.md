# Guide de déploiement — sans terminal, via GitHub (glisser-déposer)

Ce guide suppose que tu as déjà un compte Supabase et un compte Netlify.
Aucune commande à taper nulle part — tout se fait dans le navigateur.

---

## Étape 1 — Créer un compte GitHub

1. Va sur https://github.com et clique sur **Sign up**.
2. Choisis un nom d'utilisateur, ton e-mail, un mot de passe. Valide ton e-mail.

## Étape 2 — Créer un dépôt (« repository »)

1. Une fois connecté, clique sur le **+** en haut à droite → **New repository**.
2. Nom du dépôt : `erp-scolaire` (ou ce que tu veux).
3. Laisse-le en **Private** (recommandé, ce n'est pas un projet open source).
4. Ne coche aucune case (« Add a README », etc.) — laisse tout vide.
5. Clique sur **Create repository**.

## Étape 3 — Envoyer les fichiers du projet (glisser-déposer)

1. Sur la page du dépôt tout neuf, tu verras un lien **uploading an existing
   file** (ou « télécharger un fichier existant ») — clique dessus.
   (Si tu ne le vois pas : bouton **Add file** → **Upload files**.)
2. Sur ton ordinateur, dézippe `erp-scolaire-app.zip` que je t'ai fourni.
   Tu obtiens un dossier `erp-scolaire-app` contenant `package.json`,
   `src`, `supabase`, etc.
3. Ouvre ce dossier dans l'explorateur de fichiers (Finder sur Mac,
   Explorateur sur Windows) et **sélectionne tout son contenu** (pas le
   dossier lui-même, ce qu'il y a DEDANS : `package.json`, `src`,
   `supabase`, `README.md`, etc.) puis glisse le tout dans la zone
   d'upload de GitHub, dans ton navigateur.
4. Attends que la barre de progression se termine (ça peut prendre une
   minute, il y a ~160 fichiers).
5. Tout en bas de la page, clique sur **Commit changes**.

Si GitHub refuse d'un coup tous les fichiers (rare, mais ça arrive avec
beaucoup de petits fichiers) : fais-le en deux fois — d'abord le dossier
`src` avec `package.json`, `tsconfig.json`, `next.config.mjs`,
`netlify.toml`, `.gitignore`, `.env.example`, `README.md`, `ONBOARDING.md`
et `GUIDE-DEPLOIEMENT.md` ; puis un second upload pour le dossier
`supabase`.

## Étape 4 — Connecter Netlify à ce dépôt GitHub

1. Sur https://app.netlify.com, clique sur **Add new site** → **Import an
   existing project**.
2. Choisis **GitHub** — la première fois, Netlify te demande d'autoriser
   l'accès à ton compte GitHub (clique sur Authorize).
3. Sélectionne le dépôt `erp-scolaire` que tu viens de créer.
4. Netlify détecte automatiquement Next.js grâce au fichier
   `netlify.toml` déjà présent dans le projet — ne change rien aux
   réglages de build proposés.
5. **Avant de cliquer sur Deploy**, va dans **Add environment variables**
   (ou fais-le juste après le premier déploiement, dans
   **Site configuration → Environment variables**) et ajoute trois
   variables — tu les récupères à l'étape 5 ci-dessous :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Clique sur **Deploy**.

## Étape 5 — Récupérer les clés Supabase

1. Sur https://app.supabase.com, ouvre ton projet (ou crées-en un nouveau
   si celui que tu as n'est pas encore dédié à ce projet : **New project**,
   choisis un nom, un mot de passe de base de données — note-le quelque
   part de sûr — et une région proche, par exemple Europe).
2. Dans le menu de gauche : **Project Settings** (icône engrenage) →
   **API**.
3. Tu y trouves :
   - **Project URL** → à coller dans `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (sous « Project API keys ») → à coller dans
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (cliquer sur « Reveal » pour la voir) → à coller
     dans `SUPABASE_SERVICE_ROLE_KEY` — **ne partage jamais cette clé,
     elle donne un accès total à la base, contourne toute sécurité**
4. Retourne dans Netlify, colle les trois valeurs dans les variables
   d'environnement créées à l'étape 4, puis redéclenche un déploiement :
   **Deploys** → **Trigger deploy** → **Deploy site**.

## Étape 6 — Appliquer les migrations SQL

1. Toujours sur Supabase : menu de gauche → **SQL Editor** → **New query**.
2. Ouvre, dans le dossier `supabase/migrations` du projet dézippé sur ton
   ordinateur, le fichier `0001_schema_core.sql`. Ouvre-le avec un simple
   éditeur de texte (Bloc-notes sur Windows, TextEdit sur Mac — clic droit
   → Ouvrir avec).
3. Sélectionne tout le contenu (Ctrl+A / Cmd+A), copie-le, colle-le dans
   la zone de requête SQL de Supabase.
4. Clique sur **Run** (ou Ctrl+Entrée). Vérifie qu'il n'y a pas d'erreur
   affichée en bas.
5. **Répète cette opération dans l'ordre exact des numéros** :
   `0001_schema_core.sql`, `0002_rls_et_fonctions.sql`,
   `0003_periodes_tranches.sql`, `0004_permissions_seed.sql`,
   `0005_frais_a_inscription.sql`, `0006_comptabilite_seed.sql`,
   `0007_paie_comptabilisation.sql`,
   `0008_v5_pedagogie_stock_cantine.sql`,
   `0009_vues_tableau_de_bord.sql`, `0010_retenues_absences.sql`,
   `0011_storage_documents.sql`.

   **Un fichier à la fois, dans cet ordre — chacun a besoin du précédent.**
   Si l'un d'eux affiche une erreur, arrête-toi là, copie-moi le message
   d'erreur exact et le numéro du fichier : je corrigerai.

## Étape 7 — Configurer l'authentification par e-mail (Supabase)

1. Menu de gauche → **Authentication** → **Providers**.
2. Vérifie que **Email** est activé (c'est le cas par défaut).
3. Menu **Authentication** → **URL Configuration** : renseigne dans
   **Site URL** l'adresse de ton site Netlify (visible dans Netlify,
   quelque chose comme `https://ton-site.netlify.app`) — sinon les
   e-mails d'invitation renverront vers la mauvaise adresse.

## Étape 8 — Créer le premier établissement

1. Ouvre l'adresse de ton site Netlify, en ajoutant `/setup` à la fin
   (exemple : `https://ton-site.netlify.app/setup`).
2. Remplis le formulaire (nom de l'établissement, code, ton nom et ton
   e-mail comme premier Directeur).
3. Valide. Un e-mail d'invitation Supabase arrive à l'adresse indiquée —
   ouvre-le, clique sur le lien, choisis un mot de passe.
4. Connecte-toi ensuite normalement sur `https://ton-site.netlify.app/login`.

## Étape 9 — Créer une caisse et un compte bancaire (les tout premiers)

Une fois connecté :
1. Menu **Caisse** → créer une caisse (ex. « Caisse principale »).
2. Menu **Banques** → créer un compte bancaire si besoin.
3. Menu **Années scolaires** → créer l'année en cours.
4. Tu peux ensuite suivre l'ordre logique : Structure → Frais → Élèves →
   Inscriptions → Paiements.

---

## Pour la suite : mettre à jour le code après une correction

Si je corrige un fichier suite à une erreur que tu me signales, tu devras
remplacer ce fichier sur GitHub :
1. Sur GitHub, navigue jusqu'au fichier concerné dans le dépôt.
2. Clique sur l'icône crayon (Edit) en haut à droite du fichier.
3. Supprime tout le contenu, colle le nouveau contenu que je t'aurai donné.
4. En bas de page, **Commit changes**.
5. Netlify redéploie automatiquement en 1 à 2 minutes à chaque changement.

---

## En cas de blocage

Dis-moi simplement à quelle étape tu es, et le message d'erreur exact
(capture d'écran décrite en mots, ou texte copié-collé) — je t'aiderai à
débloquer sans supposer que tu dois deviner quoi que ce soit.
