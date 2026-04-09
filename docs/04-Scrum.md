# 04 - Scrum (Role Scrum Master)

## 1. Cadre Scrum du projet

### 1.1 Sprint cadence
- Sprint length: 2 semaines.
- Ceremonies: Planning, Daily, Review, Retrospective, Refinement hebdomadaire.
- Definition: cadence stable pour reduire le risque de derive scope/qualite.

### 1.2 Team operating model
- Product Owner: priorisation backlog et arbitrages valeur.
- Scrum Master: facilitation, suppression impediments, qualite des stories.
- Dev Team: implementation, tests, demo increments.
- QA (integree sprint): verification continue sur AC + non regression.

### 1.3 Working agreements
- WIP limite par developpeur pour reduire le multitache.
- Toute story doit etre "Ready" avant engagement sprint.
- Aucun travail "stealth": toute tache est tracee en backlog.

---

## 2. Definition of Ready (DoR)
Une story est **Ready** si:
- Objectif utilisateur explicite.
- Critères d'acceptation testables.
- Dependances identifiees.
- Estimation relative (story points) assignee.
- Donnees de test et environnement precises.
- Risques/assumptions notes.

Checklist DoR (go/no-go):
- [ ] Pourquoi (valeur) est clair
- [ ] Quoi (scope) est delimite
- [ ] Comment (approche) est faisable
- [ ] Tests (AC) sont executables

---

## 3. Definition of Done (DoD)
Une story est **Done** si:
- Code implemente + revu.
- Tests unitaires/integration passes.
- AC valides par QA/PO.
- Aucun blocage critique connu.
- Documentation technique minimale mise a jour.
- Build exécutable sur OS cible de sprint.

DoD qualite supplementaire:
- UI non bloquante pour operations longues.
- Aucun appel reseau non autorise.
- Regressions critiques absentes sur parcours J1/J2/J3.

---

## 4. Backlog structure (epics -> stories)

### Epic E1 - Socle applicatif desktop
Objectif: disposer d'une base execution stable multi-plateforme.

Stories candidates:
- E1-S1: Initialiser shell desktop (fenetre, menus, tabs).
- E1-S2: Ouvrir/afficher PDF multi-pages.
- E1-S3: Sauvegarde locale et autosave optionnel.
- E1-S4: Gestion erreurs/recovery session.

### Epic E2 - Edition interactive
Objectif: couvrir l'edition de base a forte valeur.

Stories candidates:
- E2-S1: Ajout/edition/suppression texte.
- E2-S2: Ajout/edition/suppression formes.
- E2-S3: Insertion/manipulation images.
- E2-S4: Dessin libre + gomme.
- E2-S5: Undo/redo robuste.

### Epic E3 - Operations documentaires
Objectif: traiter les operations coeur de productivite.

Stories candidates:
- E3-S1: Fusion de PDF.
- E3-S2: Split + extraction de pages.
- E3-S3: Compression basique.
- E3-S4: Queue de jobs et progression UI.

### Epic E4 - Securite MVP
Objectif: livrer la protection de base document.

Stories candidates:
- E4-S1: Password protect.
- E4-S2: Password unprotect.
- E4-S3: Journal d'actions sensibles.

### Epic E5 - Stabilisation MVP
Objectif: garantir fiabilite/performance release R1.

Stories candidates:
- E5-S1: Profiling perf PDF volumineux.
- E5-S2: Hardening erreurs sur fichiers corrompus.
- E5-S3: Test matrix Windows/macOS/Linux.

---

## 5. Sprint plan propose (R1 MVP)

## Sprint 1 (Foundation)
Sprint Goal: ouvrir un PDF et le manipuler en session locale.

Scope cible:
- E1-S1, E1-S2, E1-S3
- E5-S2 (partiel)

Exit criteria:
- PDF affichable, navigation pages OK.
- Sauvegarde manuelle + autosave basique.

