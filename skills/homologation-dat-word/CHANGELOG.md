# Changelog — homologation-dat-word

Versions notables de la logique de rendu `.docx`. Versionnement `vMAJEUR.MINEUR`.

## [v1.0] — 2026-06-21

### Ajouté
- `render_docx.py` : rend un DAT MirAI au format ministériel `.docx` **sur le modèle**
  `MODELE_DAT_MirAI.docx` (skill sœur `homologation-dat`) à partir d'un Markdown fidèle à la
  structure du modèle.
- Conservation de la **page de garde** (renseignée : service / version / date ; mention « — MODÈLE »
  retirée) et du champ **Sommaire (TOC)** ; suppression de la page « Comment utiliser » et de tous les
  **encadrés d'instruction « ✎ »**.
- Application des **styleId réels** du modèle (`Heading1/2/3`), **saut de page avant chaque section de
  niveau 1**, `keep_with_next` sur les titres.
- Rendu des **tableaux** Markdown (en-tête répété `tblHeader`, lignes `cantSplit`, bordures légères),
  **listes** (`ListParagraph` + glyphe •), **blocs de code** (police à chasse fixe), **gras** `**…**`.
- **TOC** marqué « dirty » + `settings/updateFields=true` (sommaire peuplé à l'ouverture ; repli F9).
- Robustesse : détection des repères du modèle (how-to / Sommaire / TOC) **y compris TOC encapsulé dans
  un `w:sdt`** ; relocalisation du `w:sectPr` en fin de corps.

### Dépendance
- `python-docx` (≥ 1.0).
