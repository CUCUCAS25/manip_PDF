# Runtime Python Windows (embeddable)

Le dossier `win/` est genere par `npm run bundle:python-win` (telechargement Python embeddable + pip + pypdf/reportlab).
Il est ignore par Git et inclus dans l'installateur NSIS via `electron-builder` (`extraResources` -> `python-runtime`).
