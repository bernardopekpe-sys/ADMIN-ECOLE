# Onboarding — créer le premier établissement et son compte Directeur

**Chemin recommandé : l'assistant intégré.** Une fois l'application déployée
et connectée à Supabase, ouvrez `/setup` — un formulaire crée l'établissement,
initialise les rôles et le plan comptable, crée la fiche du Directeur et lui
envoie une invitation par e-mail pour choisir son mot de passe. Cette page se
ferme d'elle-même dès qu'un établissement existe déjà (elle ne sert qu'au
tout premier démarrage).

**Chemin manuel (référence, ou en cas de problème avec `/setup`)** : les
étapes ci-dessous font exactement ce que fait l'assistant, mais à la main via
le SQL Editor Supabase (rôle `postgres`, qui contourne RLS — volontaire :
au tout premier instant, aucun `user_profile` n'existe encore pour satisfaire
`current_school_id()`).

## 1. Créer l'établissement

```sql
insert into schools (code, official_name, currency, timezone)
values ('CSM', 'Collège Sainte-Marie', 'XAF', 'Africa/Libreville')
returning id;
-- Notez l'id retourné : <school_id>
```

## 2. Initialiser les rôles et la comptabilité par défaut

```sql
select initialize_default_roles('<school_id>');
select initialize_default_accounting('<school_id>');
```

## 3. Créer le compte Supabase Auth du premier Directeur

Depuis le Dashboard Supabase → Authentication → Users → "Add user"
(ou via l'API Admin), créez un utilisateur avec un e-mail et un mot de passe
temporaire. Notez l'`id` généré (`auth_user_id`).

## 4. Créer la fiche personnel et le profil utilisateur

```sql
insert into personnel (school_id, registration_number, last_name, first_names, gender, role_function, base_salary)
values ('<school_id>', 'DIR-0001', 'Ndong Obiang', 'Jean', 'M', 'directeur', 0)
returning id;
-- <personnel_id>

insert into user_profiles (school_id, auth_user_id, personnel_id, full_name)
values ('<school_id>', '<auth_user_id>', '<personnel_id>', 'Jean Ndong Obiang')
returning id;
-- <user_profile_id>

insert into user_roles (school_id, user_profile_id, role_id)
select '<school_id>', '<user_profile_id>', id from roles
where school_id = '<school_id>' and name = 'Directeur';
```

## 5. Se connecter

L'utilisateur peut maintenant se connecter sur `/login` avec l'e-mail et le
mot de passe créés à l'étape 3 — `current_school_id()` résoudra correctement
son établissement pour toutes les policies RLS.

## 6. Étapes suivantes dans l'application

1. `/dashboard/etablissement` — compléter les informations de l'établissement
2. `/dashboard/annees-scolaires` — créer l'année scolaire en cours
3. `/dashboard/structure` — créer cycles, niveaux, classes
4. `/dashboard/frais` — définir le barème de frais
5. `/dashboard/eleves` — créer les fiches élèves
6. `/dashboard/inscriptions/nouveau` — inscrire les élèves (génère les frais automatiquement)
7. Créer au moins une ligne dans `cash_registers` (pas encore d'écran dédié — à faire en SQL en attendant : `insert into cash_registers (school_id, name) values ('<school_id>', 'Caisse principale');`)
8. `/dashboard/caisse` — ouvrir une session avant le premier encaissement
9. `/dashboard/paiements/nouveau` — enregistrer les premiers paiements
10. `/dashboard/fournisseurs` — créer les fournisseurs habituels
11. `/dashboard/depenses` — enregistrer, soumettre, faire valider par le Directeur, puis payer les dépenses
12. `/dashboard/banques` — créer les comptes bancaires
13. `/dashboard/comptabilite` — consulter plan comptable, journaux, grand livre, balance (alimentés automatiquement par les paiements/dépenses)
