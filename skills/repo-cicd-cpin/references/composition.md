# Composer les pipelines — règles par fonction

Les règles ci-dessous nomment des **fonctions**, pas des fichiers. Pour chaque fonction, chercher
dans le catalogue lu au tag résolu le workflow qui la remplit, et prendre son chemin, ses inputs,
ses secrets et ses permissions dans ce qui a été lu. Une fonction sans workflow correspondant à ce
tag est **omise et signalée**, jamais remplacée par une action tierce choisie de mémoire. Seule
exception : le job de synthèse, qui est un job local fourni plus bas.

Adapter au projet un exemple de la documentation lue est attendu. Ce qui est exclu : recopier le
**contenu** d'un workflow de `fabnum-cicd` dans le projet au lieu de l'appeler.

## Choix à faire trancher par l'humain (dans le plan du `--check`)

Ne pas les deviner : les poser, avec le défaut proposé. `--setup` reprend les réponses données
dans la conversation ; une réponse absente = le défaut ci-dessous, rappelé dans le rapport.

| Choix | Défaut proposé |
|---|---|
| fichier cible déjà présent : fusion ou nom voisin | **nom voisin** (`ci-cpin.yml`, `cd-cpin.yml`) — jamais de fusion sans accord explicite |
| registre et nom de l'image | `ghcr.io/<owner>/<repo>` ; **poser la question** : si la plateforme reconstruit l'image depuis le miroir, le push côté GitHub est peut-être superflu |
| architectures de l'image | celle(s) réellement déployée(s) ; la **même** liste en pull request et en release |
| tags d'image supplémentaires (`latest`, majeur/mineur, SHA court) | aucun |
| analyse qualité, tests dans l'image, attestation, automerge | non |
| flux de pré-release | oui seulement si la branche de pré-release existe déjà sur le remote |
| synchronisation Cloud Pi Native | oui |

## Fichiers produits dans le projet cible

| Fichier | Rôle |
|---|---|
| `.github/workflows/ci.yml` | pipeline de pull request |
| `.github/workflows/cd.yml` | pipeline de release |
| config + manifeste release-please | voir plus bas |
| `renovate.json` (ou équivalent existant) | voir `renovate.md` |

## Pipeline de pull request

| Fonction | Condition d'inclusion |
|---|---|
| lint des messages de commit | toujours |
| recherche de secrets dans l'historique | toujours |
| lint YAML | si le dépôt contient du YAML hors workflows (charts, manifests, compose) |
| build de l'image **sans push** | un job par Dockerfile détecté |
| scan de vulnérabilités de l'image construite | pour chaque build, sur l'artefact produit |
| scan de configuration / système de fichiers | toujours |
| exécution des tests dans l'image | seulement si l'humain fournit la commande de test |
| lint et test d'installation des charts | si des charts Helm sont présents |
| analyse qualité | seulement si l'humain confirme disposer d'une instance et d'un projet |
| job de synthèse servant de *required status check* | toujours, en dernier |

