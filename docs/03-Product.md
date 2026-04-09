# 03 - Product (Role PM)

## 1. Product brief

### 1.1 Product name (working title)
Mani PDF Local

### 1.2 Problem statement
Les utilisateurs ont besoin d'un outil PDF complet sans exposer leurs donnees a des services en ligne. Les solutions cloud dominantes sont pratiques mais incompatibles avec certains contextes (confidentialite, conformite, environnement isole).

### 1.3 Product vision
Offrir une application desktop PDF locale, rapide et fiable, qui couvre les cas critiques d'edition et de traitement documentaire avant d'etendre vers l'automatisation et l'IA locale.

### 1.4 Target users
- Professionnels manipulant des documents sensibles (administratif, juridique, RH, finance).
- PME et independants cherchant une alternative locale a I Love PDF.
- Utilisateurs grand public avancés voulant une solution tout-en-un offline.

---

## 2. Objectifs produit et outcomes

### 2.1 Business goals
- Valider l'adoption d'une alternative locale multi-plateforme.
- Atteindre un usage regulier sur les operations PDF coeur.
- Reduire les frictions de traitement documentaire (temps, erreurs, outils multiples).

### 2.2 User outcomes
- Modifier un PDF sans outil externe en moins de 2 minutes.
- Executer fusion/split/compression avec retour visuel clair.
- Garder la confiance sur la confidentialite grace au 100% local.

### 2.3 Success metrics (MVP)
- 80% des cas d'usage de base couverts (edition/fusion/split/compression/password).
- < 3s d'ouverture pour PDF de reference 300 pages.
- Taux de completion des taches MVP > 90% sur tests utilisateurs cibles.
- Crash-free sessions > 99% sur environnement de test.

---

## 3. Scope produit (MVP -> V2)

### 3.1 MVP (Must)
- Ouverture/rendu PDF.
- Edition de base: texte, formes, images, dessin.
- Fusion, division, extraction de pages.
- Compression basique.
- Protection/deprotection par mot de passe.
- Undo/redo, autosave optionnel, multi-onglets.

### 3.2 V1.5 (Should)
- Conversion PDF <-> formats prioritaires.
- Traitement par lots.
- Signature numerique.
- Redaction/censure.

### 3.3 V2 (Could)
- Comparaison texte+images.
- Workflows automatises.
- Resume et traduction via IA locale.

### 3.4 Out of scope initial
- Collaboration cloud temps reel.
- Marketplace/plugins tiers.

---

## 4. Personas et JTBD

### Persona A - Claire (assistante administrative)
- Job to be done: "Quand je recois plusieurs documents, je veux les fusionner et les compresser rapidement pour les envoyer sans erreur."
- Critere de succes: traitement en quelques clics, pas de perte de qualite critique.

### Persona B - Marc (juriste)
- Job to be done: "Quand je traite un contrat confidentiel, je veux modifier, proteger et rediger des sections sans fuite de donnees."
- Critere de succes: confiance totale dans le mode local et la redaction irreversible.

### Persona C - Lina (consultante)
- Job to be done: "Quand je prepare un livrable, je veux corriger et enrichir un PDF sans rebasculer sur plusieurs apps."
- Critere de succes: fluidite de l'edition et rendu immediat.

---

## 5. Exigences produit (PRD condensé)

### 5.1 Functional requirements (MVP)
- FR-01: Importer et afficher des PDF multi-pages.
- FR-02: Ajouter/modifier/supprimer texte et styles.
- FR-03: Ajouter/modifier/supprimer formes.
- FR-04: Inserer et manipuler images (position, taille, rotation, transparence).
- FR-05: Dessin libre et gomme.
- FR-06: Fusionner plusieurs PDFs.
- FR-07: Diviser/extrait de pages par selection.
- FR-08: Compresser PDF avec niveaux de compression.
- FR-09: Verrouiller/deverrouiller par mot de passe.
- FR-10: Undo/redo fiable sur operations d'edition.
- FR-11: Multi-onglets.
- FR-12: Sauvegarde et autosave optionnel.