## Sprint 2 (Core editing)
Sprint Goal: permettre l'edition visuelle essentielle.

Scope cible:
- E2-S1, E2-S2, E2-S3
- E2-S5 (version initiale)

Exit criteria:
- Texte/formes/images operationnels.
- Undo/redo sur operations couvertes.

## Sprint 3 (Document operations)
Sprint Goal: livrer productivite operationnelle.

Scope cible:
- E3-S1, E3-S2, E3-S3, E3-S4

Exit criteria:
- Fusion/split/compression disponibles.
- UI de progression jobs active.

## Sprint 4 (Security + hardening MVP)
Sprint Goal: securiser et stabiliser avant release.

Scope cible:
- E4-S1, E4-S2, E4-S3
- E5-S1, E5-S3

Exit criteria:
- Password protect/unprotect valide.
- Benchmarks MVP tenus sur PDF de reference.

---

## 6. Story template (obligatoire)
Format standard pour chaque story:

- **ID**: E?-S?
- **Titre**: action + resultat utilisateur
- **En tant que**: persona cible
- **Je veux**: capacite
- **Afin de**: valeur
- **Acceptance Criteria (Given/When/Then)**: minimum 3
- **Definition of Done spécifique**: tests + evidences
- **Dependencies**
- **Risques**
- **Estimation (SP)**

---

## 7. Exemple de story "Ready" (reference)

ID: E3-S1  
Titre: Fusionner plusieurs PDF en un document unique  
En tant que: assistante administrative  
Je veux: selectionner plusieurs PDFs et les fusionner  
Afin de: produire un dossier unique a partager rapidement

Acceptance Criteria:
1. Given plusieurs PDFs valides, When je lance fusion, Then un seul PDF est genere dans l'ordre choisi.
2. Given un fichier invalide dans la liste, When je lance fusion, Then une erreur explicite est affichee sans planter l'app.
3. Given une fusion en cours, When je consulte la tache, Then la progression est visible jusqu'au statut "success" ou "failed".

DoD specifique:
- Tests unitaires des cas nominal + erreur.
- Test integration avec 3 jeux de fichiers.
- Demo en Review avec resultat exporte.

---

## 8. Risques sprint et plan anti-derives
- Risque surcharge scope: gel scope apres planning (exceptions PO explicites).
- Risque stories floues: gate DoR obligatoire.
- Risque dette qualite: reserve capacite sprint (20%) pour hardening/tests.
- Risque blocage technique: spike time-boxe max 1 jour puis decision.

---

## 9. Metrics Scrum de pilotage
- Sprint Goal success rate.
- Commitment reliability (% stories done vs engagees).
- Defect leakage (bugs detects post-sprint).
- Cycle time median par story.
- Rework rate (stories re-ouvertes).

Thresholds d'alerte:
- Commitment reliability < 70% sur 2 sprints consecutifs.
- Defect leakage critique > 2 par sprint.

---

## 10. Ceremonies agenda (checklist court)

### Sprint Planning (90-120 min)
- [ ] Sprint Goal defini
- [ ] Capacite equipe calculee
- [ ] Stories Ready uniquement
- [ ] Risques majeurs identifies

### Daily (15 min)
- [ ] Progress vers Sprint Goal
- [ ] Blocages et aide demandee
- [ ] Re-planification micro si besoin

### Review (60 min)
- [ ] Demo increment Done
- [ ] Validation AC par PO
- [ ] Feedback utilisateurs/stakeholders

### Retro (45 min)
- [ ] Keep / Problem / Try
- [ ] 1-2 actions max avec owner/date

---

## 11. Recommandation Scrum Master
Priorite execution: maintenir des stories petites, testables et strictement alignees au Sprint Goal. La cle du succes R1 est la discipline DoR/DoD et la protection active du scope pour livrer un MVP fiable en 4 sprints.

---

## 12. Mise a jour (CDC UX/UI V02) : epics & stories "anti-regression"

