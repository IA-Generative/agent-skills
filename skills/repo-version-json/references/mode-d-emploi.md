# Mode d'emploi — `/__version__`, pour le développeur

Vous venez de recevoir (ou d'ajouter) dans votre dépôt un fichier `scripts/version_json.py`, un bloc
dans le Dockerfile et une route `/__version__`. Voici pourquoi, ce que ça fait, et comment vérifier
que ça marche.

## Pourquoi

Quand votre image est en service, la plateforme doit savoir **quelle version tourne et ce qui a
changé**, pour l'afficher aux testeurs (« version 0.9.19 du 28 septembre », page « Ce qui a
changé »). La seule chose qui voyage de GitHub jusqu'au cluster sans intermédiaire, c'est l'image.
Donc l'image porte son propre journal : un fichier `version.json` écrit **au moment où elle est
construite**, et une route qui le sert. Un « noteur » côté plateforme appelle `GET /__version__`
sur votre service interne toutes les 10 minutes, reformule vos changements en langage clair, un
humain relit, puis la note est publiée. Sans la route, votre version apparaît **sans note**, et le
contrôle de la plateforme le nomme.

C'est la décision ADR-0004 de la plateforme MirAI next, alignée sur la spécification
[Dockerflow](https://github.com/mozilla-services/Dockerflow/blob/main/docs/version_object.md) de
Mozilla (une pratique établie, pas une convention maison).

## Quoi — le contrat

```json
{
  "source": "https://github.com/IA-Generative/mon-service",
  "version": "0.9.19",
  "commit": "9dd810d0b2c9d6d1d5a4c2f6a3b1e0c9d8f7a6b5",
  "build": "https://github.com/IA-Generative/mon-service/actions/runs/123456789",
  "code_date": "2026-09-28T09:12:44+02:00",
  "changes": [
    "### Features",
    "* la télémétrie garde les compteurs typés ([#34](…))"
  ],
  "history": [
    {"version": "0.9.19", "date": "2026-09-28", "changes": ["### Features", "* la télémétrie garde les compteurs typés ([#34](…))"]},
    {"version": "0.9.18", "date": "2026-09-06", "changes": ["### Bug Fixes", "* la lettre morte ne tue plus le worker"]}
  ]
}
```

| Clé | Sens | D'où ça vient |
|---|---|---|
| `source` | l'URL publique du dépôt | build-arg `SOURCE` |
| `version` | la version publiée, égale à l'étiquette de l'image et au tag git sans `v` | build-arg `VERSION` |
| `commit` | le SHA réellement construit — permet de détecter un tag réutilisé | build-arg `COMMIT` |
| `build` | le lien du run de CI ; vide sur un poste | build-arg `BUILD` |
| `code_date` | la date du commit, pas celle du build | build-arg `CODE_DATE` |
| `changes` | les lignes de la section de **cette** version dans `CHANGELOG.md` ; `[]` s'il n'y en a pas | le script lit le CHANGELOG |
| `history` | **tout l'historique** : une entrée par section du `CHANGELOG.md` (`version`, `date`, `changes`), la plus récente en tête, 50 versions au plus par défaut | le script lit le CHANGELOG |

La route : `GET /__version__`, réponse `200` en `application/json`, **sans authentification**,
hors du schéma OpenAPI, hors des logs d'accès. Hors image (tests, `uvicorn` sur votre poste), le
fichier n'existe pas et la route répond `"version": "dev"` avec les autres champs vides
(`changes` et `history` à `[]`). Ce n'est
pas une erreur : une version inconnue n'est pas une panne.

## Comment ça se fabrique

```
CI (ou script de build) ──build-args──▶ Dockerfile ──▶ scripts/version_json.py ──▶ /app/version.json ──▶ GET /__version__
   VERSION, COMMIT, BUILD,               ARG ×5           lit CHANGELOG.md,               dans l'image           lu par le noteur
   CODE_DATE, SOURCE                                      écrit le JSON
```

Vous n'avez rien à faire à chaque release : la CI passe les valeurs. Vous avez quelque chose à
faire si vous **ajoutez un chemin de build** (un script, un `compose`, un job) : lui faire passer
les mêmes build-args, sinon l'image dira `dev`.

## Vérifier en local

```bash
# 1. L'application, sans image : la route répond « dev »
curl -s http://localhost:8000/__version__ | jq

# 2. L'image, avec des valeurs : le fichier est écrit
docker build -t mon-service:essai \
  --build-arg VERSION=0.9.19 --build-arg COMMIT="$(git rev-parse HEAD)" \
  --build-arg CODE_DATE="$(git log -1 --format=%cI)" \
  --build-arg SOURCE=https://github.com/IA-Generative/mon-service .
docker run --rm --entrypoint cat mon-service:essai /app/version.json | jq

# 3. Le contrôle, le même que celui de la CI
bash scripts/verif-version.sh --image mon-service:essai --tag 0.9.19 --commit "$(git rev-parse HEAD)"

# 4. Le conteneur qui tourne
docker run --rm -p 8000:8000 mon-service:essai &
bash scripts/verif-version.sh --url http://localhost:8000
```

Image distroless (sans `cat`) : `verif-version.sh` extrait le fichier par `docker cp`. Si vous
n'avez pas le script : `docker create` + `docker cp <id>:/app/version.json .`.

## Garder ce qui a été fait avant

L'image ne porte pas seulement ce qui vient de changer : `history` reprend **toutes les sections**
du `CHANGELOG.md`, donc l'historique voyage avec l'image et se lit sur `/__version__` sans ouvrir
le dépôt. Deux conséquences :

- **le `CHANGELOG.md` est la mémoire du projet** : on y ajoute, on n'y retire jamais. Release-please
  fait exactement cela ;
- **un dépôt sans CHANGELOG démarre avec `history: []`**. Pour ne pas perdre le passé, on le
  reconstitue une fois depuis git : une section par montée du fichier de version (`git log -- VERSION`),
  commits entre deux montées groupés par type conventionnel, puis relecture humaine. C'est ce qui a
  été fait sur device-management (18 versions, un commit).

La borne par défaut est de 50 versions (`--history-max N` dans le `RUN` du Dockerfile). Chaque
entrée pèse quelques centaines d'octets : un projet à 50 versions rend ~20 Ko, ce que la route
sert sans peine toutes les 10 minutes.

## Sans `CHANGELOG.md`, sans release-please

- `version` vient d'où vous la tenez : fichier `VERSION`, `package.json`, `pyproject.toml`, ou
  `git describe --tags --always | sed 's/^v//'`. Le script de build la passe en `VERSION`.
- `changes` et `history` valent `[]` : la plateforme montre la version comme « note à écrire »,
  et quelqu'un la rédige à la main. Pour qu'ils se remplissent, tenez un `CHANGELOG.md` dont
  chaque section s'intitule `## [X.Y.Z] - AAAA-MM-JJ` (ou `## X.Y.Z`) : le script ne regarde que
  le titre, et prend la date entre parenthèses ou après un tiret.
- Le jour où release-please arrive (skill `repo-cicd-cpin`), il tient ce fichier pour vous.

## Pièges — symptôme, cause, remède

| Symptôme | Cause | Remède |
|---|---|---|
| `COPY failed … scripts/version_json.py: not found` au build | `.dockerignore` en liste blanche (`*`) ou qui exclut `scripts/` | ajouter `!scripts/version_json.py` et `!CHANGELOG.md` |
| `python: not found` au build | image de base sans Python (node, go, nginx, distroless) | étape `FROM python:3.12-alpine AS version` + `COPY --from=version` |
| `Permission denied: /app/version.json` à l'exécution | conteneur non-root, fichier copié en `600` depuis le poste | `chmod 0644` dans le `RUN`, avant `USER` |
| `200` en local, `401`/`403`/`404` en production | auth globale, allowlist de mode, `matcher` de middleware, ingress | ajouter `/__version__` à **chaque** liste de chemins ; la route est publique |
| `503` juste après le démarrage | readiness gate qui bloque tout tant que la config n'est pas chargée | exempter `/__version__` comme les sondes |
| logs d'accès saturés | le noteur appelle toutes les 10 minutes | filtrer comme `/healthz` (`access_log off`, filtre de logger, `morgan skip`) |
| `"version": "dev"` en production | un chemin de build n'a pas passé `VERSION` (compose, buildkit, script) | aliaser `ARG VERSION=${VOTRE_ARG}` ; ajouter le contrôle en CI |
| `"commit": ""` | `COMMIT` non passé | ajouter `--build-arg COMMIT=$(git rev-parse HEAD)` |
| `"changes": []` ou `"history": []` malgré un CHANGELOG | titre de section non reconnu, ou fichier hors du contexte de build | titres `## [X.Y.Z]` ; `!CHANGELOG.md` dans `.dockerignore` |
| `history` s'arrête à 50 versions | borne par défaut | `--history-max N` dans le `RUN` |
| `code_date` vide sur un `workflow_dispatch` | `github.event.head_commit` n'existe que sur `push` | `git log -1 --format=%cI` dans un job amont |
| `source` contient `user:token@` | `SOURCE` dérivé d'un remote authentifié | écrire l'URL publique en dur |
| le noteur ne voit rien alors que `curl` marche | le Service interne pointe un proxy qui ne relaie pas la route | `location = /__version__ { proxy_pass … }` |
| deux versions différentes dans l'admin et `/__version__` | une `ENV` maison et `version.json` alimentés séparément | même `ARG` source (alias) |

## Ce que ce dispositif ne fait pas

Il ne déploie rien, ne crée pas de tag, n'écrit pas la note lisible et ne la publie pas : c'est le
noteur et la relecture humaine côté plateforme. Il ne remplace pas `/healthz` : la version n'est
pas la santé.