### 5.2 Non-functional requirements
- NFR-01: Aucune transmission reseau par defaut.
- NFR-02: Support Windows/macOS/Linux.
- NFR-03: Support PDF 1.7 et precedents.
- NFR-04: UI non bloquante lors des traitements longs.
- NFR-05: Temps de reponse conforme aux cibles de performance.

---

## 6. User journeys prioritaires

### J1 - Modifier un PDF
1. Ouvrir document.
2. Ajouter texte/formes/images.
3. Verifier preview.
4. Sauvegarder.

### J2 - Fusionner et compresser
1. Drag-and-drop de plusieurs fichiers.
2. Ordonner documents.
3. Fusionner.
4. Compresser resultat.
5. Exporter.

### J3 - Securiser un document
1. Ouvrir PDF sensible.
2. Appliquer mot de passe.
3. Verifier ouverture protegee.
4. Exporter.

---

## 7. Hypotheses produit a valider
- H1: Le besoin de souverainete locale est un facteur de choix majeur.
- H2: Un MVP focalise operations coeur apporte deja une forte valeur percue.
- H3: Les utilisateurs preferent vitesse et simplicite a une couverture exhaustive immediate.

Plan de validation:
- Tests utilisateurs rapides sur 3 personas.
- Mesure completion task/time-on-task.
- Collecte feedback qualite/fidelite des sorties.

---

## 8. Risks produit et mitigations
- Risque "trop de scope": imposer gates strictes MVP.
- Risque qualite conversion: deplacer en V1.5 avec criteres de fidelite explicites.
- Risque promesse IA prematuree: IA en phase V2 et optionnelle.
- Risque UX surchargee: parcours guides, UI progressive par outils.

---

## 9. Roadmap produit

### Release R1 (MVP)
- Duree cible: 8 a 12 semaines.
- Valeur: coeur d'usage PDF local fiable.

### Release R2
- Conversion + batch + securite avancee.

### Release R3
- IA locale + workflows.

---

## 10. Go-to-market interne (premiere traction)
- Canal initial: distribution directe desktop (installeur).
- Cible pilote: 10 a 20 utilisateurs metiers sensibles.
- Boucle d'apprentissage: interviews + telemetry locale consentie (optionnelle).

---

## 11. Decisions PM
- Priorite absolue: fiabilite des cas d'usage coeur avant extension fonctionnelle.
- Definition du succes: adoption repetitive sur 3 parcours (J1, J2, J3).
- Discipline de scope: toute fonctionnalite hors MVP exige preuve d'impact utilisateur.

---

## 12. Next artifacts recommandes
- `04-Epics-Stories` (decoupage executable pour dev).
- `05-Test-Strategy` (qualite, perf, securite offline).
- `06-Release-Plan` (milestones et criteres go/no-go).

---

## 13. Mise a jour (CDC UX/UI V02) : alignement produit

Cette section complete le document produit existant en prenant en compte :
- `00-Cahier_des_charges.V02.md` (delta UX/UI),
- `01-Analyse.md` (section 12: impacts/priorites/criteres),
- `02-Architecture.md` (section 14: implications d'architecture).

### 13.1 Pourquoi maintenant (valeur produit)
Le delta UX/UI V02 ne vise pas a "faire joli" : il vise a **reduire la friction** et **eviter les regressions** sur les parcours coeur (J1/J2/J3). Productivement, cela protege :
- **l'adoption** (prise en main rapide, moins d'essais/erreurs),
- **la confiance** (local-only, messages non sensibles),
- **la stabilite** (moins de tickets interactions, moins de crashs perçus).

