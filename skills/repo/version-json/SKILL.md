---
name: version-json
description: Fait porter à une image applicative son propre journal de version — convention ADR-0004 MirAI next, format Dockerflow de Mozilla — quel que soit le langage (Python, Node, Go, Java, nginx statique…). Pose dans le dépôt : scripts/version_json.py copié tel quel, le bloc Dockerfile qui écrit /app/version.json AU BUILD depuis cinq build-args (VERSION, COMMIT, BUILD, CODE_DATE, SOURCE ; champs source, version, commit, build, code_date, changes, history = tout le CHANGELOG), la route GET /__version__ dans le langage du projet (JSON, 200, sans authentification, hors logs, « dev » hors image), un test, le câblage CI ou du script de build, et le contrôle « l'image dit la même chose que le tag ». Impose un CHANGELOG public, lisible hors projet, sans détail sensible ni trop technique, avec son contrôle lexical. Mode d'emploi développeur embarqué. Lecture seule par défaut (--check) ; n'écrit qu'avec --setup, jamais par écrasement ; ne pousse rien.
when_to_use: version.json, /__version__, __version__, Dockerflow, ADR-0004, note de version, noteur de versions, "l'image porte sa version", quelle version tourne en prod, exposer la version et le changelog de l'image, changelog dans l'image, build-args VERSION COMMIT BUILD CODE_DATE SOURCE, verify-version, version "dev" en prod, service d'exposition de version
argument-hint: '[--check (défaut, lecture seule + plan) | --setup (écrit après validation)] [--tag X.Y.Z (version attendue par le contrôle ; défaut = détectée)] [chemin du projet — sinon repo courant]'
allowed-tools: Read Grep Glob Bash(git status --short) Bash(git rev-parse HEAD) Bash(git log -1 --format=%cI) Bash(git describe --tags --always) Bash(git remote get-url origin) Bash(git check-ignore private/)
---

# version-json — l'image dit elle-même quelle version elle est

Tu poses dans un dépôt la convention **ADR-0004** de la plateforme MirAI next, alignée sur
[Dockerflow](https://github.com/mozilla-services/Dockerflow) : l'image embarque `/app/version.json`
écrit **au moment où elle est construite**, et l'application le sert sur **`GET /__version__`**.
Un noteur, dans le cluster, lit cette route par le Service interne pour rédiger la note de version
des testeurs — sans parler à GitHub. Sans la route, la version en service n'a pas de note.

> Pendant de `/cicd-cpin` (qui pose la chaîne de livraison) : ici on pose ce que l'image
> dit d'elle-même. Les deux se combinent : la CI passe les build-args, l'image les grave.

## Mode d'exécution (lire les arguments AVANT toute action)

- **`--check` — DÉFAUT** : lecture seule stricte. Tu détectes, tu composes, tu présentes le plan
  et le contenu complet des fichiers, et tu attends la validation humaine (Claude Code : mode
  plan, `ExitPlanMode`).
- **`--setup`** : après un `--check` validé, écrit les fichiers un par un, en expliquant chacun.
- `--tag X.Y.Z` : version attendue par le contrôle de fin ; sinon celle détectée à l'étape 1.
- Le reste = chemin du projet ; sinon repo courant.

## Règles

1. **`scripts/version_json.py` est copié tel quel** depuis le dossier de cette skill, qui en est la
   source de référence — jamais adapté ni réécrit : un seul script partout, c'est ce qui rend le
   noteur fiable. S'il existe déjà et diffère (version antérieure du script) : proposer la mise à
   jour, ne pas écraser sans accord.
2. **Les cinq `ARG` s'appellent `VERSION` (défaut `dev`), `COMMIT`, `BUILD`, `CODE_DATE`,
   `SOURCE`** (défaut vide). Jamais renommés : la CI de la plateforme les passe sous ces noms.
   Un `ARG` maison existant (`APP_TAG`, `IMAGE_TAG`…) se garde et s'**aliase** :
   `ARG VERSION=${ARG_EXISTANT}`.
3. **Hors image, la route répond l'objet « dev » à sept clés** (`version: "dev"`, listes et
   chaînes vides : `changes` et `history` valent `[]`). Jamais une erreur : une version inconnue n'est pas une panne.
