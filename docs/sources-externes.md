# Sources externes de skills — ce qu'on reprend, ce qu'on se contente de citer

Ce dépôt ne vendore pas de catalogue tiers en bloc. On **adapte** (en français, aux conventions
d'ici : lecture seule par défaut, `private/`, neutralité vis-à-vis de l'agent) ce qui comble un
manque réel, avec mention de la source ; le reste est **cité** ici pour qui en a besoin.

## ECC — Everything Claude Code

- Dépôt : https://github.com/affaan-m/ECC — licence MIT — revu au commit `76aaa77` (2026-10-15),
  version 2.2.3 : 311 skills, 71 agents, hooks, règles.
- **Installation du plugin complet déconseillée** pour l'équipe (`/plugin install ecc@ecc`) :
  centaines de descriptions chargées en contexte qui se concurrencent au déclenchement, hooks
  actifs sur chaque outil, contenu très orienté JS/TS et SaaS, et une référence de plugin non
  figée — précisément ce que `audit-repo-ouverture` signale comme mutable. Préférer lire et
  reprendre skill par skill.

### Repris et adaptés ici

| Source ECC | Devenu | Apport |
|---|---|---|
| `mcp-dependency-review` | `audit-repo-ouverture` → `references/agents-et-mcp.md` | hooks d'agent, `.mcp.json`, consignes injectées, classement des références MCP mutables |
| `agent-security-hardening` | `audit-tool-owui` §7 → `references/frontiere-action.md` | frontière d'action des tools : irréversible, redirections, sortie bornée, test sentinelle |
| agent `rag-pipeline-reviewer` | nouvelle skill `audit-rag` | revue RAG avec évaluation mesurée obligatoire |
| `change-impact` | nouvelle skill `repo-impact` | analyse d'impact avant / alignement après |
| `architecture-decision-records` | `adr-new` | index, « pourquoi pas », mode lecture, ADR rétroactive |
| `orch-fix-defect`, agent `silent-failure-hunter` | `bug-investigate` §5-6 | test rouge avant correctif, échecs silencieux |
| `safety-guard` | `hooks/destructive-guard.md` | blocage des commandes destructrices |

### À consulter selon le besoin (non repris)

| Skill ECC | Quand s'en servir |
|---|---|
| `database-migrations` | migration PostgreSQL sans interruption (expand-contract, index concurrents, backfill par lots) |
| `contract-first` | coordination front / back ou inter-services par un contrat unique (OpenAPI, AsyncAPI) |
| `kubernetes-patterns`, `docker-patterns` | revue de manifestes et d'images (sondes, ressources, RBAC) |
| `fastapi-patterns`, `python-testing` | conventions FastAPI / pytest |
| `eval-harness`, `ai-regression-testing` | évaluations avant de coder, angles morts du code écrit par IA |
| `regex-vs-llm-structured-text` | extraction de documents : regex d'abord, LLM pour les cas douteux |
| `inherit-legacy-style` | faire respecter par l'IA les conventions implicites d'un code existant |
| `codebase-onboarding` | guide de prise en main et `AGENTS.md` de départ pour un dépôt inconnu |
| `council` | décision ambiguë : avis contradictoires indépendants avant de trancher |
| `accessibility` | base WCAG 2.2 ; pour l'État, la référence reste le **RGAA** et le DSFR |
| `skill-host-compat` | idées pour durcir `install.sh --check` (ex. `$ARGUMENTS` dans un bloc bash) |

Avant de reprendre une skill tierce : lire tout le `SKILL.md`, vérifier qu'il ne lance rien
d'externe à l'installation, l'adapter plutôt que le copier, et citer la source et le commit.

## Méthodes de développement de base — recommandées, non reprises

Citées dans le README (installation sous Claude Code), pas vendorées, hors des bundles. Revues le 2026-10-30.

| Dépôt | Commit | Licence | Contenu |
|---|---|---|---|
| `mattpocock/skills` | `a496f55` | MIT | skills à la carte : TDD, diagnostic de bug, revue, `grilling`, modélisation du domaine… |
| `obra/superpowers` | `2ce8aa1` | MIT | méthode complète : brainstorming, plan, TDD, débogage systématique, revue, vérification |
| `multica-ai/andrej-karpathy-skills` | `2c60614` | aucune détectée | une skill, `karpathy-guidelines` : quatre principes d'après un post de Karpathy (le dépôt n'est pas de lui) |

- `mattpocock/skills` et `superpowers` se recoupent : en prendre une seule.
- Recoupements avec nos skills : `bug-investigate` (débogage), `repo-perimetre` (esprit « simplicité d'abord,
  changement chirurgical » des principes Karpathy), `controle-qualite-code` (revue). Les nôtres restent
  ciblées sur nos conventions (lecture seule, `private/`, neutralité vis-à-vis de l'agent).
- Karpathy, sans licence détectée : on recommande leur plugin, on ne recopie pas leur texte.

### Installation sous OpenCode

```bash
# Karpathy (commande de skills.sh, non documentée par le dépôt ; copie la skill dans le projet)
npx skills@latest add multica-ai/andrej-karpathy-skills -a opencode
# mattpocock/skills (copie dans le projet ; cocher setup-matt-pocock-skills)
npx skills@latest add mattpocock/skills -a opencode
```

```json
// superpowers : opencode.json (OpenCode 1.x ; clé "plugins" en 2.x)
{ "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"] }
```
