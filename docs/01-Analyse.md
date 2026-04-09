# 01 - Analyse Business (Rôle Analyste)

## 1. Synthèse analytique
Le besoin exprime une ambition forte: construire une alternative locale a I Love PDF avec edition, conversion, securite et fonctions IA. Le point critique est la combinaison de trois contraintes majeures: **100% local**, **multi-plateforme**, et **large couverture fonctionnelle**.  
Pour maximiser la valeur et reduire le risque, la strategie recommandee est une livraison par paliers, avec un **MVP cible sur les operations coeur PDF** avant les fonctions IA et les workflows avances.

---

## 2. Objectifs business reformules
- Fournir une solution souveraine (donnees locales uniquement) pour particuliers/professionnels.
- Remplacer plusieurs outils PDF disparates par une application unique.
- Reduire le temps de traitement documentaire (edition, fusion, conversion, protection).
- Offrir une experience moderne (preview instantane, drag-and-drop, undo/redo, multi-onglets).

---

## 3. Perimetre fonctionnel structure

### 3.1 Domaine A - Edition PDF
- Texte: ajout, style, couleur, alignement, transparence, suppression.
- Formes: insertion, redimensionnement, style contour.
- Dessin libre: tracage, epaisseur/couleur, gomme.
- Images: insertion, deplacement, rotation, transparence, suppression.

### 3.2 Domaine B - Operations documentaires
- Fusion multi-fichiers.
- Division / extraction de pages.
- Compression / optimisation.
- Conversion PDF <-> formats bureautiques/images/TXT.
- Traitement par lots.

### 3.3 Domaine C - Securite et conformite
- Mot de passe (protection/deprotection).
- Signature numerique.
- Redaction/censure (masquage irreversible a preciser).
- Comparaison de versions PDF.

### 3.4 Domaine D - IA locale et automatisation
- Resume automatique.
- Traduction.
- Workflows automatises (chaines d'actions).

---

## 4. Exigences non fonctionnelles (NFR)
- **Confidentialite**: zero transmission externe par defaut.
- **Portabilite**: Windows/macOS/Linux avec comportement coherent.
- **Performance**: ouverture/modification rapides de PDF volumineux.
- **Fiabilite**: historique d'edition, undo/redo stable, autosave optionnel.
- **Compatibilite**: PDF 1.7 et versions anterieures.
- **UX**: interactions directes, latence visuelle faible sur apercu.

---

## 5. Hypotheses et points a clarifier
1. **Definition du "100% local"**  
   - Les modeles IA sont-ils pre-installes, telecharges une fois, ou fournis par l'utilisateur?
2. **Niveau de fidelite de conversion**  
   - Quels seuils de qualite sont acceptables pour Word/Excel/PPT?
3. **Signature numerique**  
   - Besoin de certificats qualifies (eIDAS) ou signatures simples?
4. **Comparaison PDF**  
   - Priorite au texte seulement au debut, ou texte + images des la V1?
5. **Redaction/censure**  
   - Obligation d'effacement irreversible des donnees source.
6. **Performance cible**  
   - Taille maximale des PDF et SLA attendus (ex: ouverture < 3s pour 300 pages).

---

## 6. Priorisation recommandee (MoSCoW)

### Must Have (MVP)
- Ouverture/affichage PDF robuste.
- Edition de base (texte/images/formes).
- Fusion, division, extraction.
- Compression basique.
- Protection par mot de passe.
- Undo/redo + sauvegarde fiable.

### Should Have
- Conversion multi-formats.
- Traitement par lots.
- Signature numerique.
- Redaction de contenu.

### Could Have
- Comparaison avancee texte+images.
- Workflows automatises.
- IA resume/traduction locale.

### Won't Have (phase initiale)
- Ecosysteme plugin tiers complexe.
- Fonctions collaboratives cloud.

---

## 7. Risques principaux et mitigations
- **Risque technique - conversion haute fidelite**  
  Mitigation: cadrer des formats prioritaires et definir des metriques de qualite.
- **Risque performance sur gros PDF**  
  Mitigation: rendu paresseux (lazy), cache de pages, pipeline asynchrone.
- **Risque UX (trop de fonctions en meme temps)**  
  Mitigation: design progressif par modes/outils.
- **Risque conformite securite (redaction, signature)**  
  Mitigation: exigences juridiques explicites + tests de non-regression.
- **Risque IA locale (poids modeles / latence)**  
  Mitigation: modeles optionnels, profils materiel, fallback desactive.

---

## 8. Proposition de roadmap produit

### Phase 1 - Socle PDF (MVP)
- Visualisation, edition de base, fusion/division, compression, mot de passe.
- UX: drag-and-drop, preview, historique.

### Phase 2 - Productivite
- Conversions prioritaires.
- Batch processing.
- Signature et redaction.

### Phase 3 - Intelligence locale
- Resume/traduction offline.
- Workflows automatises.
- Comparaison avancee.

---

## 9. Criteres d'acceptation produit (niveau macro)
- L'application fonctionne offline sans fuite de donnees.
- Les fonctions MVP couvrent au moins 80% des cas d'usage de base.
- Les operations coeur sont stables sur Windows/macOS/Linux.
- Les gros PDF restent exploitables avec des temps de reponse acceptables.
- L'utilisateur peut annuler/refaire sans corruption de document.

---

## 10. Backlog initial conseille (epics)
- Epic 1: Moteur de document PDF et rendu.
- Epic 2: Edition visuelle (texte/formes/images/dessin).
- Epic 3: Operations de fichiers (fusion/division/compression/conversion).
- Epic 4: Securite documentaire (mot de passe/signature/redaction).
- Epic 5: UX transverse (tabs, historique, autosave, preview).
- Epic 6: IA locale et workflows.

---

## 11. Recommandation analyste
Pour proteger delai, budget et qualite, il faut verrouiller d'abord le perimetre MVP et ses metriques (performance, fidelite, stabilite), puis n'integrer l'IA qu'apres validation du socle PDF. Cette sequence maximise la valeur livree tout en limitant la dette technique.

---

## 12. Mise a jour (CDC UX/UI V02) : impact, priorites, criteres

### 12.1 Synthese des ameliorations UX/UI proposees (V02)
Le cahier des charges UX/UI V02 (`00-Cahier_des_charges.V02.md`) introduit une logique de **reduction de friction** sur les parcours coeur :
- comprendre et utiliser sans ambiguite les modes **edition texte vs deplacement**,
- reduire le risque d'erreurs sur les actions destructives (fermeture d'onglet),
- diminuer la charge cognitive via une barre d'actions plus lisible,
- ameliorer la lisibilite du texte sur tout type de document,
- ajouter un onboarding minimal et des affordances (tooltips + raccourcis),
- renforcer l'accessibilite (focus visible, tailles de cibles, contraste),
- rendre les performances plus predictibles (progression rendu).