4. **La route est sans authentification, hors schéma OpenAPI, hors logs d'accès, hors toute
   liste blanche ou barrière de middleware** (mode d'exécution, readiness gate, matcher d'auth).
   Lire CHAQUE liste de chemins du projet et la compléter — c'est là que ça casse en production.
5. **Ne jamais écraser.** Fusion ou nom voisin ; tout conflit est signalé, pas résolu en silence.
6. **Aucune valeur réelle ni secret.** `SOURCE` est l'URL publique du dépôt, jamais un remote
   qui porte un jeton. Rien de nominatif dans un fichier ou un rapport.
7. **Le CHANGELOG s'écrit pour un lecteur hors du projet, et il est public.** Servi tel quel sur
   `/__version__`, sans authentification : rien de sensible (hôtes, secrets, personnes,
   environnements), pas de détail technique précis (fichiers, fonctions, codes de lint), une phrase
   par changement visible, le bruit d'équipe regroupé. Un CHANGELOG reconstitué depuis git est un
   brouillon à reformuler. Consigne et exemples : [`references/changelog.md`](references/changelog.md).

## Étapes

1. **Détecter** (lecture seule) et remplir la table du rapport : langage et framework, fichier
   d'entrée du serveur ; Dockerfile(s), image de base (**Python présent ?**), `WORKDIR`, `USER`,
   `chmod` ; `.dockerignore` (liste blanche `*` ?) ; CI (fabnum-cicd → `BUILD_ARGS` ; GitHub
   maison ; GitLab ; aucune) et **tous** les chemins de build (scripts, compose, buildkit) ;
   source de version (release-please + `CHANGELOG.md`, fichier `VERSION`, `package.json`,
   `pyproject.toml`, `git describe`) ; routes de santé existantes et **toutes les listes de
   chemins** (filtres de logs, allowlists, exemptions, matchers) ; une route de version déjà là ?
2. **Composer les cinq pièces**, avec le contenu complet de chaque fichier et « nouveau /
   modifié à tel endroit » : (a) le script ; (b) le bloc Dockerfile —
   [`references/dockerfile.md`](references/dockerfile.md) ; (c) la route et son test —
   [`references/routes.md`](references/routes.md) ; (d) les build-args dans la CI ou les
   scripts de build — [`references/ci.md`](references/ci.md) ; (e) le contrôle « l'image dit la
   même chose que le tag », avec `scripts/verif-version.sh` copié si un job ou un script l'appelle ;
   (f) le contrôle du CHANGELOG, `scripts/verif-changelog.py`, dans le pipeline de pull request.
3. **Présenter** (`--check`) : détection, plan, fichiers, et la liste de ce qui n'est **pas** fait.
4. **Écrire** (`--setup`), puis **vérifier** (section suivante).
5. **Rapport** : fait / **pas fait** / à trancher par l'humain. Inline en `--check` ; en
   `--setup`, dans `private/version-json.md` si `git check-ignore private/` réussit, sinon
   inline avec la ligne `private/` à ajouter au `.gitignore` proposée, pas appliquée.
6. **Remettre au développeur** [`references/mode-d-emploi.md`](references/mode-d-emploi.md) :
   le pointer dans le rapport, et en résumer l'essentiel dans la doc du projet (une section courte).

## Vérifications de fin (toutes doivent passer)

- `docker build` du projet avec les cinq `--build-arg` (commande composée à l'étape 2).
- `bash <skill>/scripts/verif-version.sh --image <img> --tag <X.Y.Z> --commit <sha>` : sept clés,
  `version` et `commit` égaux à l'attendu.
- Le test ajouté passe **avec la suite complète** du projet, pas seul.
- `python3 <skill>/scripts/verif-changelog.py CHANGELOG.md` : aucun motif sensible ; les
  avertissements de détail technique sont listés dans le rapport, reformulés ou assumés.
- Si l'application démarre sans dépendance : `verif-version.sh --url http://localhost:<port>`
  → 200, `application/json`, sept clés. Sinon le test unitaire fait foi, et le rapport le dit.
- `git status --short` : uniquement les fichiers annoncés.

---

**Cible / options demandées** : $ARGUMENTS

Si la ligne ci-dessus montre encore un nom de variable, ton agent ne substitue pas les arguments :
prends-les dans la demande de l'utilisateur.