### 13.2 Ajustements de scope (delta) : priorites P0/P1/P2
#### P0 (a faire avant extension fonctionnelle)
- **Modes clairs edition vs deplacement** (affordances, curseurs coherents, etat "Edition").
- **Actions destructives sans risque** (fermeture d'onglet recouvrable via toast + "Annuler", ou confirmation conditionnelle).
- **Simplification de la barre du haut** (regroupements + menu "Outils PDF" pour operations lourdes).

#### P1 (a faire apres P0, avant V1.5 si possible)
- **Lisibilite texte** (presets Stylo/Surligneur + option halo/contour).
- **Onboarding minimal** (status messages actionnables + tooltips avec raccourcis).
- **Accessibilite** (focus visible, cibles 44x44, contrastes).

#### P2 (optimisations et perfs perçues)
- **Progression rendu multi-pages** (x/y) et/ou **lazy render** des pages non visibles.

### 13.3 Impacts sur les exigences (PRD) et criteres d'acceptation
#### Impacts functional requirements (ajouts / precision)
- **FR-13 (UX modes)**: l'utilisateur comprend en < 3s comment editer vs deplacer un texte (indice + etat).
- **FR-14 (Onglets "safe delete")**: fermeture d'onglet recouvrable via "Annuler" (5-8s) ou confirmation seulement si risque de perte (annotations non sauvegardees).
- **FR-15 (Aide & raccourcis)**: tooltips mentionnent raccourcis (Ctrl+O, Ctrl+S, Ctrl+Molette, Suppr, Ctrl+Z/Y) et status message post-ouverture guide l'action suivante.

#### NFR (precision issue de V02 + Analyse + Architecture)
- **NFR-06 (Observabilite locale)**: logs/messages UI ne doivent pas exposer chemins complets ni contenu sensible (principe "privacy by default").
- **NFR-07 (Accessibilite)**: navigation clavier possible sur actions principales (Tab/Entree/Echap) + focus visible.
- **NFR-08 (Feedback / chargements)**: tout traitement long (rendu multi-pages, operations PDF) doit exposer un etat/progression.

#### Criteres d'acceptation (macro, testables)
- **Decouvrabilite**: nouvel utilisateur -> ajouter + editer un texte en < 60s, sans aide.
- **Zero confusion de mode**: double-clic edition n'initie pas de drag (taux d'echec < 1% sur 20 essais).
- **Destruction reversible**: onglet ferme par erreur recuperable via "Annuler".
- **Confiance**: UI/logs sans details sensibles (chemins, contenu).

### 13.4 Metriques de succes (MVP) : ajustements proposes
En plus des metriques existantes (perf ouverture, crash-free), ajouter des metriques "UX quality" :
- **Time-to-first-annotation (TTFA)**: temps median entre ouverture PDF et 1ere annotation texte (objectif: < 30s pour persona A/C).
- **Edit success rate**: taux de reussite "double-clic -> saisie -> sortie edition" (objectif: > 95% sur 20 essais).
- **Accidental destructive actions recovered**: % fermetures onglet annulees avec succes (objectif: 100% dans la fenetre d'undo).

### 13.5 Exigences securite (produit)
Conformement aux contraintes V02 "Local-only" et aux principes d'architecture :
- **Classification donnees**: PDF + annotations = potentiellement "confidentiel" (par defaut).
- **Network**: aucune emission reseau par defaut (telemetrie uniquement opt-in, locale si possible).
- **Logs**: pas de PII/chemins complets en niveau standard; event IDs et statuts uniquement.
- **Erreurs**: messages actionnables cote UI, details techniques cote log interne.

### 13.6 Roadmap : recommandation de sequencing
- **R1 (MVP - Socle PDF fiable)**: inclure P0 complet (modes + safe delete + simplification UI) car cela conditionne adoption et reduction des regressions.
- **R1.1**: P1 (presets lisibilite + onboarding + accessibilite).
- **R2**: P2 (progression rendu/lazy render) + conversion/batch + securite avancee.
