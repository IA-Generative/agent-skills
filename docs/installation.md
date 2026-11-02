# Installation

Le dépôt est **public** : aucune connexion GitHub n'est requise.

## Choisir sa voie

| Agent | Voie |
|---|---|
| Claude Code | [marketplace](#claude-code) |
| OpenCode | [plugin](#opencode) |
| Codex, Gemini CLI, Cursor, Copilot, Kimi, Deep Code | [`install.sh` / `install.ps1`](#installsh--installps1-symlinks) |

## Claude Code

```bash
claude plugin marketplace add IA-Generative/agent-skills
claude plugin install mishell-base@eric-skills     # socle Fabrique Numérique
claude plugin install mishell-more@eric-skills     # sécurité, homologation, CPiN (facultatif)
claude plugin install mishell-skills@eric-skills   # toutes les skills de ce dépôt (facultatif)
```

- `marketplace add` n'enregistre que le catalogue : aucune skill n'est chargée avant `install`.
- Ensuite `/reload-plugins`, puis `claude plugin list` doit afficher le plugin `enabled`. Les skills se lancent sous `/mishell-skills:<nom>`.
- `IA-Generative/agent-skills` est la source ; `eric-skills` est le nom de la marketplace (`agent-skills` est réservé par Anthropic).
- Un seul canal : avec le plugin **et** `install.sh`, chaque skill apparaît deux fois. Retirer les liens : `./install.sh --uninstall --target claude`.
- Ancien plugin `skills` : `/plugin uninstall skills@eric-skills` avant d'installer `mishell-skills`.

## OpenCode

Dans `opencode.json` (le plugin est téléchargé dans le cache, pas dans le projet) :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["agent-skills@git+https://github.com/IA-Generative/agent-skills.git",
              { "groups": ["dev", "repo"], "bundles": ["mishell-base"] }]]
}
```

- `groups` : `dev`, `audit`, `repo`, `dat`, `mirai` (défaut : tous). Sans `groups`, seules les skills des `bundles` sont chargées.
- `bundles` : `mishell-base`, `mishell-more`. Le plugin lit `.claude-plugin/marketplace.json`.
- Premier démarrage : sources téléchargées dans `~/.cache/agent-skills/` (git requis) ; une source injoignable est ignorée.
- Un nom de skill déjà exposé par une source tierce est ignoré avec un avertissement (noms à plat sous OpenCode).
- Testé avec OpenCode 1.18. Relancer opencode après modification.
- Skills DSO seules, sans ce plugin (ne pas combiner avec `mishell-more`) :
  ```json
  { "skills": { "urls": ["https://raw.githubusercontent.com/dnum-mi/starter-kit-opencode/d10ffaa9b78ded708ad9e5b3fd40bccc35afc344/.agents/skills/dso/"] } }
  ```

## `install.sh` / `install.ps1` (symlinks)

Prérequis, une fois par machine : `git`.

| Système | Installer |
|---|---|
| macOS | `xcode-select --install` |
| Windows | `winget install --id Git.Git -e` |
| Linux | `git` via le gestionnaire de paquets |

Installer, et plus tard mettre à jour : la même ligne.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/IA-Generative/agent-skills/main/install.sh | bash
```

```powershell
# Windows (sans droits administrateur) ; recharger le PATH ou rouvrir PowerShell après winget
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/IA-Generative/agent-skills/main/install.ps1)))
```

Le dépôt est cloné dans `~/.local/share/agent-skills`, puis chaque skill est liée dans les dossiers lus par les agents (jonction sous Windows). Relancer ensuite la session de l'agent. Installer l'agent **avant** les skills.

À chaque passage, le script : `git pull --ff-only` (si le clone est sur `main`), valide les `SKILL.md`, crée un lien par skill, nettoie les liens orphelins. Il ne touche jamais une skill personnelle (dossier réel) ni un lien vers une autre copie (`--force` pour remplacer).

| Dossier cible | Lu par | Installé |
|---|---|---|
| `~/.agents/skills/` | Codex, Gemini CLI, Cursor, Copilot, OpenCode, Kimi, Deep Code | toujours |
| `~/.claude/skills/` | Claude Code | si détecté |
| `~/.config/opencode/skills/`, `~/.gemini/skills/`, `~/.cursor/skills/`, `~/.copilot/skills/`, `~/.kimi/skills/`, `~/.deepcode/skills/` | versions qui ne lisent pas `~/.agents/skills` | sur demande : `--target opencode`… |

| Besoin | Commande |
|---|---|
| Mettre à jour | `./install.sh` |
| Sans réseau | `./install.sh --offline` |
| Simuler | `./install.sh --dry-run` |
| Choisir les cibles | `./install.sh --target agents --target claude` |
| Vérifier les `SKILL.md` | `./install.sh --check` |
| Désinstaller | `./install.sh --uninstall` |

PowerShell : `-DryRun`, `-Offline`, `-Force`, `-Uninstall`, `-Target agents,claude`.

Le clone doit être sur `main`, sinon les sessions voient les skills en cours de travail et non celles de l'équipe. Contributeur·rice : lancer `./install.sh` depuis son clone, qui devient la source des liens.

Certains agents (OpenCode, Copilot, Kimi) lisent aussi `~/.claude/skills` et voient chaque skill deux fois ; sans Claude Code : `./install.sh --uninstall --target claude`.

## Bundles et skills tierces

`mishell-base` et `mishell-more` sont des méta-plugins : `.claude-plugin/marketplace.json` référence chaque source tierce (dépôt, **commit figé**), téléchargée chez GitHub à l'installation. Rien n'est copié ici. `install.sh` ne gère pas ces sources.

`mishell-base` suit deux branches encore ouvertes (`fabnum-cicd`, `transversal-doc`) : repointer vers `main` ou un tag à leur fusion (champ `sha`).

Méthodes de développement génériques (TDD, débogage, revue), hors bundles : [sources-externes.md](sources-externes.md).
