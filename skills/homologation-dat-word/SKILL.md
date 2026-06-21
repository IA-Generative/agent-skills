---
name: homologation-dat-word
description: >-
  Rend un document d'homologation MirAI (DAT, à terme AIPD/dossier d'homologation) au format
  ministériel .docx, construit SUR le modèle officiel (page de garde, sommaire/TOC, styles), à partir
  d'un contenu Markdown fidèle à la structure du modèle. Étape de RENDU : ne produit pas le contenu
  (c'est le rôle de /homologation-dat) — il le met en forme Word. Déclencheurs : « génère le DAT
  en .docx », « mets le DAT au format ministériel/Word », « convertis le DAT en docx », « produis le
  document Word d'homologation ».
---

# Gen-doc-homologation-doc — rendu .docx ministériel

Cette skill **transforme un contenu d'homologation (Markdown) en `.docx` ministériel**, en s'appuyant
sur le **modèle officiel** `MODELE_DAT_MirAI.docx` (maintenu dans la skill sœur `homologation-dat`).
Elle est le **pendant « rendu »** de `/homologation-dat`, qui produit le **contenu**.

```
/homologation-dat         →   contenu Markdown fidèle au modèle (DAT_«service»_v0.1.md)
/homologation-dat-word     →   rendu .docx ministériel sur le modèle (DAT_«service»_v0.1.docx)
```

## Quand l'utiliser

- Après `/homologation-dat` (ou tout contenu Markdown respectant la structure du modèle), pour
  produire le livrable Word attendu au dossier d'homologation.
- Pour n'importe quel service : la skill est **générique** et réutilisable par tous les agents.

## Pré-requis

- **`python-docx`** (`pip install python-docx`). Si l'environnement courant ne l'a pas, l'installer
  dans un venv jetable.
- Le **modèle** `MODELE_DAT_MirAI.docx`. Par défaut la skill le lit dans la skill sœur
  (`../homologation-dat/dat/MODELE_DAT_MirAI.docx`) ; surchargeable via `--model`.

## Entrée attendue (contrat avec `/homologation-dat`)

Un Markdown **fidèle à la structure du modèle**, avec ce mapping de niveaux de titres :

| Markdown | → Style modèle | Exemple |
|---|---|---|
| `## `   | Heading 1 | `## 1. Propos liminaires` |
| `### `  | Heading 2 | `### 2.1 Objet du document` |
| `#### ` | Heading 3 | `#### 5.1.1 Description du service` |

Le titre `#` et le bloc de méta en tête (avant le premier `##`) sont **ignorés** (déjà sur la page de
garde). Sont rendus : **tableaux** Markdown (`| … |`), **listes** (`- `), **blocs de code** ```` ``` ````
(police à chasse fixe — pour l'ASCII des schémas), **citations** (`> `), **gras** (`**…**`).

> Les garde-fous de contenu (ne jamais inventer, aucune valeur réelle : IP/port d'écoute/hôte/clé,
> matrice des flux en port standard, `[À CONFIRMER]` / `N/A`) relèvent de `/homologation-dat`.
> Cette skill **ne fait que le rendu** et ne réécrit pas le contenu.

## Usage

```bash
python render_docx.py \
  --input  private/DAT_«service»_v0.1.md \
  --output private/DAT_«service»_v0.1.docx \
  --service "«Nom du service»" --version "v0.1" --date "21 juin 2026" \
  [--model /chemin/MODELE_DAT_MirAI.docx]
```

Sortie dans `private/` à la racine du repo cible (créer le dossier s'il manque + **garantir** qu'il
est ignoré dans `.gitignore` sous `# Sorties locales sensibles (audit, homologation) — ne pas committer`).
Tout va dans `private/` ; `homologation-output/` est **déprécié**.

## Ce que fait le rendu (sur le modèle, sans repartir d'une page blanche)

- **Conserve** la page de garde et le champ **Sommaire (TOC)** du modèle ; renseigne garde
  (service / version / date) et retire la mention « — MODÈLE ».
- **Supprime** la page « Comment utiliser ce modèle » et **tous les encadrés d'instruction « ✎ »**.
- **Remplace** le squelette de corps par le contenu fourni, avec les **styleId réels** du modèle
  (`Heading1/2/3` — l'accès par nom de style peut échouer, d'où l'usage du styleId).
- **Saut de page avant chaque section de niveau 1** ; `keep_with_next` sur les titres.
- **Tableaux** : en-tête répété (`tblHeader`), lignes **non sécables** (`cantSplit`), bordures légères.
- **TOC** marqué « dirty » + `settings/updateFields=true` → le sommaire se peuple à l'ouverture Word.
  Repli si vide : **Ctrl+A puis F9** (mettre à jour les champs).

## Limites connues

- Les **encadrés bleus de référence socle « ◆ »** du modèle ne sont pas réinjectés tels quels : le
  contenu Markdown doit déjà **porter le texte de socle** (conservé par `/homologation-dat`).
- Les **schémas** sont rendus en ASCII (police à chasse fixe). Pour un rendu image, insérer l'image
  manuellement après génération (le modèle accepte les images).
- Vérifier visuellement la pagination une fois ouvert dans Word et **mettre à jour le sommaire** (F9).

## Maintenance

Le **modèle** et les **garde-fous de contenu** vivent dans `homologation-dat`. Cette skill ne porte
que la **logique de rendu** (`render_docx.py`). Versionner les évolutions dans `CHANGELOG.md` (format
`vMAJEUR.MINEUR`). À pousser dans le dépôt de skills partagé `IA-Generative/skills-claude`
(`skills/homologation-dat-word/`) pour être disponible à tous les agents.