### 12.2 Traceabilite vers les objectifs business
- **Souverainete / confiance**: messages non techniques, pas de fuite d'infos (chemins, contenu) dans UI/logs.
- **Productivite**: moins d'essais/erreurs (modes clairs) => temps de modification reduit.
- **Adoption**: onboarding minimal + barre simplifiee => prise en main plus rapide.
- **Reduction des erreurs**: undo/confirmation progressive sur suppression onglet => baisse des pertes de travail.

### 12.3 Priorisation recommandee (MoSCoW) des chantiers UX/UI
#### Must Have (a faire avant extension fonctionnelle)
- Clarification des modes (indications, etat "Edition", curseurs coherents).
- Actions destructives "sans risque" (toast + Annuler / confirmation conditionnelle).
- Simplification de la barre du haut (groupes + menu "Outils PDF").

#### Should Have
- Lisibilite texte via presets (Stylo / Surligneur) + option halo/contour.
- Tooltips + raccourcis, et messages de status actionnables.
- Accessibilite (focus visible, tailles cibles, contraste).

#### Could Have
- Indicateur de progression rendu multi-pages (x/y).
- Lazy-render des pages non visibles (si necessaire pour gros PDF).

### 12.4 Criteres d'acceptation (niveau macro, testables)
- **Decouvrabilite**: un nouvel utilisateur ajoute et edite un texte en < 60s sans aide.
- **Zero confusion de mode**: double-clic sur texte n'initie pas de drag (taux d'echec < 1% sur 20 essais).
- **Destruction reversible**: un onglet ferme par erreur est recuperable via "Annuler" dans la fenetre de temps definie.
- **Accessibilite**: navigation clavier possible sur actions principales (ouvrir, ajouter texte, zoom, supprimer).
- **Confiance**: l'UI n'affiche pas de chemins complets ni details sensibles; logs non verbeux par defaut.

### 12.5 Risques et mitigations (specifiques UX/UI V02)
- **Risque**: ajout de toasts/menus augmente la complexite technique.
  - **Mitigation**: composants UI minimalistes, pas de dependances lourdes, tests e2e sur parcours coeur.
- **Risque**: regression sur interactions (drag/resize/dblclick).
  - **Mitigation**: verrouiller des tests e2e "parcours texte" + matrice de tests manuels (souris/trackpad).
- **Risque**: surcharge de la barre d'etat (messages).
  - **Mitigation**: messages courts, auto-dismiss, priorite aux actions utilisateur.

### 12.6 Impact roadmap
Ces chantiers UX/UI doivent etre executes **dans la Phase 1 (Socle PDF)** car ils conditionnent :
- la fiabilite percue,
- la rapidite de prise en main,
- et la reduction des tickets "regressions interaction".
