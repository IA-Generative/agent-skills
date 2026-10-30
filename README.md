# agent-skills — skills partagées IA-Generative, pour tous les agents de code

Des skills réutilisables par l'équipe IA-Generative, au format ouvert
[Agent Skills](https://agentskills.io) : un dossier, un `SKILL.md`. Elles capitalisent les
pratiques récurrentes — démarrer un repo proprement, enquêter sur un bug, auditer la
sécurité, réviser du code, produire un dossier d'homologation — dans des modules que
l'agent charge à la demande, plutôt que recollés à chaque session.

Elles fonctionnent avec **Claude Code, Codex, OpenCode, Gemini CLI, Cursor, GitHub
Copilot, Kimi Code CLI (Moonshot), Deep Code (DeepSeek)** et tout agent qui lit le standard.
Un modèle tiers (DeepSeek, GLM de Z.AI, Kimi…) branché derrière l'un de ces agents ne change
rien : c'est l'agent qui lit les skills, pas le modèle.

> **État des tests.** Ces skills ont été écrites et éprouvées **surtout avec Claude Code**.
> Sur les autres agents, elles sont installées et découvertes, mais leur comportement
> réel reste à confirmer. **Vos retours sont attendus** — tests, issues, PR, quel que
> soit votre agent : voir [CONTRIBUTING.md](CONTRIBUTING.md).

> 🤖 Vous êtes un agent de codage ? Lisez [`AGENTS.md`](AGENTS.md) : invariants du dépôt
> et marche à suivre pour ajouter ou modifier une skill.

---

## Par où commencer : quel canal, pour qui

| Vous êtes… | Installez | Détail |
|---|---|---|
| **Développeur·se sous Claude Code** | le bundle `mishell-base` (socle Fabrique Numérique), plus `mishell-skills` si vous voulez aussi les skills de ce dépôt | [marketplace](#installer-par-plugin-opencode-ou-marketplace-claude-code) |
| **Équipe sécurité, homologation ou déploiement Cloud Pi Native** | `mishell-more` : audits, DAT, guides ANSSI, RGAA, skills DSO | [bundles](#skills-dautres-dépôts--les-bundles-mishell-base-et-mishell-more) |
| **Développeur·se sous OpenCode** | le plugin OpenCode, avec `groups` et/ou `bundles` | [plugin OpenCode](#installer-par-plugin-opencode-ou-marketplace-claude-code) |
| **Codex, Gemini CLI, Cursor, Copilot, Kimi, Deep Code** | `install.sh` (liens symboliques vers `~/.agents/skills`) | [une seule commande](#installer-ou-mettre-à-jour--une-seule-commande) |
| **Contributeur·rice** | un clone puis `./install.sh` : votre clone devient la source des liens | [Ajouter une skill](#ajouter-ou-modifier-une-skill) |

Quel que soit le canal, ce dépôt est **interne** à l'organisation GitHub IA-Generative : il faut en être
membre et connecté à GitHub (`gh auth login`). Les sources tierces des bundles sont publiques.
Une méthode de développement générique (TDD, débogage, revue) n'est **pas** dans ces bundles :
voir [la section dédiée](#recommandé-en-complément--une-méthode-de-développement-de-base).

## Installer par plugin (OpenCode) ou marketplace (Claude Code)

Deux agents savent charger ces skills **sans clone ni symlink** : OpenCode via son mécanisme
de plugin, Claude Code via sa marketplace.

**OpenCode** — ajoutez dans `opencode.json` (le plugin est téléchargé dans le cache, pas dans
votre projet) :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["agent-skills@git+https://github.com/IA-Generative/agent-skills.git",
              { "groups": ["dev", "repo"] }]]
}
```

`groups` choisit les groupes de skills à charger : `dev`, `audit`, `repo`, `dat`, `mirai`
(défaut : tous). Le plugin ne fait qu'exposer les skills : rien n'est injecté en session.
Quittez et relancez opencode après modification.

**Claude Code** — installez la marketplace puis le plugin (une seule commande avec
`--marketplace` depuis v2.1.275) :

```bash
/plugin install mishell-skills --marketplace IA-Generative/agent-skills
```

Équivalent en deux étapes, pour les versions antérieures à v2.1.275 :

```bash
/plugin marketplace add IA-Generative/agent-skills
/plugin install mishell-skills@mishell
```

`IA-Generative/agent-skills` est la **source** (le repo GitHub) ; `mishell` est le **nom**
sous lequel la marketplace s'enregistre (champ `name` de `marketplace.json` — nécessairement
différent de `agent-skills`, réservé par Anthropic).

- `marketplace add` n'enregistre que le **catalogue** : tant qu'un `install` n'a pas eu lieu, `/plugin`
  liste les plugins de la marketplace (onglet *Discover*) mais **aucune skill n'est chargée**.
- Après l'installation : `/reload-plugins`, puis `claude plugin list` doit afficher
  `mishell-skills@mishell` comme `enabled`. Les skills se lancent alors sous `/mishell-skills:<nom>`.
- Le plugin embarque les skills des 5 groupes ; rien n'est injecté au démarrage de session.
- Le plugin s'appelait `skills` : déjà installé, le retirer (`/plugin uninstall skills@mishell`) avant d'installer `mishell-skills`.

> **Un seul canal pour Claude Code.** Avec le plugin **et** `install.sh`, chaque skill apparaît
> deux fois (`/repo-perimetre` et `/mishell-skills:repo-perimetre`). Si vous passez au plugin, retirez
> les liens : `./install.sh --uninstall --target claude`.

### Skills d'autres dépôts : les bundles `mishell-base` et `mishell-more`

Deux **bundles** regroupent des skills de ce dépôt et de dépôts tiers. Rien de tiers n'est copié
ici : `.claude-plugin/marketplace.json` référence chaque source (dépôt, **commit figé**, skill ou dossier
de skills), et chaque agent la télécharge chez GitHub à l'installation. Les bundles sont des
méta-plugins qui n'ont que des `dependencies`.

| Bundle | Contenu |
|---|---|
| `mishell-base` | skills CI/CD et transverses Fabrique Numérique (`dnum-mi/fabnum-cicd`, `dnum-mi/transversal-doc`) |
| `mishell-more` | groupes `audit` et `dat` de ce dépôt, `anssi-guides` et `rgaa` (`etalab-ia/skills`), skills DSO (`dnum-mi/starter-kit-opencode`) |

```bash
/plugin install mishell-base --marketplace IA-Generative/agent-skills   # Claude Code
/plugin install mishell-more --marketplace IA-Generative/agent-skills   # facultatif
```

OpenCode : le plugin lit ce même `marketplace.json`. `"bundles": ["mishell-base"]` se place à côté
de `groups` (sans `groups`, seules les skills des bundles sont chargées ; sans `groups` ni
`bundles`, tous les groupes le sont comme avant).
Une source dont une skill porte le nom d'une skill déjà exposée est ignorée avec un avertissement,
car les noms sont à plat sous OpenCode.

- Le premier démarrage télécharge les sources dans `~/.cache/agent-skills/` (git requis) ; une
  source injoignable est ignorée sans empêcher le reste de charger.
- Testé avec OpenCode 1.18 (`skills.paths`). La V2 range les skills dans un tableau `skills` : non vérifié.
- Pour les seules skills DSO, OpenCode sait aussi les charger **sans ce plugin**, par son catalogue HTTP
  natif, figé sur un commit (le dépôt publie son `index.json`) ; ne pas combiner avec `mishell-more` :
  ```json
  { "skills": { "urls": ["https://raw.githubusercontent.com/dnum-mi/starter-kit-opencode/d10ffaa9b78ded708ad9e5b3fd40bccc35afc344/.agents/skills/dso/"] } }
  ```
- `install.sh` n'installe **pas** ces sources : il ne gère que les skills de ce dépôt.
- `mishell-base` suit deux branches de travail encore ouvertes (`fabnum-cicd`, `transversal-doc`) :
  repointer vers `main` ou un tag à leur fusion (champ `sha` des entrées de `marketplace.json`).

> Le `install.sh` ci-dessous reste le chemin universel (symlinks) pour les autres agents
> (Codex, Gemini CLI, Cursor, Copilot, Kimi, Deep Code) et pour ceux qui préfèrent une
> seule commande idempotente sur toutes les machines.

### Recommandé en complément : une méthode de développement de base

Les skills d'ici couvrent le cycle de vie des dépôts, l'audit et l'homologation. Elles ne remplacent pas
une **méthode de développement** de base (cadrer, tester d'abord, déboguer, faire relire). Trois dépôts
tiers, publics, la couvrent ; ils ne sont **pas** inclus dans les bundles (rien n'est copié ici, et ils
évoluent vite). À installer vous-même, sous Claude Code :

| Source | Ce que c'est | Installer |
|---|---|---|
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | skills à la carte pour développeur·se : TDD, diagnostic de bug, revue de code, interrogation d'un plan (`grilling`), modélisation du domaine… | `claude plugin install mattpocock-skills@claude-plugins-official` |
| [`obra/superpowers`](https://github.com/obra/superpowers) | une méthode complète en skills : brainstorming, plan d'implémentation, TDD, débogage systématique, revue, vérification avant de conclure | `/plugin install superpowers@claude-plugins-official` |
| [`forrestchang/andrej-karpathy-skills`](https://github.com/forrestchang/andrej-karpathy-skills) | quatre principes courts tirés d'un post public d'Andrej Karpathy : réfléchir avant de coder, simplicité d'abord, changements chirurgicaux, exécution guidée par un objectif vérifiable. Dépôt **tiers**, pas de Karpathy lui-même | `/plugin marketplace add forrestchang/andrej-karpathy-skills` puis `/plugin install andrej-karpathy-skills@karpathy-skills` |

**Notre recommandation :** choisissez **une seule** des deux premières. Elles couvrent le même terrain
(TDD, débogage, revue) et se déclencheraient sur les mêmes demandes : `mattpocock/skills` si vous voulez
choisir skill par skill, `superpowers` si vous voulez un enchaînement complet déjà posé. Les principes
Karpathy tiennent en peu de texte et se tentent en plus de l'une ou l'autre. Cette recommandation vient de
la lecture de leurs dépôts, pas d'un test comparatif ici : retours bienvenus.

Pour les autres agents, suivre le README de chaque dépôt (il s'installe séparément pour chaque agent).
Revue, licences et recoupements avec nos skills : [docs/sources-externes.md](docs/sources-externes.md).

---

## Installer ou mettre à jour — une seule commande

Le dépôt est **interne** à l'organisation GitHub IA-Generative : il faut en être membre.

**1. Une fois par machine : `git` et `gh`, puis se connecter.**

| Système | Installer `git` et `gh` |
|---|---|
| macOS | `xcode-select --install` (attendre la fin), puis `brew install gh` — sans Homebrew : l'installeur `.pkg` de [cli.github.com](https://cli.github.com) |
| Windows | `winget install --id Git.Git -e` puis `winget install --id GitHub.cli -e` (l'installeur de Git demande une élévation), puis recharger le `PATH` ci-dessous |
| Linux | `git` par le gestionnaire de paquets ; `gh` selon [la page d'installation de gh](https://github.com/cli/cli#installation) (`apt`, `dnf`…) |

```powershell
# Windows seulement : la session ne voit pas encore gh ; recharger le PATH (ou rouvrir PowerShell)
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

```bash
gh auth login --web -p https
```

**2. Installer — et plus tard mettre à jour : la même ligne.**

macOS et Linux (terminal) :

```bash
gh api repos/IA-Generative/agent-skills/contents/install.sh -H "Accept: application/vnd.github.raw" | bash
```

Windows (PowerShell, sans droits administrateur) :

```powershell
& ([scriptblock]::Create((gh api repos/IA-Generative/agent-skills/contents/install.ps1 -H "Accept: application/vnd.github.raw" | Out-String)))
```

Le dépôt est cloné dans `~/.local/share/agent-skills` au premier passage, mis à jour aux
suivants, et chaque skill est liée dans les dossiers que lisent les agents (une **jonction**
sous Windows, un lien symbolique ailleurs). Relancer ensuite la session de l'agent.

> Installez votre agent **avant** les skills. Si vous ajoutez Claude Code plus tard, relancez
> la même ligne : il ne lit pas `~/.agents/skills` et n'est équipé que s'il est détecté.

> Contributeur, vous avez déjà un clone ? Lancez `./install.sh` (ou
> `powershell -ExecutionPolicy Bypass -File install.ps1`) depuis celui-ci : il devient la
> source des liens. Un `curl` sur `raw.githubusercontent.com` répond **404** : ce domaine ne
> sert pas les dépôts internes, d'où `gh api`.

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

> **Même contenu par toutes les voies.** `install.sh` crée un lien par **skill** ; le plugin
> OpenCode et la marketplace Claude exposent les mêmes skills. Aucune voie n'injecte de
> consigne de groupe : tout ce qu'une skill doit dire est dans son `SKILL.md`.

| Dossier cible | Lu par | Installé |
|---|---|---|
| `~/.agents/skills/` | Codex, Gemini CLI, Cursor, GitHub Copilot, OpenCode, Kimi Code CLI, Deep Code | toujours |
| `~/.claude/skills/` | Claude Code (CLI, VSCode, desktop) | si Claude Code est détecté |
| `~/.config/opencode/skills/`, `~/.gemini/skills/`, `~/.cursor/skills/`, `~/.copilot/skills/`, `~/.kimi/skills/`, `~/.deepcode/skills/` | versions d'agent qui ne lisent pas encore `~/.agents/skills` | sur demande : `--target opencode` … |

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
> Windows : `install.ps1` accepte les mêmes options sous la forme `-DryRun`, `-Offline`,
> `-Force`, `-Uninstall`, `-Target agents,claude`.

Certains agents (OpenCode, Copilot, Kimi Code CLI) lisent **aussi** `~/.claude/skills` : ils voient alors
chaque skill deux fois, sous le même nom et vers le même dossier. Si c'est gênant et que
vous n'utilisez pas Claude Code : `./install.sh --uninstall --target claude`.

### Invoquer une skill

Tous les agents chargent une skill **automatiquement** quand sa `description` correspond
à la demande. Pour l'appeler explicitement : `/<nom>` dans Claude Code, Cursor et Copilot,
`$<nom>` ou `/skills` dans Codex, `/skills` dans Gemini CLI, `/skill:<nom>` dans Kimi Code CLI,
`/<nom>` dans Deep Code, ou simplement « utilise la skill `<nom>` » partout.

### Autres agents

Deux limites à connaître :

- **Les symlinks ne sont garantis par leur documentation que chez Codex et Roo Code.**
  Copilot CLI et Cursor les ont corrigés début 2026 ; Deep Code les accepte explicitement et
  Kimi Code CLI les suit (lu dans leur code, octobre 2026) ; pour les autres, vérifiez que la skill
  apparaît, et sinon copiez le dossier à la main. Ne faites jamais du répertoire *parent*
  (`~/.agents/skills`) lui-même un symlink : c'est le cas qui échoue.
- **Le frontmatter porte des clés propres à Claude Code** (`when_to_use`, `argument-hint`,
  `disable-model-invocation`) que la spec ne connaît pas. Les agents les ignorent, mais le
  validateur de référence `skills-ref validate` les refuse : c'est un écart assumé, Claude
  Code ne lirait plus ces clés si on les rangeait sous `metadata`. Kimi Code CLI et Deep Code
  ne lisent que `name` et `description` : `disable-model-invocation` n'y protège rien, seule
  la mention « sur demande explicite » dans la `description` compte.
- **Z.AI (GLM)** n'a pas d'agent à skills documenté : le GLM Coding Plan se consomme via
  Claude Code, Codex, OpenCode, Cursor, Pi, Roo… et c'est cet agent hôte qui lit les skills.
  ZCode, leur environnement graphique, n'a pas de documentation `SKILL.md` : non vérifié.

Ce qui change d'un agent à l'autre, et comment les skills d'ici s'en accommodent :

| | Claude Code | Ailleurs |
|---|---|---|
| Lancer une skill | `/<nom> args` | `/<nom>`, `$<nom>` (Codex) ou `@<nom>` (Windsurf), suivi du texte libre |
| Arguments | `$ARGUMENTS` est remplacé dans le corps | Pas de substitution : la skill dit de les prendre dans la demande |
| Plan avant d'agir | mode plan, `ExitPlanMode` | La skill demande de présenter le plan et d'attendre la validation |
| Réserver à l'humain | `disable-model-invocation: true` | Honoré par Cursor, VS Code et Vibe ; **Codex** lit `agents/openai.yaml` dans le dossier de la skill |
| `allowed-tools` | Pré-approuve ces outils | Noms d'outils propres à Claude Code : sans effet ailleurs |

## Skills disponibles

| Skill | Ce qu'elle fait | Portée |
|---|---|---|
| **Groupe `dev` — développer** | | |
| `bug-investigate` | Force 2-3 hypothèses de cause + un plan B, puis un test rouge qui reproduit le bug, avant tout fix | Universelle |
| `adr-new` | Rédige une ADR au format IA-Generative et tient l'index `docs/adr/README.md` | Universelle |
| `controle-qualite-code` | Grille de revue du code — en particulier généré par IA — avec verdict motivé, plus un rituel d'hygiène qui mesure et dégonfle la dette | Universelle |
| **Groupe `repo` — cycle de vie des dépôts** | | |
| `repo-init` | Initialise un repo proprement : git, `.gitignore` durci, `private/` gitignoré, structure lisible, anti-leak local **bloquant** (pre-commit gitleaks) | Universelle |
| `repo-cicd-cpin` | Pose une CI/CD sur un projet GitHub existant en **appelant** les workflows de [`dnum-mi/fabnum-cicd`](https://github.com/dnum-mi/fabnum-cicd) (PR, release, synchronisation du miroir GitLab CPiN), tag exact + Renovate — lecture seule par défaut, `--setup` pour écrire | Cloud Pi Native |
| `repo-version-json` | Fait porter à l'image son journal de version (ADR-0004, format Dockerflow) : `scripts/version_json.py`, bloc Dockerfile, route `GET /__version__` dans le langage du projet (version, commit, changements de la version **et historique complet**), test, build-args CI et contrôle « l'image dit la même chose que le tag », consigne d'un CHANGELOG public et lisible hors projet avec son contrôle — lecture seule par défaut, `--setup` pour écrire ; mode d'emploi développeur embarqué | Universelle |
| `repo-impact` | Analyse d'impact avant un changement risqué (appelants, données, contrats, retour arrière) et alignement prévu / diff réel après — lecture seule | Universelle |
| `repo-perimetre` | Avant un push ou une PR : chaque hunk du diff sert l'intention, lui est nécessaire, ou est hors périmètre (refactor au passage, formatage, correction d'un autre bug, abstraction non demandée) ; chiffre ce qui « bave », repère la sur-ingénierie et dit quoi retirer ou sortir en PR séparée — lecture seule | Universelle |
| **Groupe `audit` — audits / sécurité** | | |
| `audit-repo-ouverture` | Vérifie qu'un repo s'ouvre sans risque avant d'y travailler (auto-exécution à l'ouverture — y compris hooks d'agent et serveurs MCP du dépôt —, anti-leak, aucun secret dans le code ni l'historique) — lecture seule | Universelle |
| `audit-pentest-prep` | Audit sécurité (OWASP + prompt injection) avant pen-test — lecture seule, `--fix` pour corriger ; sorties en `private/` | Universelle |
| `audit-redteam` | Campagne red-team / prompt-injection (LLM01) contre un service LLM ; mesure si la garde tient ; rapports en `private/redteam-reports/` | Universelle |
| `audit-tool-owui` | Audite l'identité SSO, le coffre de credentials et la frontière d'action des tools per-user derrière OpenWebUI / MCP | OWUI/MCP |
| `audit-rag` | Revue d'un pipeline RAG (découpage, reranking, citations, « contexte insuffisant ») avec évaluation mesurée exigée — lecture seule | Universelle |
| **Groupe `dat` — homologation** | | |
| `dat-generation` | Pré-remplit un document d'homologation MirAI (DAT…) depuis le code — modèle et prompt embarqués ; sortie en `private/` | MirAI/DTNUM |
| `dat-word` | Rend un DAT (Markdown) en `.docx` ministériel sur le modèle officiel ; sortie en `private/` | MirAI/DTNUM |
| **Groupe `mirai` — spécifique MirAI** | | |
| `mirai-smoke-test` | Smoke-test du pipeline mirai-mesreunions (gateway + auth + ingester) — sur demande explicite uniquement | mirai-only |
| `mirai-check-service-names` | Détecte les anciens noms de services mcr (rebranding 2026-05-16) | mirai-only |

Les skills sont rangées par **groupe** dans `skills/<groupe>/`, et leurs noms suivent
`<famille>-<objet>` : le groupe range les dossiers, il ne protège pas des collisions chez les
agents. Tout ce qui ne sert qu'à MirAI porte le préfixe `mirai-`, pour ne pas se déclencher sur
la demande générique qui lui ressemble.

### Skills qui embarquent leurs propres artefacts

- **`dat-generation`** embarque son modèle versionné (`dat/MODELE_DAT_MirAI.docx`), son
  prompt et un `CHANGELOG.md` (issus de `IA-Generative/gen-document-homologation`,
  fusionné ici en 2026-06). Son binôme `dat-word` embarque son script de rendu et ses tests.
- **`controle-qualite-code`** est **vendoré** depuis
  [`etiquet/controle-qualite-code`](https://github.com/etiquet/controle-qualite-code), qui
  reste sa source de vérité. **Ne pas l'éditer ici** :
  [`UPSTREAM.md`](skills/dev/controle-qualite-code/UPSTREAM.md).

### Skill qui lit un dépôt distant à l'exécution

D'une autre nature : **`repo-cicd-cpin`** n'embarque ni ne vendore rien de
[`dnum-mi/fabnum-cicd`](https://github.com/dnum-mi/fabnum-cicd) (public). À chaque lancement elle
résout le dernier tag, clone le dépôt à ce tag dans un dossier temporaire et y lit la doc et les
`workflow_call` — la version qu'elle décrit est ainsi toujours celle qu'elle écrit dans les
`uses:`. Le contenu lu est traité comme une **donnée**, le SHA lu est consigné, et la skill
s'arrête si le dépôt est injoignable. Justification :
[`skills/repo/repo-cicd-cpin/references/garde-fous.md`](skills/repo/repo-cicd-cpin/references/garde-fous.md).

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
| `destructive-guard` | commandes destructrices ou irréversibles (`git reset --hard`, `push --force`, `DROP TABLE`, `kubectl delete ns`…) | [hooks/destructive-guard.md](hooks/destructive-guard.md) |

## Ajouter ou modifier une skill

Une skill = un dossier `skills/<groupe>/<nom>/SKILL.md` : un **frontmatter YAML** qui dit
quand l'utiliser, un **corps Markdown** que l'agent suit à l'invocation. Les skills sont
rangées dans l'un des 5 groupes : `dev`, `audit`, `repo`, `dat`, `mirai`.

```bash
mkdir -p skills/<groupe>/<nom> && $EDITOR skills/<groupe>/<nom>/SKILL.md
./install.sh --check && ./install.sh --offline
```

Après ajout, régénérez le catalogue du groupe : `node scripts/skills-index.mjs` (la CI
vérifie qu'il est à jour).

```yaml
---
name: <nom>                  # obligatoire, identique au nom du dossier
description: Ce que fait la skill ET quand l'utiliser — seul champ lu par tous les agents.
when_to_use: mots-clés supplémentaires (Claude Code)
---

Les instructions que l'agent suit quand la skill est invoquée.

**Demande** : $ARGUMENTS

> Si la ligne ci-dessus montre encore un nom de variable, ton agent ne substitue pas les
> arguments : prends-les dans la demande de l'utilisateur.
```

Pour rester portable, n'écrivez `$ARGUMENTS` qu'**une fois**, sur la dernière ligne, suivie de
la phrase de repli ci-dessus ; ailleurs dans le corps, parlez « des arguments ». Et nommez
l'intention avant l'outil : « présente le plan et attends la validation (Claude Code :
`ExitPlanMode`) ».

Champs optionnels (Claude Code, ignorés ailleurs — [doc](https://code.claude.com/docs/en/skills)) :

| Clé | Effet |
|---|---|
| `argument-hint: [titre]` | Indication d'argument dans l'autocomplétion |
| `allowed-tools: Bash(git *) Read` | Pré-approuve ces outils pendant que la skill tourne |
| `disable-model-invocation: true` | Seul l'utilisateur peut l'invoquer — sur tout ce qui a un effet de bord ; **le dire aussi dans la `description`**, et joindre `agents/openai.yaml` (`policy.allow_implicit_invocation: false`) pour Codex, qui ignore cette clé |
| `paths: ["src/**/*.ts"]` | Ne se déclenche automatiquement que sur ces fichiers |

**Livraison :** branche dédiée puis PR, jamais de commit direct sur `main`. Conventions
détaillées : [AGENTS.md](AGENTS.md) ; processus : [CONTRIBUTING.md](CONTRIBUTING.md).

## Où faire vivre une skill

| | Personnelle | Partagée — ce dépôt | Projet |
|---|---|---|---|
| Où | `~/.agents/skills/` ou `~/.claude/skills/`, en dur | `skills/<groupe>/` ici, chargé par `install.sh` ou par plugin (OpenCode / marketplace Claude) | `.agents/skills/<nom>/` (ou `.claude/skills/`) du dépôt cible |
| Pour qui | vous seul | toute l'équipe IA-Generative | les contributeurs d'un projet |
| Modification | libre | par PR | par PR sur le projet |

> ⚠️ Une skill avec `allowed-tools` accorde des permissions à Claude Code dès que le
> workspace est « trusted ». Relisez les `SKILL.md` d'un projet inconnu avant de lui faire
> confiance.

## Liens

- Sources externes reprises ou citées (dont ECC) : [docs/sources-externes.md](docs/sources-externes.md)

- Standard Agent Skills : https://agentskills.io
- Claude Code : https://code.claude.com/docs/en/skills
- Codex : https://developers.openai.com/codex/skills
- OpenCode : https://opencode.ai/docs/skills/
- Gemini CLI : https://geminicli.com/docs/cli/skills/
- Cursor : https://cursor.com/docs/skills
- GitHub Copilot : https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
