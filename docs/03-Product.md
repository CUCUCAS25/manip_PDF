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
