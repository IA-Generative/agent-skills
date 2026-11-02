# agent-skills

[![check](https://github.com/IA-Generative/agent-skills/actions/workflows/check.yml/badge.svg)](https://github.com/IA-Generative/agent-skills/actions/workflows/check.yml)

Skills partagées de l'équipe IA-Generative, au format ouvert [Agent Skills](https://agentskills.io) :
démarrer un repo, enquêter sur un bug, réviser, auditer, homologuer.

Une skill est un dossier avec un `SKILL.md` : des instructions que l'agent applique quand la
demande correspond à sa `description`. Elle se charge **toute seule** ; pour l'appeler
explicitement, voir [docs/agents.md](docs/agents.md#invoquer-une-skill) (ex. `/repo-perimetre`
avant d'ouvrir une PR).

Compatibles Claude Code, Codex, OpenCode, Gemini CLI, Cursor, GitHub Copilot, Kimi Code CLI,
Deep Code. Éprouvées avec Claude Code et OpenCode ; retours sur les autres bienvenus
([CONTRIBUTING.md](CONTRIBUTING.md)). Agent de codage ? Lire [AGENTS.md](AGENTS.md).

## Installer

Dépôt **public** : aucune connexion GitHub requise. Chaque étape s'ajoute à la précédente.

### 1. Les indispensables : principes de travail

Quatre principes courts d'après un post de Karpathy (dépôt tiers, hors bundles) :

```bash
claude plugin marketplace add multica-ai/andrej-karpathy-skills
claude plugin install andrej-karpathy-skills@karpathy-skills --scope local
```

Facultatif, une méthode de développement complète (TDD, débogage, revue) — une seule des deux,
elles se recoupent : `mattpocock/skills` (à la carte) ou `obra/superpowers` (enchaînée).

```bash
claude plugin install mattpocock-skills@claude-plugins-official --scope local
# ou
claude plugin install superpowers@claude-plugins-official --scope local
```

Commandes OpenCode, commits revus, licences : [docs/sources-externes.md](docs/sources-externes.md#méthodes-de-développement-de-base--recommandées-non-reprises).

### 2. Je démarre un projet : `mishell-base`

Le socle Fabrique Numérique : CI/CD, conventions, stack, API REST, déploiement.

```bash
claude plugin marketplace add IA-Generative/agent-skills
claude plugin install mishell-base@eric-skills --scope local
```

`--scope local` : ce projet seulement, sans modifier les fichiers versionnés (défaut `user` :
toutes vos sessions ; `project` : partagé avec l'équipe via git).

### 3. Le projet avance : `mishell-more`

Audits (pen-test, red-team, RAG), DAT d'homologation, guides ANSSI, RGAA, skills DSO / Cloud Pi Native.

```bash
claude plugin install mishell-more@eric-skills --scope local
```

### Autres agents, toutes les skills

OpenCode (plugin), Codex, Gemini CLI, Cursor, Copilot, Windows, `mishell-skills` (toutes les
skills de ce dépôt) : [docs/installation.md](docs/installation.md).

## Contenu

| Bundle | Source | Skills |
|---|---|---|
| `mishell-base` | `dnum-mi/fabnum-cicd`, `dnum-mi/transversal-doc` | CI/CD, conventions, stack, API REST, déploiement (externe) |
| `mishell-more` | `skills/audit` | `audit-repo-ouverture`, `audit-pentest-prep`, `audit-redteam`, `audit-rag`, `audit-tool-owui` |
| | `skills/dat` | `dat-generation`, `dat-word` (MirAI / DTNUM) |
| | `etalab-ia/skills`, `dnum-mi/starter-kit-opencode` | guides ANSSI, RGAA, DSO / Cloud Pi Native (externe) |
| `mishell-skills` | `skills/dev`, `skills/repo`, `skills/mirai` + audit + dat | tout, dont `adr-new`, `bug-investigate`, `controle-qualite-code`, `repo-init`, `repo-impact`, `repo-perimetre`, `repo-version-json`, `repo-cicd-cpin`, `mirai-*` |

Les skills sont en lecture seule par défaut, sauf mention dans leur `SKILL.md`. Sorties sensibles
dans `private/` (gitignoré).

## Hooks (Claude Code)

À coller dans un `settings.json` (non installés) :

| Hook | Bloque |
|---|---|
| [`kustomize-guard`](hooks/kustomize-guard.md) | `kubectl apply -f` sur un manifest `base/` |
| [`destructive-guard`](hooks/destructive-guard.md) | commandes destructrices ou irréversibles |

## Aller plus loin

- **Question, bug, déclenchement raté** : [issue](https://github.com/IA-Generative/agent-skills/issues) avec la demande exacte tapée. Contribuer : [CONTRIBUTING.md](CONTRIBUTING.md).
- [docs/installation.md](docs/installation.md) : installation par agent, `install.sh`, OpenCode
- [docs/agents.md](docs/agents.md) : compatibilité, invocation, limites par agent
- [docs/creer-une-skill.md](docs/creer-une-skill.md) : ajouter ou modifier une skill
- [docs/sources-externes.md](docs/sources-externes.md) : sources tierces reprises ou citées
- [AGENTS.md](AGENTS.md) : invariants du dépôt
