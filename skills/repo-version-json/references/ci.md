# Le câblage — d'où viennent les cinq valeurs, et qui vérifie que l'image dit vrai

Les cinq build-args ont une source de vérité chacun. Les noms ne changent jamais.

| Build-arg | Valeur | Dockerflow |
|---|---|---|
| `VERSION` | la version publiée, **sans le `v`** : `0.9.19` (étiquette d'image = tag git sans `v`) | `version` |
| `COMMIT` | SHA complet du commit construit | `commit` |
| `BUILD` | URL du run de CI qui a construit ; **vide** hors CI | `build` |
| `CODE_DATE` | date ISO 8601 du commit construit | extension `code_date` |
| `SOURCE` | URL **publique** du dépôt (`https://github.com/<org>/<dépôt>`), jamais un remote avec jeton | `source` |

## 1. CI fabnum-cicd (workflow réutilisable `build-docker`)

Le nom de l'input qui porte les build-args se **lit** dans le `cd.yml` existant ou dans le
`workflow_call` du tag appelé (règle « rien par cœur » de `repo-cicd-cpin`) ; au tag v0.19.3 il
s'appelle `BUILD_ARGS`. Extrait du `cd.yml` de `IA-Generative/mirai-apps-menu` :

```yaml
    with:
      IMAGE_NAME: ghcr.io/<org>/<dépôt>
      IMAGE_TAG: ${{ needs.release.outputs.version }}
      BUILD_ARGS: |
        VERSION=${{ needs.release.outputs.version }}
        COMMIT=${{ github.sha }}
        BUILD=${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        CODE_DATE=${{ github.event.head_commit.timestamp }}
        SOURCE=${{ github.server_url }}/${{ github.repository }}
```

`head_commit.timestamp` n'existe que sur `push` : sur `workflow_dispatch`, calculer la date dans un
job amont (`git log -1 --format=%cI`) et la passer en output. Sans `cd.yml` : renvoyer vers
`repo-cicd-cpin`, qui pose la chaîne ; cette skill n'écrit pas de pipeline de release.

### Le job de contrôle « l'image dit la même chose que le tag »

Après le build et le push, un job local (pas de `${{ }}` dans le `run:`, tout passe par `env:`) :

```yaml
  verify-version:
    needs: [release, build]
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: read
    env:
      IMAGE: ghcr.io/<org>/<dépôt>
      VERSION: ${{ needs.release.outputs.version }}
      COMMIT: ${{ github.sha }}
      ACTOR: ${{ github.actor }}
      TOKEN: ${{ github.token }}
      REPO: ${{ github.repository }}
    steps:
    - uses: actions/checkout@<sha épinglé>   # v4
    - name: Le tag git existe
      run: |
        git ls-remote --exit-code "https://x-access-token:${TOKEN}@github.com/${REPO}.git" "refs/tags/v${VERSION}" >/dev/null \
          || { echo "::error::tag git v${VERSION} absent"; exit 1; }
    - name: L'image dit la même chose d'elle-même
      run: |
        echo "$TOKEN" | docker login ghcr.io -u "$ACTOR" --password-stdin >/dev/null
        bash scripts/verif-version.sh --image "${IMAGE}:${VERSION}" --tag "$VERSION" --commit "$COMMIT"
```

Sans `scripts/verif-version.sh` dans le dépôt, l'équivalent inline :
`docker run --rm --entrypoint cat "$IMAGE:$VERSION" /app/version.json | jq -e --arg v "$VERSION" --arg c "$COMMIT" '.version == $v and .commit == $c'`.

## 2. GitHub Actions maison (`docker/build-push-action` ou `docker build`)

```yaml
      - name: Valeurs de version
        id: v
        run: |
          echo "version=$(cat VERSION)" >> "$GITHUB_OUTPUT"          # ou ${GITHUB_REF_NAME#v}, ou release-please
          echo "code_date=$(git log -1 --format=%cI)" >> "$GITHUB_OUTPUT"
      - uses: docker/build-push-action@<sha épinglé>
        with:
          build-args: |
            VERSION=${{ steps.v.outputs.version }}
            COMMIT=${{ github.sha }}
            BUILD=${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
            CODE_DATE=${{ steps.v.outputs.code_date }}
            SOURCE=${{ github.server_url }}/${{ github.repository }}
```

Un build multi-plateforme avec `--push` n'est pas exécutable localement sur le runner : vérifier
après `docker pull`, ou faire un build `amd64` séparé avec `--load` pour le contrôle. Une CI qui ne
construit pas d'image aujourd'hui gagne un job `image-version` (build sans push + `verif-version.sh`) :
c'est le seul endroit où le contrôle vit ailleurs que sur un poste.

## 3. GitLab CI (miroir Cloud Pi Native, docker ou kaniko)

```
--build-arg VERSION=${CI_COMMIT_TAG#v} --build-arg COMMIT=$CI_COMMIT_SHA --build-arg BUILD=$CI_JOB_URL
--build-arg CODE_DATE=$CI_COMMIT_TIMESTAMP --build-arg SOURCE=$CI_PROJECT_URL
```

## 4. Scripts de build shell du dépôt

```bash
VERSION="${TAG}"                                        # ou "$(cat VERSION)", ou "$(git describe --tags --always | sed 's/^v//')"
COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD)"
CODE_DATE="$(git -C "$ROOT_DIR" log -1 --format=%cI)"
SOURCE="https://github.com/<org>/<dépôt>"              # URL publique écrite en dur : jamais `git remote get-url` brut
docker build --build-arg VERSION="$VERSION" --build-arg COMMIT="$COMMIT" --build-arg BUILD="" \
  --build-arg CODE_DATE="$CODE_DATE" --build-arg SOURCE="$SOURCE" -t "$IMAGE:$VERSION" .
```

Si le script passe déjà un `ARG` maison (`--build-arg DM_IMAGE_TAG=…`) et que le Dockerfile aliase
`ARG VERSION=${DM_IMAGE_TAG}`, `VERSION` n'a pas besoin d'être passé : ajouter seulement les autres.
Un remote dérivé doit être nettoyé de tout `user:token@` : `sed -E 's#https://[^@/]+@#https://#'`.

## 5. BuildKit direct (`buildctl`, job de build dans le cluster)

`--opt=build-arg:VERSION=… --opt=build-arg:COMMIT=…` — mêmes noms, un `--opt` par valeur.

## Sources de version, et ce que donne `changes`

| Source | `VERSION` | `changes` et `history` |
|---|---|---|
| release-please + `CHANGELOG.md` | output `version` du workflow de release | `changes` = la section `## [X.Y.Z]` de cette version ; `history` = toutes les sections : **remplis** |
| fichier `VERSION` / `version.txt` | `$(cat VERSION)` | `[]` sauf si un `CHANGELOG.md` à titres `## [X.Y.Z]` ou `## X.Y.Z` existe |
| `package.json` / `pyproject.toml` | `jq -r .version` / `python -c …` | idem |
| tag git seul | `git describe --tags --always \| sed 's/^v//'` | idem |
| rien | `dev` | `[]` |

`changes: []` n'est pas un échec : le noteur affiche la version comme « note à écrire ». Pour que
`changes` et `history` se remplissent sans release-please, amorcer un `CHANGELOG.md` dont les
titres de section sont `## [X.Y.Z] - AAAA-MM-JJ` : le script ne lit que le titre. L'historique
se reconstitue depuis git (une section par montée du fichier de version, commits groupés par
type conventionnel), puis se relit à la main. `history` est bornée à 50 versions
(`--history-max`, à passer dans le `RUN` du Dockerfile si le projet en veut plus ou moins).
