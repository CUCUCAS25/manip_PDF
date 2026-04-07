# 06 - Test Matrix (E5-S3)

## Objectif
Valider les parcours critiques MVP sur Windows/macOS/Linux avec priorite sur stabilite et non-regression.

## Environnements cibles
- Windows 10/11
- macOS (dernieres 2 versions majeures)
- Linux Ubuntu LTS

## Matrice fonctionnelle
- Ouvrir PDF simple / volumineux
- Navigation pages
- Session save/load + autosave
- Recovery session corrompue
- Annotations texte/forme/image (add/edit/delete/drag)
- Undo/Redo annotation
- Merge/Split/Compression jobs
- Protect/Unprotect jobs
- Journal actions sensibles

## Matrice non-fonctionnelle
- Perf ouverture 300 pages (<3s cible)
- UI reactivite sous job en cours
- Crash recovery
- Robustesse fichiers invalides/corrompus

## Evidence attendue
- Captures de sortie jobs
- Export des logs sensibles
- Resultats benchmark script `app/python/benchmark_pdf_ops.py`
- Rapport de defects par OS