Cette mise a jour est alignee avec :
- `00-Cahier_des_charges.V02.md` (P0/P1/P2 UX/UI),
- `01-Analyse.md` (section 12: impacts, priorites, criteres),
- `02-Architecture.md` (section 14: modularite UI, toast manager, observabilite locale, strategie E2E),
- `03-Product.md` (section 13: FR-13/14/15 + NFR-06/07/08 + metriques UX).

### 12.1 Objectif de delivery (Sprint Goals et protections)
Objectif Scrum : livrer un socle UX **non regressif** sur les parcours coeur :
- ouvrir PDF -> naviguer/zoomer,
- ajouter un texte -> editer -> sortir edition,
- fermer un onglet -> recuperer via "Annuler",
avec **tests E2E** comme garde-fou.

### 12.2 Ajustement DoR (Definition of Ready) - checklist V02
Une story est "Ready" uniquement si elle inclut :
- **Scenario de non regression** explicite (ce que la story ne doit pas casser).
- **AC UX** mesurables (ex: "< 3s pour comprendre le mode", "undo 5-8s").
- **AC securite/observabilite**: pas de PII/chemins complets dans UI/logs (NFR-06).
- **Plan de test**: au minimum 1 test E2E ajoute/maj (si story touche J1/J2/J3).

### 12.3 Ajustement DoD (Definition of Done) - focus UX/qualite
En plus du DoD existant, une story V02 est "Done" si :
- **E2E** couvre le parcours impacte (ou est mis a jour sans flakiness).
- **Accessibilite** verifiee: focus visible + navigation clavier sur l'element ajoute/modifie.
- **Observabilite locale**: logs standard sans chemins complets ni contenu sensible; messages UI actionnables sans details techniques.

### 12.4 Nouvelles stories candidates (P0 -> P2)
#### Epic E6 - UX P0 : Modes clairs (edition vs deplacement)
Objectif: supprimer la confusion mode et reduire les faux drags.

- **E6-S1: Affordance "Double-clic pour editer"**
  - En tant que: utilisateur (Persona C - Lina)
  - Je veux: voir une micro-indication au survol d'un champ texte non edite
  - Afin de: comprendre instantanement comment modifier le texte
  - AC (Given/When/Then):
    1. Given un champ texte non en edition, When je survole, Then un hint "Double-clic pour editer" apparait sans masquer le texte.
    2. Given je passe en edition, When le champ est editant, Then le hint disparait.
    3. Given un PDF charge, When je navigue/zoome, Then le hint n'apparait pas sur des zones non-textes.
  - DoD specifique: verifie clavier (Tab + focus), non regression drag.

- **E6-S2: Etat explicite "Edition" + rappel sortie**
  - AC:
    1. Given edition active, When le champ est en edition, Then un badge discret "Edition" est visible.
    2. Given edition active, When je clique dehors, Then l'edition se termine et le badge disparait.
    3. Given edition active, When j'appuie sur Echap, Then l'edition se termine sans perdre le texte.

- **E6-S3: Curseurs coherents**
  - AC:
    1. Given champ texte non edite, When je survole, Then curseur "deplacement" (ou standard) est affiche.
    2. Given champ texte en edition, When je survole le contenu, Then curseur "texte" est affiche.

#### Epic E7 - UX P0 : Actions destructives sans risque (onglets)
Objectif: rendre la fermeture d'onglet recuperable.

- **E7-S1: Toast "PDF retire" + action Annuler (5-8s)**
  - AC:
    1. Given un onglet ouvert, When je clique ✕, Then l'onglet disparait et un toast "PDF retire" apparait avec bouton "Annuler".
    2. Given le toast est visible, When je clique "Annuler" sous 8s, Then l'onglet revient avec son etat (annotations incluses).
    3. Given 8s ecoulees, When je n'ai pas annule, Then le toast disparait et l'undo n'est plus propose.
  - Securite: aucun chemin complet n'est affiche dans le toast.