- Déclencheur : `pull_request` vers la branche de release (et de pré-release s'il y en a une),
  **sans filtre `paths:`** — un *required check* qui ne démarre pas bloque la PR.
- `concurrency` indexée sur la PR, avec annulation des runs en cours.
- Un scan « sur l'artefact produit » : un build multi-architecture produit un artefact par
  architecture ; suivre la fiche pour leur nom et scanner chacun de ceux qui sont déployés.
- Un workflow appelé deux fois dans le même pipeline (ex. deux scans) : vérifier dans sa fiche
  qu'un input distingue les deux appels (catégorie, en-tête de commentaire) ; sinon le signaler.

Pipeline écrit sous un nom voisin d'un workflow existant : lui donner un `name:` distinct, et
signaler que le job de synthèse ne couvre pas les jobs de l'autre fichier — tant que les deux
coexistent, les deux checks sont à déclarer obligatoires, ou les fichiers à fusionner.

Job de synthèse — job **local**, à écrire tel quel en listant tous les jobs dans `needs:` :

```yaml
  all-jobs-passed:
    name: All jobs passed
    if: ${{ always() }}
    needs: [<tous les jobs du pipeline>]
    runs-on: ubuntu-24.04
    permissions: {}
    steps:
    - name: Vérifier le résultat des jobs
      env:
        NEEDS: ${{ toJson(needs) }}
      run: |
        echo "$NEEDS" | jq -e 'all(.[]; .result == "success" or .result == "skipped")'
```

## Pipeline de release

Fonctions, dans l'ordre :

1. **release applicative** (release-please) — produit « release créée » et la version ;
2. **build et push de l'image**, conditionné à « release créée », tag = version ;
3. **attestation de l'image** — seulement si l'humain la demande ;
4. **mise à jour de la version du chart** — si un chart vit dans le dépôt ;
5. **synchronisation du miroir Cloud Pi Native** — conditionnée à « release créée » ;
6. **resynchronisation de la branche de pré-release** — seulement avec un flux de pré-release,
   placée en dernier.

- `needs:` et `if:` : **la fiche du workflow fait foi** quand elle les prescrit (c'est le cas de
  la resynchronisation, dont le `needs:` est défini précisément par sa fiche). À défaut : chaque
  fonction attend la dernière fonction **retenue** avant elle, plus tout job dont elle lit un
  output — la synchronisation attend donc le succès du build.
- Une fonction non retenue est **omise**, pas livrée en commentaire : un `uses:` commenté n'est
  pas monté par Renovate et diverge. Elle est citée dans le rapport comme ajout possible.
- Déclencheur : `push` sur la branche de release (et de pré-release le cas échéant).
  `concurrency` indexée sur la branche, **sans** annulation des runs en cours.
- Monorepo (plusieurs applications, ou chart aux côtés du code) : partir du guide monorepo lu au
  tag, en remplaçant chaque `uses: ./.github/workflows/<x>.yml` par la référence distante.

## Fichiers release-please

- Noms de fichiers et structure : ceux de la fiche du workflow de release lue au tag.
- `release-type` : d'après le marqueur de langage du projet (`package.json`, `pyproject.toml`,
  `go.mod`…) ; à défaut, `simple`.
- Version du manifeste : le dernier tag `vX.Y.Z` du projet ; à défaut la version du fichier de
  paquet ; à défaut `0.0.0`. Dire laquelle a été prise.
- Sans flux de pré-release : ne pas écrire les fichiers ni les clés propres aux pré-releases.
  Avec : écrire aussi la paire de fichiers de pré-release que décrit la fiche. Si la branche de
  pré-release n'existe pas encore, le signaler et dire ce que la fiche prévoit dans ce cas.
- Une configuration release-please déjà présente est **conservée** ; seul un écart bloquant avec
  ce qu'attend le workflow est signalé.

## Règles d'écriture

- **Référence** : `uses: dnum-mi/fabnum-cicd/.github/workflows/<fichier>@<tag exact>`, le même tag
  partout. Jamais `@main`, jamais de tag mobile.
- **Permissions** : `permissions: {}` au niveau du workflow. Par job appelant : l'**union** des
  `permissions:` déclarées par les jobs du workflow appelé (le YAML fait foi sur la fiche et sur
  les exemples). GitHub valide tous les jobs appelés, même ceux qu'un input désactive.
- **Inputs** : renseigner les requis, ceux dont le défaut ne convient pas au projet, et ceux que
  les **notes** de la fiche rendent nécessaires de fait même s'ils sont `required: false`. Chaque
  écart au défaut est justifié en une ligne dans le plan.
- **Secrets** : câblés un par un dans `secrets:`. Pas de `secrets: inherit` — il donnerait à un
  workflow tiers tous les secrets du dépôt.
- **Noms** des variables et secrets du projet : `vars.<NOM_DE_L_INPUT>` pour un input,
  `secrets.<NOM_DU_SECRET>` tel que déclaré dans le `workflow_call`. Aucune valeur littérale pour
  l'URL GitLab, l'ID du projet miroir, le nom du dépôt miroir ou le token.
- **Credential** : `GITHUB_TOKEN` par défaut. Ne câbler une GitHub App ou un PAT que si une
  fonction retenue l'exige d'après la doc d'authentification lue ; dire dans le rapport ce que le
  défaut implique. En particulier : si la doc lue indique qu'une PR ouverte avec `GITHUB_TOKEN`
  ne déclenche pas la CI, un *required status check* **bloquera la PR de release** — proposer
  alors une App ou un PAT, ou ne pas recommander le check obligatoire. Ne pas poser les deux.
- **Pas d'interpolation `${{ }}` dans un `run:`** : passer par `env:` — y compris si un exemple
  de la documentation lue fait autrement.
- Toute action tierce ajoutée hors `fabnum-cicd` est épinglée par SHA avec la version en commentaire.
