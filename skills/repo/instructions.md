# Groupe `repo` : cycle de vie des dépôts

> Chargé par le plugin OpenCode (`"groups": ["repo"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/repo/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `repo-cicd-cpin` | Poser une CI/CD Cloud Pi Native (fabnum-cicd, release-please, sync-cpin) |
| `repo-impact` | Analyse d'impact fondée sur des preuves avant un changement transverse ou risqué |
| `repo-perimetre` | Vérifier avant push/PR que le diff tient dans l'intention annoncée (Karpathy) |
| `repo-init` | Initialiser un repo avec les précautions d'usage (git, .gitignore, private/, anti-leak) |
| `repo-version-json` | Faire porter à une image son journal de version (Dockerflow, /__version__) |

## Invariants

- Lecture seule par défaut ; écriture uniquement avec `--setup` après validation.
- `repo-init` à lancer au tout début, avant d'écrire du code ou de committer.
