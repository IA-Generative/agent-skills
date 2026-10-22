# Groupe `repo` : cycle de vie des dépôts

> Chargé par le plugin OpenCode (`"groups": ["repo"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/repo/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `cicd-cpin` | Poser une CI/CD Cloud Pi Native (fabnum-cicd, release-please, sync-cpin) |
| `impact` | Analyse d'impact fondée sur des preuves avant un changement transverse ou risqué |
| `perimetre` | Vérifier avant push/PR que le diff tient dans l'intention annoncée (Karpathy) |
| `repo-init` | Initialiser un repo avec les précautions d'usage (git, .gitignore, private/, anti-leak) |
| `version-json` | Faire porter à une image son journal de version (Dockerflow, /__version__) |

## Invariants

- Lecture seule par défaut ; écriture uniquement avec `--setup` après validation.
- `repo-init` à lancer au tout début, avant d'écrire du code ou de committer.

## Renvois vers les autres groupes

Un groupe n'est jamais supposé installé : ces renvois nomment le groupe, ils ne le chargent pas.

| Besoin | Groupe et skill |
|--------|-----------------|
| Principes CI/CD, pipeline de base lint / tests / build, conventions de branches et de commits | groupe `dev` : `ci-cd`, `conventions-cofabnum` |
| Dockerfile de production, durcissement du conteneur | groupe `dev` : `deploiement` |
| Gabarits `ci.yml`/`cd.yml`, dépôt d'infra séparé, chart Helm, mise en service et dépannage Cloud Pi Native | groupe `dso` : `cicd-fabnum`, `helm-chart-cpin`, `deploiement-cpin` |

`cicd-cpin` écrit les workflows du **dépôt applicatif** et s'arrête là ; la livraison (chart, infra, console CPiN) relève de `dso`.
