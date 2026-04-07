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
