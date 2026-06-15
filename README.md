# skills-claude — skills partagées IA-Generative

Skills [Claude Code](https://code.claude.com/docs/en/skills) réutilisables par
l'équipe IA-Generative. Capitalisent les pratiques récurrentes (debug, ADRs,
smoke-tests pipeline mirai, anti-régression rebranding) dans des modules
chargés à la demande plutôt que recollés à chaque session.

## ⚡ Déploiement local — partager les skills sur tous tes repos (Claude Code dans VSCode, Mac)

> Objectif : installer ces skills **une fois** sur ta machine pour qu'elles soient disponibles dans
> **tous** tes projets, quel que soit le dossier ouvert dans VSCode.

Claude Code (CLI **et** extension VSCode) lit les skills « utilisateur » dans `~/.claude/skills/`.
Ce qui s'y trouve est actif dans **toutes** les fenêtres / tous les workspaces de la machine.
`install.sh` y crée des **symlinks** vers ce repo : **aucune recopie**, un seul clone sur le disque,
tu édites ici → répercuté partout. `ls -l ~/.claude/skills/` montre des liens `->`, pas des fichiers.

```bash
# Depuis TON clone existant (un seul suffit — ne re-clone pas)
cd /Users/etiquet/Documents/GitHub/skills-claude   # ou l'emplacement de ton clone
./install.sh                                        # symlinks vers ~/.claude/skills/ — idempotent
ls -l ~/.claude/skills/                             # vérif : doit afficher des liens -> .../skills-claude/...
```

> Tu n'as **pas** de clone encore ? Clone-le une seule fois où tu veux, puis lance `./install.sh` :
> `git clone git@github.com:IA-Generative/skills-claude.git ~/code/skills-claude`

Dans **VSCode** : ouvre n'importe quel projet, lance le panneau Claude Code, tape `/` →
les skills apparaissent dans l'autocomplétion. Aucune config par-projet n'est requise.

**Mise à jour** : `git pull` dans ton clone suffit (les symlinks pointent dessus,
le nouveau contenu est pris à chaud — relance une session si une skill n'apparaît pas encore).
**Désinstaller** : `./install.sh --remove`. **Aperçu sans rien changer** : `./install.sh --dry-run`.

> 💡 Skills **utilisateur** (`~/.claude/skills/`, via ce repo) = dispo partout sur ta machine.
> Pour ne livrer une skill qu'à un projet précis, voir [Option 2 — Projet](#option-2--projet-à-committer-dans-le-repo-cible) plus bas.

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
| `/security-pentest-prep` | Audit sécurité (OWASP + prompt injection) + test « safe pour passer en public » avant pen-test — lecture seule par défaut, `--fix` pour corriger ; sorties en `private/` (gitignoré) | **Universelle** |
| `/open-repo-check` | Vérifie qu'un repo s'ouvre sans risque avant de bosser dessus : auto-exec au open (hooks/tâches VSCode/lifecycle), anti-leak en place, aucun secret/info sensible dans le code, l'historique ou les heads de commit — lecture seule, rend un plan de remédiation exécutable en mode plan ; `--setup` pose les garde-fous | **Universelle** |
| `/gen-doc-homologation` | Pré-remplit un document d'homologation MirAI (DAT…) depuis le code — modèle + prompt embarqués | MirAI/DTNUM |
| `/adr-new` | Rédige une ADR au format IA-Generative | **Universelle** |
| `/smoke-mcr` | Smoke-test pipeline mirai-mesreunions (gateway + auth + ingester) | mirai-only |
| `/check-service-names` | Détecte les anciens noms de services mcr (rebranding 2026-05-16) | mirai-only |

> ℹ️ **`gen-doc-homologation`** embarque ses propres artefacts versionnés (modèle `dat/MODELE_DAT_MirAI.docx`,
> prompt, `CHANGELOG.md`) — exception à la règle « SKILL.md léger ». Ce contenu provient du dépôt
> `IA-Generative/gen-document-homologation`, **fusionné ici en 2026-06** (un seul dépôt à maintenir ;
> l'ancien repo est retiré). Le modèle/prompt évoluent désormais dans `skills/gen-doc-homologation/`.

## Hooks (config à coller dans settings.json)

| Hook | Bloque | Doc |
|---|---|---|
| `kustomize-guard` | `kubectl apply -f` sur manifest `base/` (écrase env vars overlay) | [hooks/kustomize-guard.md](hooks/kustomize-guard.md) |

## Installation

### Option 1 — Personnelle (recommandée pour démarrer)

Symlink dans `~/.claude/skills/` → dispo dans **toutes** tes sessions, sans recopie.
Procédure détaillée (et pourquoi pas de second clone) : voir la section
[⚡ Déploiement local](#-déploiement-local--partager-les-skills-sur-tous-tes-repos-claude-code-dans-vscode-mac) en tête de ce README.

```bash
cd <ton-clone-skills-claude> && ./install.sh   # --dry-run pour simuler, --remove pour désinstaller
```

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
