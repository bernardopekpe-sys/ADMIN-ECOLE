# ERP Scolaire — Projet V1 (noyau fonctionnel)

Implémentation du **V1 — Noyau** du plan de développement : établissement,
années scolaires, structure pédagogique, élèves, inscriptions, frais,
paiements/reçus, caisse — avec authentification et RLS multi-tenant.

## Stack

- Next.js 14 (App Router, Server Components + Server Actions) + TypeScript
- Supabase (PostgreSQL, Auth) via `@supabase/ssr`
- Déploiement Netlify

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase du projet
```

### Base de données

Appliquer les migrations dans l'ordre sur un projet Supabase vide :

```bash
supabase link --project-ref <id-projet>
supabase db push
```

1. `0001_schema_core.sql` — schéma complet
2. `0002_rls_et_fonctions.sql` — RLS multi-tenant + fonctions métier centrales
3. `0003_periodes_tranches.sql` — trimestres/paliers + tranches flexibles
4. `0004_permissions_seed.sql` — catalogue de permissions + rôles par défaut
5. `0005_frais_a_inscription.sql` — génération automatique des frais à l'inscription
6. `0006_comptabilite_seed.sql` — journaux + plan comptable minimal par établissement, paiement des dépenses
7. `0007_paie_comptabilisation.sql` — comptabilisation de la validation et du paiement de la paie
8. `0008_v5_pedagogie_stock_cantine.sql` — matières/notes, stock, cantine
9. `0009_vues_tableau_de_bord.sql` — vues trésorerie/impayés/résultat pour le tableau de bord
10. `0010_retenues_absences.sql` — retenues absences/retards : proposition puis validation humaine
11. `0011_storage_documents.sql` — bucket et policies Supabase Storage pour les documents

Puis **suivre `ONBOARDING.md`** pour créer le premier établissement et son
compte Directeur (étape obligatoire : sans elle, personne ne peut se
connecter).

```bash
npm run dev
```

## Ce qui est implémenté (fonctionnel de bout en bout)

| Écran | Chemin | Notes |
|---|---|---|
| Connexion / déconnexion | `/login` | Supabase Auth par e-mail/mot de passe |
| Tableau de bord | `/dashboard` | KPI de base ; agrégats financiers en TODO explicite |
| Établissement | `/dashboard/etablissement` | Lecture/édition des paramètres |
| Années scolaires | `/dashboard/annees-scolaires` | Création + génération auto des périodes (trimestre/palier) |
| Structure pédagogique | `/dashboard/structure` | Cycles, niveaux, classes |
| Élèves | `/dashboard/eleves`, `/nouveau`, `/[id]` | Fiche, échéancier, demande de remise |
| Inscriptions | `/dashboard/inscriptions/nouveau` | Génère automatiquement les frais applicables |
| Frais | `/dashboard/frais` | Types de frais + barème par classe/niveau/cycle |
| Paiements & reçus | `/dashboard/paiements`, `/nouveau`, `/[id]` | Ventilation sur tranches, numérotation atomique, propagation comptable complète |
| Caisse | `/dashboard/caisse` | Ouverture, clôture avec calcul d'écart |
| Fournisseurs | `/dashboard/fournisseurs` | Liste + création |
| Dépenses | `/dashboard/depenses`, `/nouveau`, `/[id]` | Workflow complet Brouillon → Soumise → **validation Directeur verrouillée en RLS** → Payée → Comptabilisée |
| Banques | `/dashboard/banques` | Comptes + mouvements |
| Comptabilité | `/dashboard/comptabilite/{plan-comptable,journaux,grand-livre,balance}` | Plan comptable éditable, journaux et écritures en lecture (générés automatiquement), grand livre par compte, balance avec contrôle d'équilibre |
| Budget | `/dashboard/budget` | Prévisionnel/réalisé/écart — réalisé calculé par agrégation applicative (pas de vue SQL dédiée) |
| Personnel | `/dashboard/personnel`, `/nouveau`, `/[id]` | Fiche, historique de salaire, création de compte utilisateur (Supabase Auth via clé service_role), avances, prêts, primes |
| Paie | `/dashboard/paie`, `/[id]` | Génération par lot, validation (comptabilisation charge + dette), paiement par bulletin (caisse ou banque) |
| Vie scolaire | `/dashboard/vie-scolaire/{absences,retards,discipline}` | Déclaration, justification, décisions disciplinaires |
| Pédagogie | `/dashboard/pedagogie/{matieres,notes}` | Matières, affectation classe/enseignant, évaluations et saisie des notes |
| Examens | `/dashboard/examens` | Création d'examen, inscription de candidats |
| Stock | `/dashboard/stock` | Catégories, articles, mouvements avec quantité tenue à jour par trigger, alerte seuil minimum |
| Cantine | `/dashboard/cantine` | Abonnements et présence quotidienne — tarifs/paiements réutilisent le module Frais existant |

Le tableau de bord (`/dashboard`) est branché sur les vues `v_treasury_summary`,
`v_unpaid_installments` et `v_monthly_result` (0009), chacune avec
`security_invoker = true` pour respecter la RLS multi-tenant de l'utilisateur
qui interroge, jamais celle du créateur de la vue.

La fiche élève permet aussi de téléverser des documents (Supabase Storage,
bucket privé `documents`, chemin `school_id/students/<id>/...`), avec les
policies d'isolation posées directement sur `storage.objects` (0011) — pas
seulement sur la table `documents`.

La caisse se crée maintenant directement depuis `/dashboard/caisse` (plus
besoin de SQL manuel). Les mouvements bancaires peuvent être marqués comme
rapprochés depuis `/dashboard/banques`. Les paiements, dépenses, le grand
livre et la balance s'exportent en CSV (`/api/exports/...`, respectent la
RLS de l'utilisateur connecté comme n'importe quelle autre requête).

Chaque action serveur appelle directement les fonctions PostgreSQL posées
dans les migrations (`process_student_payment`, `process_expense_payment`,
`process_payroll_payment`, `validate_payroll_period`, `generate_payroll`,
`get_next_number`, `close_cash_session`, `generate_student_fee_installments`,
`generate_fees_for_enrollment`) — la logique financière/comptable vit en
base, pas dans le code applicatif, conformément à la règle métier posée dès
le premier document d'architecture.

## L'ensemble du plan de développement (V1 à V5) est maintenant codé

Le tout premier démarrage se fait via `/setup` (assistant intégré : crée
l'établissement, les rôles, le plan comptable, et invite le premier
Directeur par e-mail) — plus besoin de SQL manuel pour démarrer une
instance neuve. `ONBOARDING.md` documente ce chemin en détail, plus une
procédure manuelle de secours.

Ce qui reste, honnêtement :

- Les exports sont en **CSV** (ouvrable directement dans Excel), pas en PDF
  natif pour les rapports financiers — suffisant pour l'usage tableur, mais
  pas un document mis en forme à imprimer
- Les bulletins de notes affichent la moyenne pondérée à l'écran mais ne
  génèrent pas encore de PDF imprimable

## Non testé

Ce code n'a pas été exécuté (pas d'accès réseau/npm dans l'environnement de
génération) : ni `npm install`, ni build, ni connexion à une vraie instance
Supabase. Il suit les conventions Next.js 14 / Supabase SSR de près, mais
prévoir une première passe de débogage (types exacts après
`npm run supabase:types`, ajustements de policies RLS selon les permissions
réellement nécessaires à l'usage) avant mise en production.

## Structure

```
src/
  middleware.ts              Rafraîchissement de session + garde d'authentification
  app/
    login/                    Connexion
    dashboard/
      layout.tsx               Menu latéral + déconnexion
      page.tsx                  Tableau de bord
      etablissement/
      annees-scolaires/
      structure/                 Cycles / niveaux / classes
      eleves/
      inscriptions/
      frais/
      paiements/
      caisse/
    globals.css                Design tokens + classes utilitaires (repris des maquettes)
  lib/
    supabase/                  Clients navigateur/serveur
    num-to-words.ts            Montant en lettres pour les reçus
    types/database.ts          Placeholder — à régénérer via `npm run supabase:types`
supabase/migrations/           0001 à 0005, dans l'ordre d'application
ONBOARDING.md                  Bootstrap du premier établissement (obligatoire)
```