- **E7-S2: Confirmation conditionnelle (si perte potentielle)**
  - AC:
    1. Given l'onglet contient des modifications non sauvegardees, When je clique ✕, Then une confirmation est affichee.
    2. Given aucune modification non sauvegardee, When je clique ✕, Then aucune confirmation n'apparait (toast uniquement).

#### Epic E8 - UX P0 : Simplification barre du haut (charge cognitive)
Objectif: regrouper actions, isoler operations lourdes.

- **E8-S1: Regroupement visuel Fichier/Annotation/Affichage**
  - AC:
    1. Given interface chargee, When j'observe la barre, Then les actions sont groupees en 3 zones coherentes.
    2. Given nouvel utilisateur, When il cherche "Ouvrir / Ajouter texte / Zoom", Then ces actions sont localisables en < 5s.

- **E8-S2: Menu "Outils PDF" pour operations lourdes**
  - AC:
    1. Given la barre d'actions, When je clique "Outils PDF", Then je vois fusion/split/compress/protect.
    2. Given je lance une operation lourde, When elle demarre, Then un etat/progression est visible (ou un statut clair).

#### Epic E9 - UX P1 : Lisibilite texte (presets)
Objectif: texte lisible sur fonds varies sans micro-ajustements constants.

- **E9-S1: Preset Stylo / Surligneur**
  - AC:
    1. Given un champ texte selectionne, When je choisis "Stylo", Then fond transparent + halo leger s'appliquent.
    2. Given un champ texte selectionne, When je choisis "Surligneur", Then fond semi-transparent s'applique sans rendre le texte illisible.

- **E9-S2: Option Halo/Contour on/off**
  - AC: bascule appliquee uniquement au champ selectionne; non regression export/affichage.

#### Epic E10 - UX P1 : Onboarding minimal + tooltips raccourcis
- **E10-S1: Message post-ouverture actionnable**
  - AC: "PDF charge — Cliquez sur + Texte..." apparait apres ouverture, disparait ensuite.
- **E10-S2: Tooltips avec raccourcis**
  - AC: tooltips incluent Ctrl+O/Ctrl+S/Ctrl+Molette/Suppr/Ctrl+Z/Y.

#### Epic E11 - UX P1 : Accessibilite & ergonomie
- **E11-S1: Focus visible + ordre de tabulation**
  - AC: Tab permet d'atteindre actions principales; focus visible.
- **E11-S2: Cibles 44x44 pour actions frequentes**
  - AC: zoom + croix onglet atteignent la taille cible sans casser layout.

#### Epic E12 - UX P2 : Performance percue (progression rendu)
- **E12-S1: Progression rendu pages x/y**
  - AC: pendant rendu multi-pages, l'utilisateur voit "Rendu x/y" et ne croit pas a un crash.
- **E12-S2: Lazy render (optionnel)**
  - AC: pages hors viewport rendues a la demande, sans flash visuel.

### 12.5 Tests (gate anti-regression)
Pour toute story P0/P1 qui touche l'interaction :
- Ajout/maj d'au moins un **E2E** sur :
  - ouverture PDF,
  - fermeture onglet + undo,
  - ajout + edition texte + sortie edition,
  - zoom (Ctrl+Molette) et centrage,
  - deselection clic hors annotation.

### 12.6 Ajustement du plan de sprints (re-sequencing recommande)
Sans supprimer le plan existant, recommandation de sequencing au sein de R1 :
- **Sprint 1**: socle rendu + navigation + zoom + E2E base.
- **Sprint 2**: edition texte + modes clairs (E6) + tests E2E edition.
- **Sprint 3**: safe delete onglets (E7) + simplification UI (E8) + E2E fermeture/undo.
- **Sprint 4**: accessibilite + onboarding + perfs perçues (E10/E11/E12) + hardening.
