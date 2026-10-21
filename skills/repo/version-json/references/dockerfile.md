# Le bloc Dockerfile — écrire `/app/version.json` au moment où l'image se construit

Le fichier se fabrique **dans le build**, jamais à l'exécution ni à la main : c'est ce qui garantit
que l'image dit ce qu'elle est, où qu'elle tourne et quelle que soit la façon de la construire
(CI, poste, reconstruction dans le cluster). Le chemin est **toujours** `/app/version.json`, quel
que soit le `WORKDIR` : le contrôle et le noteur le cherchent là.

## Les cinq `ARG`, toujours sous ces noms

```dockerfile
ARG VERSION=dev
ARG COMMIT=
ARG BUILD=
ARG CODE_DATE=
ARG SOURCE=
```

Un build de poste sans build-args donne `version: "dev"` et des champs vides — c'est voulu. Un
`ARG` maison qui existe déjà (`APP_TAG`, `IMAGE_TAG`, `DM_IMAGE_TAG`…) **se garde** : on l'aliase,
`ARG VERSION=${DM_IMAGE_TAG}` (un `ARG` peut prendre pour défaut un `ARG` déclaré avant lui). Ainsi
un chemin de build qui ne connaît que l'ancien nom produit quand même la bonne version.

## Bloc A — l'image a Python (python:*, images applicatives Python)

```dockerfile
# Convention ADR-0004 MirAI next, alignée sur Dockerflow : l'image porte son journal en
# /app/version.json, servi sur /__version__. Les valeurs viennent de la CI (build-args) ;
# un build de poste donne « dev ». Posé avant USER : lisible par l'utilisateur non-root.
ARG VERSION=dev
ARG COMMIT=
ARG BUILD=
ARG CODE_DATE=
ARG SOURCE=
COPY scripts/version_json.py CHANGELOG.md* /tmp/version/
RUN python /tmp/version/version_json.py --version "$VERSION" --commit "$COMMIT" --build "$BUILD" \
      --code-date "$CODE_DATE" --source "$SOURCE" --changelog /tmp/version/CHANGELOG.md \
      --out /app/version.json \
 && chmod 0644 /app/version.json \
 && rm -rf /tmp/version
```

- `CHANGELOG.md*` : le glob rend la copie tolérante à l'absence du fichier (le premier motif
  matche toujours, donc `COPY` ne casse pas). Sans CHANGELOG, `changes` et `history` valent `[]`.
  Avec : `history` porte tout le fichier, section par section (50 versions au plus par défaut,
  `--history-max N` pour changer la borne).
- Placer le bloc **après** les `COPY` du code et **avant** `USER` / `useradd`.
- `chmod 0644` : sur un poste où les fichiers sont en `600`, `COPY` garde le mode et l'utilisateur
  du conteneur ne peut plus lire le fichier (« Permission denied »).

## Bloc B — l'image n'a pas Python (node, golang, JRE, distroless, nginx)

Une étape de préparation légère écrit le fichier, l'étape finale le copie. Le script reste le
même : on ne réécrit pas un générateur en shell (il faut parser le CHANGELOG, et l'invariant est
« un seul script partout »).

```dockerfile
FROM python:3.12-alpine AS version
WORKDIR /w
ARG VERSION=dev
ARG COMMIT=
ARG BUILD=
ARG CODE_DATE=
ARG SOURCE=
COPY scripts/version_json.py CHANGELOG.md* ./
RUN python version_json.py --version "$VERSION" --commit "$COMMIT" --build "$BUILD" \
      --code-date "$CODE_DATE" --source "$SOURCE" --changelog CHANGELOG.md --out version.json

FROM <image finale>
# … le reste du Dockerfile …
COPY --from=version --chmod=0644 /w/version.json /app/version.json
```

`--chmod` exige BuildKit (par défaut depuis Docker 23 ; sinon `RUN chmod` dans une étape qui a un
shell, ou accepter le mode d'origine). Image multi-architecture : `python:alpine` existe pour
amd64 et arm64, rien à faire.

## Bloc C — image nginx (application web statique, SPA)

Bloc B, plus la route dans la configuration nginx :

```nginx
location = /__version__ {
  access_log off;
  default_type application/json;
  alias /app/version.json;
}
```

Terminer le Dockerfile par `RUN nginx -t` : une configuration qui ne se charge pas doit casser la
construction, pas le déploiement. Si `root` vaut déjà `/app`, le fichier est aussi servi en
`/version.json` : inoffensif, le dire dans le rapport.

## `.dockerignore`

| Forme du fichier | Symptôme | Correction |
|---|---|---|
| liste blanche (`*` puis `!app`, `!requirements.txt`…) | `COPY failed: … scripts/version_json.py: not found` | ajouter `!scripts/version_json.py` et `!CHANGELOG.md` |
| liste noire qui exclut `scripts/` ou `*.md` | même symptôme | ajouter les deux négations **après** la ligne qui exclut |

Vérifier avant de composer : `grep -n '^\*$\|scripts\|\.md' .dockerignore`.

## Non-root, racine en lecture seule

La route ne fait que **lire** `/app/version.json`. Le fichier est écrit pendant le build, en
`0644`, avant `USER` : aucun droit d'écriture à l'exécution, compatible `readOnlyRootFilesystem`.

## Plusieurs Dockerfiles, plusieurs images

Un dépôt à plusieurs images (backend + frontend, workers) porte le bloc dans **chaque**
Dockerfile, avec le même `SOURCE` et la même `VERSION` : une release = un tag commun à toutes les
images. Chaque application sert sa propre route.
