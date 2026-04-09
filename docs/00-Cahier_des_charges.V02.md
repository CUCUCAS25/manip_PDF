# Cahier des Charges – Améliorations UX/UI (V02)

> Ce document **ne remplace pas** `00-Cahier_des_charges.V01.md`.  
> Il liste **uniquement** les **modifications UX/UI** recommandées pour rendre l’application plus user friendly, et éviter les régressions.

## 1. Objectif
Rendre l’interface **plus simple, plus sûre, plus lisible** et **moins sujette aux erreurs** pendant les actions principales :
- ouvrir un PDF, naviguer et zoomer,
- ajouter et éditer du texte “comme écrit sur le document”,
- manipuler des objets (déplacer / redimensionner) sans confusion,
- éviter les pertes de travail et les erreurs (suppression d’onglet, etc.).

---

## 2. Recommandations UX/UI – Priorisées

### 2.1 P0 – Clarifier les “modes” (édition texte vs déplacement)
**Problème utilisateur**  
On confond facilement “déplacer” et “éditer”, ce qui entraîne des tentatives ratées et de la frustration.

**Changements à opérer**
- **Micro-indication au survol** d’un champ texte non édité : “Double-clic pour éditer”.
- **État explicite** quand un champ texte est en édition : badge discret “Édition” près du champ + rappel “ESC / clic dehors pour terminer”.
- **Cohérence curseur** : curseur “texte” seulement en édition, curseur “déplacement” hors édition.

**Critères d’acceptation**
- Un utilisateur comprend en < 3s comment éditer un texte sans essai/erreur.
- Aucune action “drag” ne se déclenche lors d’une intention de double-clic.

---

### 2.2 P0 – Actions destructives “sans risque” (supprimer un PDF/onglet)
**Problème utilisateur**  
La fermeture d’un onglet PDF est facile à faire par erreur.

**Changements à opérer**
- Au clic sur `✕` d’onglet : afficher un **toast** “PDF retiré” avec bouton **Annuler** (5–8s).
- Si un undo n’est pas possible immédiatement : confirmation uniquement si le PDF contient des annotations non sauvegardées (progressive disclosure).

**Critères d’acceptation**
- Une suppression d’onglet accidentelle est récupérable sans stress.

---

### 2.3 P0 – Simplifier la barre du haut (réduire la charge cognitive)
**Problème utilisateur**  
Trop d’actions visibles au même niveau. L’utilisateur ne sait pas où regarder.

**Changements à opérer**
- Regrouper visuellement en 3 zones (même ligne ou 2 lignes max) :
  - **Fichier** : Ouvrir PDF, Sauver session
  - **Annotation** : +Texte, +Forme, +Image, Supprimer, Undo/Redo
  - **Affichage** : Fit largeur / page, pages prev/next, zoom
- Mettre les opérations “lourdes” (fusion/split/compress/protect) dans un menu unique **“Outils PDF”** (dropdown).

**Critères d’acceptation**
- Un nouvel utilisateur identifie rapidement où se trouvent : Ouvrir, Ajouter texte, Zoom.

---

### 2.4 P1 – Lisibilité du texte sur n’importe quel document
**Problème utilisateur**  
Le texte peut devenir illisible selon le fond du PDF.

**Changements à opérer**
- Proposer 2 presets accessibles :
  - **Stylo** : fond transparent, halo léger (text-shadow)
  - **Surligneur** : fond semi-transparent (teinte + alpha)
- Option “Halo/Contour” activable/désactivable pour le texte sélectionné.

**Critères d’acceptation**
- Le texte reste lisible sur des fonds clairs/sombres sans devoir changer la couleur à chaque fois.

---

### 2.5 P1 – Onboarding minimal (guidage sans bruit)
**Changements à opérer**
- Après ouverture d’un PDF : message status “PDF chargé — Cliquez sur 🔤 + Texte pour annoter”.
- Tooltips enrichis avec raccourcis (Ctrl+O, Ctrl+S, Ctrl+Molette, Suppr, Ctrl+Z/Y).

**Critères d’acceptation**
- Un nouvel utilisateur ajoute un texte et le modifie sans aide externe.

---

### 2.6 P1 – Accessibilité et ergonomie
**Changements à opérer**
- Focus clavier visible sur tous les contrôles.
- Cibles cliquables ≥ 44×44px pour actions fréquentes (zoom, croix onglet).
- Contrastes conformes (UI et textes d’aide).

**Critères d’acceptation**
- Navigation clavier possible (Tab/Entrée/Echap) sur les actions principales.

---

### 2.7 P2 – Performance perçue (rendu PDF)
**Changements à opérer**
- Afficher un indicateur de progression lors du rendu multi-pages : “Rendu pages x/y…”.
- Optionnel : lazy-render des pages non visibles (si besoin perf).

**Critères d’acceptation**
- L’utilisateur comprend que l’app travaille et ne pense pas qu’elle a “planté”.

---

## 3. Contraintes (UX & Sécurité)
- **Local-only** : aucune donnée PDF ne sort de la machine.
- Ne jamais afficher de détails sensibles dans les messages (ex. chemins complets), ni dans les logs.
- Messages d’erreur utiles et actionnables (sans détails techniques exposés).

