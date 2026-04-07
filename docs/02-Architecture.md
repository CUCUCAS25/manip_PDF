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
