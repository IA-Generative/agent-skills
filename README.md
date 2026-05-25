# skills-claude — skills partagées IA-Generative

Skills [Claude Code](https://code.claude.com/docs/en/skills) réutilisables par
l'équipe IA-Generative. Capitalisent les pratiques récurrentes (debug, ADRs,
smoke-tests pipeline mirai, anti-régression rebranding) dans des modules
chargés à la demande plutôt que recollés à chaque session.

## Qu'est-ce qu'une skill ?

Une skill = un dossier `<nom>/SKILL.md` avec :
- un **frontmatter YAML** qui décrit quand l'utiliser
- un **corps markdown** = mode d'emploi que Claude suit quand on l'invoque

L'invocation se fait :
- en tapant `/<nom-de-la-skill> [args]` dans une session Claude Code
- ou **automatiquement** par Claude si la `description` matche la demande

Référence officielle : https://code.claude.com/docs/en/skills

## Skills disponibles

| Skill | Usage | Portée |
|---|---|---|
| `/bug-investigate` | Force 2-3 hypothèses + plan B avant tout fix | **Universelle** |
| `/adr-new` | Rédige une ADR au format IA-Generative | **Universelle** |
| `/smoke-mcr` | Smoke-test pipeline mirai-mesreunions (gateway + auth + ingester) | mirai-only |
| `/check-service-names` | Détecte les anciens noms de services mcr (rebranding 2026-05-16) | mirai-only |

## Hooks (config à coller dans settings.json)

| Hook | Bloque | Doc |
|---|---|---|
| `kustomize-guard` | `kubectl apply -f` sur manifest `base/` (écrase env vars overlay) | [hooks/kustomize-guard.md](hooks/kustomize-guard.md) |

## Installation

### Option 1 — Personnelle (recommandée pour démarrer)

Clone le repo et symlink dans `~/.claude/skills/` :

```bash
git clone git@github.com:IA-Generative/skills-claude.git ~/code/skills-claude
cd ~/code/skills-claude
./install.sh
```

Les skills sont immédiatement disponibles (Claude Code détecte les changements
de `~/.claude/skills/` à chaud) dans **toutes** tes sessions.

`./install.sh --dry-run` pour voir ce qui serait fait, `--remove` pour
désinstaller.

### Option 2 — Projet (à committer dans le repo cible)

Pour rendre une skill disponible à toute l'équipe d'un projet, la copier dans
`.claude/skills/<nom>/` du repo concerné et committer. Les skills projet
n'ont pas besoin d'install.

⚠️ Note : les skills avec `allowed-tools` accordent automatiquement des permissions
à Claude une fois le workspace marqué comme "trusted". Relire les SKILL.md
avant de faire confiance à un projet inconnu.

### Option 3 — Plugin (futur)

Quand la collection sera stable, on pourra la packager en plugin Claude Code
(`/plugin install IA-Generative/skills-claude`) pour distribution one-shot.
À faire si on dépasse une dizaine de skills.

## Ajouter une skill

```bash
mkdir -p skills/<nom>
$EDITOR skills/<nom>/SKILL.md
./install.sh   # re-symlink (idempotent)
```

Format minimum :

```yaml
---
description: Phrase qui dit quoi et quand utiliser. Claude s'en sert pour décider de l'invoquer auto. Premier mot = mot-clé d'usage.
---

Instructions que Claude suit quand la skill est invoquée.
Référer $ARGUMENTS si la skill prend un argument.
```

Frontmatter utile (cf. doc officielle) :
- `disable-model-invocation: true` → seul l'utilisateur peut invoquer (utile pour
  les actions à effet de bord : deploy, send-message, etc.)
- `allowed-tools: Bash(git *) Read` → pré-approuve ces tools quand la skill tourne
- `argument-hint: [titre]` → indication d'argument en autocomplete
- `paths: ["src/**/*.ts"]` → la skill ne se déclenche auto que sur ces fichiers

## Conventions

- **Une skill = un mode d'emploi reproductible.** Pas du contexte général
  (ça, c'est CLAUDE.md ou la mémoire perso).
- **FR par défaut**, sauf si le repo cible est anglophone.
- **Concis** : viser < 100 lignes par SKILL.md. Les références longues vont
  dans des fichiers à côté (`reference.md`, `examples/`).
- **Citer les mémoires / ADRs / runbooks** existants plutôt que les dupliquer.
- **Pas de secrets** dans les SKILL.md (le repo est partagé).

## Skills personnelles vs partagées

| | Personnelle | Partagée (ce repo) |
|---|---|---|
| Où | `~/.claude/skills/` directement | `IA-Generative/skills-claude/skills/` |
| Pour | Ton workflow individuel | Pratiques d'équipe |
| Visibilité | Toi seul | Tout IA-Generative |
| Modif | Libre | PR review |

Si une skill perso s'avère utile à l'équipe → la promouvoir ici via PR.

## Liens

- Doc skills Claude Code : https://code.claude.com/docs/en/skills
- Doc hooks : https://code.claude.com/docs/en/hooks
- Agent Skills open standard : https://agentskills.io
