# Socle commun CoFabNum

> Conventions partagées par tous les projets de la Fabrique Numérique. Chargé par le plugin `socle` (Claude Code) ou par le plugin OpenCode.

## Git Setup (run before first commit)

```bash
git config --global init.defaultBranch main
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```

## Versions (pin in `.prototools`)

```
node 24.13.1
pnpm 10.0.0
```

## Branch Naming

```
<type>/<kebab-desc>#<ticket>
```

Types: `feat`, `fix`, `hotfix`, `tech`, `docs`, `refactor`
Examples: `feat/worker-logs#353`, `refactor/reorganize-backend#360`

## Commit Messages

Conventional Commits format. French is acceptable.

## Actions manuelles

Quand une intervention humaine est requise, utiliser ce format :

> **🔧 Action manuelle requise**
>
> - <action à faire>
> - <lien/référence si besoin>

Exemple :

> **🔧 Action manuelle requise**
>
> - Ouvrir la console CPiN et cliquer sur **Replay hooks** pour le projet `anonymisation`.
> - Confirmer le statut dans l'UI ArgoCD DSO.

## Code Quality

- Lines ≤ 120 (≤ 140 forbidden)
- Functions ≤ 20 lines, one purpose
- No silent error swallowing
- Named constants, no magic numbers
- Early return over deep nesting

## TypeScript

- strict mode, no `enum`/`namespace`
- No `any` (extremely rare)
- Unions instead of enums
- Zod for runtime validation
- `interface` for objects/contracts, `type` for unions

## Python

- Ruff: `line-length = 88`, `target-version = "py312"`

## Linting

| Language | Tool | Config |
|----------|------|--------|
| JS/TS | ESLint + @antfu/eslint-config | flat config, no Prettier |
| Python | ruff | ruff check + ruff format |

## REST API

- Nouns only, always plural, no verbs in paths
- HTTP method is the verb
- stdout-only structured JSON logs
- Error messages in French or i18n keys

## Docker

- Lightweight base (`*-alpine`, `*-slim`)
- Non-root user (UID ≥ 1000)
- Multi-stage builds
- No `latest` tags in production
- Scan with Trivy in CI

## Deployment

- Helm charts mandatory (no raw YAML manifests)
- K8s/OpenShift, rootless

## Project AGENTS.md

Chaque sous-projet a son propre `AGENTS.md` ; ce socle prime pour les conventions transverses.

## Prérequis des agents (`dev-agents`, `dso-agents`)

- Obligatoire : OpenCode ≥ 1.18 ou Claude Code ≥ 2.1.275, et `git`. Le reste est optionnel : sans lui, les agents passent en mode dégradé.
- Vérifier le poste avec `bash <dépôt>/scripts/doctor.sh` (lecture seule).
- Ne jamais installer un outil sans l'accord de l'humain : proposer l'installation **ou** le mode dégradé.

## Gotchas

- ESLint replaces Prettier
- Ruff replaces black, flake8, isort, pyupgrade
- Never modify migration files manually
- Never pin GitHub Actions to `@master` or `@main`
