# 02 - Architecture Technique (Role Architecte)

## 1. Vision d'architecture
L'application sera une **desktop app locale, cross-platform**, construite autour d'une separation claire:
- **UI Desktop** pour l'experience utilisateur et le rendu interactif,
- **Core Engine local** pour les traitements PDF lourds,
- **Orchestrateur de jobs** pour les operations longues (batch, conversion, compression),
- **Module IA local optionnel** execute exclusivement sur la machine.

Objectif architectural: livrer vite un socle solide (MVP), puis etendre sans rework majeur.

---

## 2. Principes directeurs
- **Offline-first strict**: aucune dependance runtime a des services cloud.
- **Boring tech, predictable delivery**: stack mature, ecosysteme stable.
- **Modularite**: chaque capacite metier dans un module isole.
- **Asynchrone par defaut** pour traitements couteux.
- **Observabilite locale**: logs, traces operationnelles et telemetry locale desactivee par defaut.

---

## 3. Choix de stack recommande

### 3.1 Application desktop
- **Electron + TypeScript** pour UI multi-plateforme.
- **React** (ou equivalent) pour composants UI editor.
- **pdf.js** pour rendu et preview des pages.

### 3.2 Moteur PDF local
- **Python 3.11+** en service local embarque:
  - `PyMuPDF (fitz)` pour manipulation/rendu performant,
  - `pikepdf`/`PyPDF2` pour operations structurelles,
  - `reportlab` pour generations/overlays cibles.

### 3.3 Couche communication interne
- **IPC Electron** (UI <-> main process),
- **Localhost loopback API** (main process <-> service Python),
- Contrat API versionne (OpenAPI local).

### 3.4 IA locale
- **Provider abstraction**:
  - GPT4All / llama.cpp (selon OS/capacites machine),
  - execution opt-in, modeles geres localement.

Rationale: Electron couvre parfaitement le besoin UX desktop; Python apporte maturite et vitesse de livraison sur PDF.

---

## 4. Architecture logique (composants)

### 4.1 Frontend (Renderer Process)
- Workspace multi-onglets.
- Canvas d'edition (texte, formes, images, dessin).
- Timeline d'actions (undo/redo).
- File queue UI pour batch processing.

### 4.2 Desktop Main Process
- Gestion fenetres/fichiers/permissions.
- Broker IPC.
- Lancement/supervision du service Python.
- Gestion autosave et recuperation crash-safe.

### 4.3 PDF Engine Service (Python)
- Module `editing`: annotations, overlays, transformations.
- Module `document_ops`: fusion, split, extraction.
- Module `optimize`: compression image/objet.
- Module `conversion`: PDF <-> formats cibles.
- Module `security`: password, signature, redaction.
- Module `diff`: comparaison texte/images.

### 4.4 Job Orchestrator
- File de jobs persistante locale (SQLite).
- Etats: queued, running, succeeded, failed, cancelled.
- Retry controle pour jobs non destructifs.

### 4.5 Data Layer locale
- **SQLite** pour metadonnees (jobs, preferences, historique).
- **Filesystem workspace** pour assets temporaires et snapshots.
- Chiffrement local optionnel pour donnees sensibles.

---

## 5. Architecture de donnees (vue simplifiee)
- `documents`: id, path, hash, pages, last_opened_at
- `sessions`: tab_state, zoom, current_page, unsaved_changes
- `jobs`: type, payload_json, status, progress, error
- `history_events`: document_id, action_type, action_payload, ts
- `settings`: key, value_json

Format de travail:
- Document source immutable + calque operations jusqu'au commit/sauvegarde.
- Snapshots incrementaux pour undo/redo performant.

---

## 6. Flux techniques critiques

### 6.1 Edition interactive
1. UI emet une commande d'edition (ex: add_text).
2. Main process valide et route vers PDF Engine.
3. Engine applique operation sur working copy.
4. Preview page regeneree (partielle) et renvoyee.
5. Event historise pour undo/redo.

### 6.2 Batch conversion/compression
1. UI soumet N jobs.
2. Job Orchestrator persiste et planifie.
3. Workers executent en parallele borne.
4. Progression retournee a l'UI (stream d'etat).

### 6.3 IA locale (resume/traduction)
1. Extraction texte locale depuis PDF.
2. Passage au provider IA local.
3. Resultat injecte dans panneau resultat/export.
4. Aucune sortie reseau autorisee.

---

## 7. Securite & conformite (100% local)
- Blocage explicite des appels externes par configuration.
- Registre des actions sensibles (signature, redaction, decrypt).
- Redaction irreversible: suppression verifiable du contenu source.
- Politique de fichiers temporaires: retention courte + purge.
- Mode prive optionnel: ne persiste pas l'historique.

---

## 8. Exigences de performance
- Ouverture initiale PDF (300 pages standard): cible < 3s.
- Navigation page suivante: cible < 120ms (cache chaud).
- Operation fusion 10 PDFs moyens: feedback progressif + timeout gere.
- UI jamais bloquee: tout traitement long hors thread UI.

Techniques:
- lazy loading des pages,
- cache bitmap/page intelligent,
- parallelisme borne selon CPU/RAM.

---

## 9. Strategie de livraison par phases

### Phase A - MVP socle
- Rendu PDF, edition de base, fusion/split/extract, compression basique, password.
- Undo/redo, autosave, multi-onglets.

### Phase B - Productivite
- Conversion prioritaire + batch.
- Signature numerique.
- Redaction.

### Phase C - Avance
- Diff texte/images.
- Workflows automatises.
- Resume/traduction IA locale.

