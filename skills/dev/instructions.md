# Groupe `dev` : développer une application

> Chargé par le plugin OpenCode (`"groups": ["dev"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/dev/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `adr-new` | Rédiger une ADR au format IA-Generative et tenir l'index des ADR |
| `bug-investigate` | Forcer des hypothèses de cause + plan B avant tout fix de bug |
| `controle-qualite-code` | Contrôle qualité du code (copie vendorée, ne pas éditer) |
| `conventions-cofabnum` | Créer ou relire un projet — nommage, archi, TS, REST, linting |
| `recettes-client` | Frontend Vue 3 / Nuxt 3 — DSFR, VueDsfr, composables, tests |
| `recettes-serveur` | Backend NestJS / Fastify / FastAPI — scaffolding, logging, OpenAPI |
| `stack-technique` | Configurer les outils recommandés — ESLint antfu, Prisma, date-fns… |
| `monorepo` | Monorepo pnpm workspaces + Turborepo |
| `ci-cd` | Principes CI/CD et gabarit CI de base (jusqu'à l'image scannée, pas au déploiement) |
| `deploiement` | Dockerfiles de production, durcissement des conteneurs (rootless, lecture seule, tags), dev local K8s — pour Helm et Cloud Pi Native voir le groupe `dso` |
| `environnement-installation` | Setup poste dev — Windows/WSL, macOS, Ubuntu |
| `outils-dev` | Git, Docker Compose, VS Code, GitHub CLI, pnpm, proto, zsh, uv |

## Au-delà du développement : renvois

Un groupe n'est jamais supposé installé : ces renvois nomment le groupe, ils ne le chargent pas.

| Besoin | Groupe et skill |
|--------|-----------------|
| Brancher le dépôt sur fabnum-cicd (PR, release, scans, Renovate), poser `.gitignore` et anti-leak, journal de version de l'image | groupe `repo` : `cicd-cpin`, `repo-init`, `version-json` |
| Chart Helm, dépôt d'infra, CI/CD de livraison, déploiement et dépannage Cloud Pi Native | groupe `dso` : `helm-chart-cpin`, `cicd-fabnum`, `deploiement-cpin` |

Le développeur s'arrête à l'image construite et scannée ; le déploiement relève du groupe `dso`.

## Invariants

- `controle-qualite-code/` est une copie vendorée : ne jamais éditer son `SKILL.md` ni ses
  `references/` — rester identique à l'octet près à son amont (voir `UPSTREAM.md`).

## Implementing a Plan

Before and while implementing a plan (migration, feature, refactor) that touches external libraries:

> Avec les agents du dépôt, `/livrer <plan>` (`/dev-agents:livrer` dans Claude Code) automatise ceci : le sous-agent `dev-verif-plan` contrôle les étapes 1–2, le sous-agent `dev-review` est la porte de l'étape 3.

### 1. Verify dependencies actually exist

- [ ] Check the plan's packages match what's installed (`package.json`, lockfile) — a plan can reference a package that doesn't exist on npm or isn't the one used by the project
- [ ] Check installed versions match what the plan assumes (`pnpm list <pkg>`)
- [ ] If a package isn't installed yet, confirm it exists on npm before adding it (`npm view <pkg>`)

> Example: a plan referenced `@gouvfr/dsfr-vue` (`FrInput`, `FrButton`) — that package doesn't exist on npm. The project actually uses `@gouvminint/vue-dsfr` (`DsfrInput`, `DsfrButton`).

### 2. Read the real type definitions before coding

- [ ] Locate the `.d.ts` files for the library (`node_modules/<pkg>/**/*.d.ts`)
- [ ] Read the actual component/function signature before writing code that uses it
- [ ] Adapt the plan's code if the real API differs — don't copy-paste it as-is

> Example: a plan used `<FrInput :native-validators="{ required: { errorMessage: '...', enable: true } }" />`, but `DsfrInputProps` (`node_modules/@gouvminint/vue-dsfr/types/components/DsfrInput/DsfrInput.types.d.ts`) has `isInvalid?: boolean` and no `native-validators`. See [recettes-client] for the real DsfrInput API.

### 3. Build before committing

- [ ] Run the project build / typecheck (`pnpm build`, `vue-tsc --noEmit`, `tsc --noEmit`) at the end of each task
- [ ] Fix all type errors before committing
- [ ] Never commit a state that breaks the build, even "temporarily"

### 4. Test existing behavior before changing it

- [ ] Run the app (`pnpm dev`) and check the current behavior of the feature being modified
- [ ] Identify pre-existing bugs (e.g. a non-reactive toast, a frozen counter) — don't confuse them with regressions introduced by the plan
- [ ] Either fix pre-existing bugs as part of the task, or note them explicitly as out of scope in the plan/PR

## Phase de spec

Lors de la rédaction d'une spec, toujours inclure une section **Structure des fichiers** montrant l'arborescence complète des fichiers à créer ou modifier. Utiliser le skill `conventions-cofabnum` pour valider les conventions de nommage et d'arborescence.

## Choix technologiques

Quand plusieurs options de la stack cofabnum sont possibles (ex. NestJS vs Fastify, FastAPI vs Fastify), présenter les options à l'utilisateur avec les arguments pour chacune avant de recommander — ne pas choisir silencieusement.

## Gotchas

- Pour toute question backend/serveur/API, utiliser le skill `recettes-serveur` avant de répondre — Express n'est pas dans la stack cofabnum
- `tsconfig.json` with only `references` (Vite template): `tsc --noEmit` / `vue-tsc --noEmit` without `-b` checks nothing and exits 0 — typecheck with `vue-tsc -b` (or the project's `build`/`typecheck` script)
- Vue components need 2+ words (`BadgeTypeOrganisme.vue`, not `Badge.vue`)
- Folders = kebab-case, Vue files = PascalCase
