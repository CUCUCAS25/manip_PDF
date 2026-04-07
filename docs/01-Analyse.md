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
