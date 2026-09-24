# agent-skills — skills partagées IA-Generative, pour tous les agents de code

Des skills réutilisables par l'équipe IA-Generative, au format ouvert
[Agent Skills](https://agentskills.io) : un dossier, un `SKILL.md`. Elles capitalisent les
pratiques récurrentes — démarrer un repo proprement, enquêter sur un bug, auditer la
sécurité, réviser du code, produire un dossier d'homologation — dans des modules que
l'agent charge à la demande, plutôt que recollés à chaque session.

Elles fonctionnent avec **Claude Code, Codex, OpenCode, Gemini CLI, Cursor, GitHub
Copilot** et tout agent qui lit le standard.

> **État des tests.** Ces skills ont été écrites et éprouvées **surtout avec Claude Code**.
> Sur les autres agents, elles sont installées et découvertes, mais leur comportement
> réel reste à confirmer. **Vos retours sont attendus** — tests, issues, PR, quel que
> soit votre agent : voir [CONTRIBUTING.md](CONTRIBUTING.md).

> 🤖 Vous êtes un agent de codage ? Lisez [`AGENTS.md`](AGENTS.md) : invariants du dépôt
> et marche à suivre pour ajouter ou modifier une skill.

---

## Installer ou mettre à jour — une seule commande

```bash
git clone https://github.com/IA-Generative/agent-skills.git ~/Documents/GitHub/agent-skills
~/Documents/GitHub/agent-skills/install.sh
```

Sans clone préalable, le script s'amorce seul (il clone dans `~/.local/share/agent-skills`) :

```bash
curl -fsSL https://raw.githubusercontent.com/IA-Generative/agent-skills/main/install.sh | bash
```

`install.sh` est **idempotent** : la même commande installe une machine neuve et met à
jour une machine existante. À chaque passage, il :

1. fait un `git pull --ff-only` du clone (s'il est sur `main`), puis se relance si le
   script a changé ;
2. valide chaque `SKILL.md` (frontmatter, `name` identique au dossier) ;
3. crée un **symlink** par skill dans les dossiers que lisent les agents — un seul clone
   sur le disque, un `git pull` et tout suit ;
4. **nettoie** les liens orphelins : skill renommée ou supprimée, clone déplacé, ancien
   dépôt `skills-claude`.

Il ne touche jamais une skill personnelle (dossier réel) ni un lien vers une autre copie
(il avertit ; `--force` pour le remplacer).

| Dossier cible | Lu par | Installé |
|---|---|---|
| `~/.agents/skills/` | Codex, Gemini CLI, Cursor, GitHub Copilot, OpenCode | toujours |
| `~/.claude/skills/` | Claude Code (CLI, VSCode, desktop) | si Claude Code est détecté |
| `~/.config/opencode/skills/`, `~/.gemini/skills/`, `~/.cursor/skills/`, `~/.copilot/skills/` | versions d'agent qui ne lisent pas encore `~/.agents/skills` | sur demande : `--target opencode` … |

| Besoin | Commande |
|---|---|
| Mettre à jour | `./install.sh` |
| Sans réseau | `./install.sh --offline` |
| Simuler | `./install.sh --dry-run` |
| Choisir les cibles | `./install.sh --target agents --target claude` (ou un chemin absolu) |
| Vérifier les `SKILL.md` | `./install.sh --check` |
| Désinstaller | `./install.sh --uninstall` |

> ⚠️ **Votre clone doit être sur `main`.** Sur une branche de travail, le script ne met pas
> à jour et vos sessions voient *vos* skills en cours, pas celles de l'équipe.
> Windows : utiliser WSL (les symlinks natifs ne sont pas gérés).

Certains agents (OpenCode, Copilot) lisent **aussi** `~/.claude/skills` : ils voient alors
chaque skill deux fois, sous le même nom et vers le même dossier. Si c'est gênant et que
vous n'utilisez pas Claude Code : `./install.sh --uninstall --target claude`.

### Invoquer une skill

Tous les agents chargent une skill **automatiquement** quand sa `description` correspond
à la demande. Pour l'appeler explicitement : `/<nom>` dans Claude Code, Cursor et Copilot,
`$<nom>` ou `/skills` dans Codex, `/skills` dans Gemini CLI, ou simplement « utilise la
skill `<nom>` » partout.

## Skills disponibles

| Skill | Ce qu'elle fait | Portée |
|---|---|---|
| **— Démarrer / développer —** | | |
| `repo-init` | Initialise un repo proprement : git, `.gitignore` durci, `private/` gitignoré, structure lisible, anti-leak local **bloquant** (pre-commit gitleaks) | Universelle |
| `bug-investigate` | Force 2-3 hypothèses de cause + un plan B avant tout fix | Universelle |
| `adr-new` | Rédige une ADR au format IA-Generative | Universelle |
| **— Qualité / revue —** | | |
| `controle-qualite-code` | Grille de revue du code — en particulier généré par IA — avec verdict motivé, plus un rituel d'hygiène qui mesure et dégonfle la dette | Universelle |
| **— Audit / sécurité —** | | |
| `audit-repo-ouverture` | Vérifie qu'un repo s'ouvre sans risque avant d'y travailler (auto-exécution à l'ouverture, anti-leak, aucun secret dans le code ni l'historique) — lecture seule | Universelle |
| `audit-pentest-prep` | Audit sécurité (OWASP + prompt injection) avant pen-test — lecture seule, `--fix` pour corriger ; sorties en `private/` | Universelle |
| `audit-redteam` | Campagne red-team / prompt-injection (LLM01) contre un service LLM ; mesure si la garde tient ; rapports en `private/redteam-reports/` | Universelle |
| `audit-tool-owui` | Audite l'identité SSO et le coffre de credentials des tools per-user derrière OpenWebUI / MCP | OWUI/MCP |
| **— Homologation —** | | |
| `dat-generation` | Pré-remplit un document d'homologation MirAI (DAT…) depuis le code — modèle et prompt embarqués ; sortie en `private/` | MirAI/DTNUM |
| `dat-word` | Rend un DAT (Markdown) en `.docx` ministériel sur le modèle officiel ; sortie en `private/` | MirAI/DTNUM |
| **— Spécifique MirAI —** | | |
| `mirai-smoke-test` | Smoke-test du pipeline mirai-mesreunions (gateway + auth + ingester) — sur demande explicite uniquement | mirai-only |
| `mirai-check-service-names` | Détecte les anciens noms de services mcr (rebranding 2026-05-16) | mirai-only |

Les noms suivent `<famille>-<objet>` ; tout ce qui ne sert qu'à MirAI porte le préfixe
`mirai-`, pour ne pas se déclencher sur la demande générique qui lui ressemble.

### Skills qui embarquent leurs propres artefacts

- **`dat-generation`** embarque son modèle versionné (`dat/MODELE_DAT_MirAI.docx`), son
  prompt et un `CHANGELOG.md` (issus de `IA-Generative/gen-document-homologation`,
  fusionné ici en 2026-06). Son binôme `dat-word` embarque son script de rendu et ses tests.
- **`controle-qualite-code`** est **vendoré** depuis
  [`etiquet/controle-qualite-code`](https://github.com/etiquet/controle-qualite-code), qui
  reste sa source de vérité. **Ne pas l'éditer ici** :
  [`UPSTREAM.md`](skills/controle-qualite-code/UPSTREAM.md).

## Compatibilité

| Agent | Découverte | Testé en usage réel |
|---|---|---|
| Claude Code | `~/.claude/skills` | ✅ toutes les skills |
| Codex | `~/.agents/skills` | à confirmer — [retour de test](CONTRIBUTING.md) bienvenu |
| OpenCode | `~/.agents/skills`, `~/.claude/skills` | à confirmer |
| Gemini CLI | `~/.agents/skills` | à confirmer |
| Cursor | `~/.agents/skills` | à confirmer |
| GitHub Copilot | `~/.agents/skills`, `~/.claude/skills` | à confirmer |

Limites connues hors Claude Code : `when_to_use`, `argument-hint`, `allowed-tools` et
`disable-model-invocation` sont ignorés (la `description` porte donc seule le
déclenchement), et `$ARGUMENTS` n'est pas substitué.

## Hooks (Claude Code uniquement)

| Hook | Ce qu'il bloque | Doc |
|---|---|---|
| `kustomize-guard` | `kubectl apply -f` sur un manifest `base/` (écrase les variables d'environnement de l'overlay) | [hooks/kustomize-guard.md](hooks/kustomize-guard.md) |

## Ajouter ou modifier une skill

Une skill = un dossier `skills/<nom>/SKILL.md` : un **frontmatter YAML** qui dit quand
l'utiliser, un **corps Markdown** que l'agent suit à l'invocation.

```bash
mkdir -p skills/<nom> && $EDITOR skills/<nom>/SKILL.md
./install.sh --check && ./install.sh --offline
```

```yaml
---
name: <nom>                  # obligatoire, identique au nom du dossier
description: Ce que fait la skill ET quand l'utiliser — seul champ lu par tous les agents.
when_to_use: mots-clés supplémentaires (Claude Code)
---

Les instructions que l'agent suit quand la skill est invoquée.
```

Champs optionnels (Claude Code, ignorés ailleurs — [doc](https://code.claude.com/docs/en/skills)) :

| Clé | Effet |
|---|---|
| `argument-hint: [titre]` | Indication d'argument dans l'autocomplétion |
| `allowed-tools: Bash(git *) Read` | Pré-approuve ces outils pendant que la skill tourne |
| `disable-model-invocation: true` | Seul l'utilisateur peut l'invoquer — sur tout ce qui a un effet de bord ; **le dire aussi dans la `description`** |
| `paths: ["src/**/*.ts"]` | Ne se déclenche automatiquement que sur ces fichiers |

**Livraison :** branche dédiée puis PR, jamais de commit direct sur `main`. Conventions
détaillées : [AGENTS.md](AGENTS.md) ; processus : [CONTRIBUTING.md](CONTRIBUTING.md).

## Où faire vivre une skill

| | Personnelle | Partagée — ce dépôt | Projet |
|---|---|---|---|
| Où | `~/.agents/skills/` ou `~/.claude/skills/`, en dur | `skills/` ici, lié par `install.sh` | `.agents/skills/<nom>/` (ou `.claude/skills/`) du dépôt cible |
| Pour qui | vous seul | toute l'équipe IA-Generative | les contributeurs d'un projet |
| Modification | libre | par PR | par PR sur le projet |

> ⚠️ Une skill avec `allowed-tools` accorde des permissions à Claude Code dès que le
> workspace est « trusted ». Relisez les `SKILL.md` d'un projet inconnu avant de lui faire
> confiance.

## Liens

- Standard Agent Skills : https://agentskills.io
- Claude Code : https://code.claude.com/docs/en/skills
- Codex : https://developers.openai.com/codex/skills
- OpenCode : https://opencode.ai/docs/skills/
- Gemini CLI : https://geminicli.com/docs/cli/skills/
- Cursor : https://cursor.com/docs/skills
- GitHub Copilot : https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