---

## 10. Decisions d'architecture (ADR rapides)
- **ADR-01**: Desktop local via Electron (adopte).
- **ADR-02**: Moteur PDF en service Python embarque (adopte).
- **ADR-03**: Orchestration de jobs via SQLite locale (adopte).
- **ADR-04**: IA locale derriere interface provider abstraite (adopte).
- **ADR-05**: API interne versionnee pour decoupler UI et engine (adopte).

---

## 11. Risques techniques et contre-mesures
- **Fidelite conversion Office**: limiter formats MVP + matrice de tests golden files.
- **Variabilite perf machine utilisateur**: profils de performance (eco/standard/turbo).
- **Complexite editor**: architecture commande (command pattern) pour undo/redo fiable.
- **Signature/certificats**: encapsuler via module dedie et jeux de tests de conformite.
- **Poids des modeles IA**: telechargement explicite + check ressources avant execution.

---

## 12. Definition of Done architecture (pre-implementation)
- Contrats API internes definis et versionnes.
- POC valide pour rendu/edition de base sur 3 OS.
- Benchmarks initiaux executes sur PDF de reference.
- Strategie de gestion erreurs et recovery documentee.
- Plan de tests techniques (perf, fiabilite, securite locale) approuve.

---

## 13. Recommandation architecte
Demarrer avec une architecture modulaire simple (Electron + service Python local) permet de livrer rapidement les fonctions coeur tout en gardant une trajectoire claire vers les capacites avancees. Le succes dependra surtout de la discipline sur les contrats internes, la gestion asynchrone des jobs et les tests de performance multi-plateforme tres tot.

---

## 14. Mise a jour (CDC UX/UI V02) : implications d'architecture

Cette section complete l'architecture existante en prenant en compte :
- `00-Cahier_des_charges.V02.md` (ameliorations UX/UI),
- `01-Analyse.md` (section 12: impacts/priorites/criteres).

### 14.1 Principes d'implementation (UX drive architecture)
- **User journeys first**: les parcours coeur (ouvrir PDF, ajouter/editer texte, zoom, suppression onglet) pilotent les decisions techniques et les tests.
- **Separation des responsabilites UI**: isoler les comportements interactifs (edition/drag/resize) pour limiter les regressions.
- **Safety by design**: toute action destructive doit etre reversible (undo/toast) ou confirmer de maniere progressive (si et seulement si risque de perte).

### 14.2 Modulaire UI (Renderer) : couches et composants
Recommandation d'organisation (sans imposer React, mais en s'inspirant des bonnes pratiques composant) :
- **UI Shell**
  - barre d'actions (regroupement Fichier/Annotation/Affichage),
  - zone onglets,
  - status bar / zoom,
  - panneaux contextuels (ex: proprietes texte).
- **Document Viewer**
  - rendu multi-pages (pdf.js),
  - gestion du scroll/zoom (ancre de zoom, raccourcis ctrl+molette).
- **Annotation Layer**
  - objets (text, formes, images),
  - selection/deselection,
  - gestuelle (drag, resize, double clic edition).

Objectif: minimiser le coupling entre "rendu PDF" et "interaction annotation".

### 14.3 Systeme de notifications (toast) et actions reversibles
Pour supporter la recommandation V02 "suppression onglet sans risque" :
- Introduire un **Toast Manager** cote renderer (file de toasts, auto-dismiss, action "Annuler").
- Exposer un contrat minimal :
  - `toast.show({ message, actionLabel, onAction, timeoutMs })`
  - `toast.dismiss(id)`
- Pour la fermeture d'onglet : conserver temporairement l'etat retire (tab + annotations) pendant la fenetre d'annulation.

### 14.4 IA de l'interface (menus / progressive disclosure)
Pour reduire la charge cognitive (V02) :
- Regrouper les operations "lourdes" (fusion/split/compress/protect) dans un menu unique **Outils PDF**.
- Architecturalement, ces actions doivent rester des **commands** envoyees au main process / service Python (pas de logique metier dans l'UI).

### 14.5 Accessibilite (contrats UI)
Exigences a integrer dans l'architecture UI :
- Focus visible et ordre de tabulation logique.
- Raccourcis clavier documentes et coherents (tooltips).
- Cibles cliquables adequates (44x44 pour actions frequentes) => guidelines CSS et composants.

### 14.6 Observabilite locale & privacy (impact V02)
Pour aligner "confiance" et "local-only" :
- Logs renderer: **pas de PII** ni chemins complets; preferer identifiants courts et statuts.
- Messages UI: utilitaires et actionnables, sans details techniques.
- Ajouter une convention de logs structurels (categorie, event, champs) et filtrage par niveau.

### 14.7 Strategie de tests (non regression UX)
Pour limiter le risque de regressions sur interactions (analyse 12.5) :
- **E2E** (Playwright Electron) verrouilles sur parcours coeur :
  - ouverture PDF,
  - suppression onglet,
  - ajout champ texte,
  - edition + sortie edition,
  - deselection hors annotation.
- **Tests d'interaction** (optionnel) : matrice manuel souris/trackpad + resolution/zoom OS.
- **Golden signals**: temps d'ouverture, temps de rendu 1ere page, temps de zoom (budget performance).

### 14.8 ADR complementaire (a ajouter a la liste existante)
- **ADR-06 (propose)**: Toast Manager et actions destructives reversibles (adopte si undo feasible).
- **ADR-07 (propose)**: Regroupement UI et progressive disclosure via menu "Outils PDF" pour operations lourdes.

