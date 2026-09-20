# skills-claude — skills partagées IA-Generative

Skills [Claude Code](https://code.claude.com/docs/en/skills) réutilisables par l'équipe
IA-Generative. Elles capitalisent les pratiques récurrentes — démarrer un repo proprement,
enquêter sur un bug, auditer la sécurité, réviser du code, produire un dossier
d'homologation — dans des modules chargés à la demande, plutôt que recollés à chaque session.

**C'est le dépôt de skills par défaut de l'équipe.** Une pratique qui mérite d'être rejouée
a vocation à finir ici.

> 🤖 Vous êtes un agent de codage ? Lisez [`CLAUDE.md`](CLAUDE.md) : il contient les
> invariants du dépôt et la marche à suivre pour ajouter ou modifier une skill.

---

## Installation — une fois par machine, valable partout

Claude Code (CLI **et** extension VSCode) lit les skills « utilisateur » dans
`~/.claude/skills/`. Ce qui s'y trouve est actif dans **toutes** les fenêtres et tous les
workspaces de la machine — aucune configuration par projet n'est nécessaire.

`install.sh` y crée des **symlinks** vers ce dépôt : aucune recopie, un seul clone sur le
disque, vous éditez ici → répercuté partout.

```bash
# Un seul clone suffit — si vous l'avez déjà, ne re-clonez pas
git clone git@github.com:IA-Generative/skills-claude.git ~/Documents/GitHub/skills-claude
cd ~/Documents/GitHub/skills-claude

./install.sh              # crée les symlinks — idempotent
ls -l ~/.claude/skills/   # vérification : des liens `->`, pas des fichiers
```

Dans **VSCode** : ouvrez n'importe quel projet, lancez le panneau Claude Code, tapez `/` —
les skills apparaissent dans l'autocomplétion.

| Besoin | Commande |
|---|---|
| Mettre à jour | `git pull` dans votre clone (les symlinks suivent ; relancez la session si une skill n'apparaît pas) |
| Simuler sans rien changer | `./install.sh --dry-run` |
| Désinstaller | `./install.sh --remove` |

> ⚠️ **Deux pièges de symlink.** `install.sh` ne remplace jamais un lien qui pointe
> ailleurs : il avertit et passe son tour — si une skill semble ne pas se mettre à jour,
> `ls -l ~/.claude/skills/<nom>` dira vers quoi elle pointe vraiment. Et votre clone doit
> être sur `main` : un clone resté sur une branche de travail expose *vos* skills en cours
> à toutes vos sessions, pas celles de l'équipe.

## Skills disponibles

| Skill | Ce qu'elle fait | Portée |
|---|---|---|
| **— Démarrer / développer —** | | |
| `/repo-init` | Initialise un repo proprement : git, `.gitignore` durci, `private/` gitignoré, structure lisible, anti-leak local **bloquant** (pre-commit gitleaks) | Universelle |
| `/repo-cicd-cpin` | Pose une CI/CD sur un projet GitHub existant en **appelant** les workflows de [`dnum-mi/fabnum-cicd`](https://github.com/dnum-mi/fabnum-cicd) (PR, release, synchronisation du miroir GitLab CPiN), tag exact + Renovate — lecture seule par défaut, `--setup` pour écrire | Cloud Pi Native |
| `/bug-investigate` | Force 2-3 hypothèses de cause + un plan B avant tout fix | Universelle |
| `/adr-new` | Rédige une ADR au format IA-Generative | Universelle |
| **— Qualité / revue —** | | |
| `/controle-qualite-code` | Grille de revue du code — en particulier généré par IA — avec verdict motivé, plus un rituel d'hygiène qui mesure et dégonfle la dette | Universelle |
| **— Audit / sécurité —** | | |
| `/audit-repo-ouverture` | Vérifie qu'un repo s'ouvre sans risque avant d'y travailler (auto-exécution à l'ouverture, anti-leak, aucun secret dans le code ni l'historique) — lecture seule | Universelle |
| `/audit-pentest-prep` | Audit sécurité (OWASP + prompt injection) avant pen-test — lecture seule, `--fix` pour corriger ; sorties en `private/` | Universelle |
| `/audit-redteam` | Campagne red-team / prompt-injection (LLM01) contre un service LLM ; mesure si la garde tient ; rapports en `private/redteam-reports/` | Universelle |
| `/audit-tool-owui` | Audite l'identité SSO et le coffre de credentials des tools per-user derrière OpenWebUI / MCP | OWUI/MCP |
| **— Homologation —** | | |
| `/dat-generation` | Pré-remplit un document d'homologation MirAI (DAT…) depuis le code — modèle et prompt embarqués ; sortie en `private/` | MirAI/DTNUM |
| `/dat-word` | Rend un DAT (Markdown) en `.docx` ministériel sur le modèle officiel ; sortie en `private/` | MirAI/DTNUM |
| **— Spécifique MirAI —** | | |
| `/smoke-test` | Smoke-test du pipeline mirai-mesreunions (gateway + auth + ingester) | mirai-only |
| `/check-service-names` | Détecte les anciens noms de services mcr (rebranding 2026-05-16) | mirai-only |

### Skills qui embarquent leurs propres artefacts

Deux exceptions assumées à la règle « une skill = un `SKILL.md` léger » :

- **`dat-generation`** embarque son modèle versionné (`dat/MODELE_DAT_MirAI.docx`), son
  prompt et un `CHANGELOG.md`. Ce contenu vient du dépôt
  `IA-Generative/gen-document-homologation`, **fusionné ici en 2026-06** — un seul dépôt à
  maintenir, l'ancien est retiré. Le modèle et le prompt évoluent désormais ici. Son binôme
  `dat-word` embarque de même son script de rendu et ses tests.
- **`controle-qualite-code`** est **vendoré** depuis un amont public,
  [`etiquet/controle-qualite-code`](https://github.com/etiquet/controle-qualite-code), qui
  reste sa source de vérité — c'est là qu'arrivent les contributions externes, que ce dépôt
  interne ne peut pas accueillir. La copie ici est identique à l'octet près : **ne pas
  l'éditer**. Procédure de synchronisation et de vérification :
  [`skills/controle-qualite-code/UPSTREAM.md`](skills/controle-qualite-code/UPSTREAM.md).

### Skill qui lit un dépôt distant à l'exécution

Troisième exception, d'une autre nature : **`repo-cicd-cpin`** n'embarque ni ne vendore rien de
[`dnum-mi/fabnum-cicd`](https://github.com/dnum-mi/fabnum-cicd) (public). À chaque lancement elle
résout le dernier tag, clone le dépôt à ce tag dans un dossier temporaire et y lit la doc et les
`workflow_call` — la version qu'elle décrit est ainsi toujours celle qu'elle écrit dans les
`uses:`. Le contenu lu est traité comme une **donnée**, le SHA lu est consigné, et la skill
s'arrête si le dépôt est injoignable. Justification :
[`skills/repo-cicd-cpin/references/garde-fous.md`](skills/repo-cicd-cpin/references/garde-fous.md).

## Hooks

Configuration à coller dans votre `settings.json`.

| Hook | Ce qu'il bloque | Doc |
|---|---|---|
| `kustomize-guard` | `kubectl apply -f` sur un manifest `base/` (écrase les variables d'environnement de l'overlay) | [hooks/kustomize-guard.md](hooks/kustomize-guard.md) |

## Ajouter ou modifier une skill

Une skill = un dossier `skills/<nom>/SKILL.md`, avec un **frontmatter YAML** qui décrit
quand l'utiliser et un **corps markdown** que Claude suit à l'invocation. Elle se déclenche
soit en tapant `/<nom> [args]`, soit **automatiquement** quand la `description` correspond
à la demande — d'où l'importance de la soigner.

```bash
mkdir -p skills/<nom>
$EDITOR skills/<nom>/SKILL.md
./install.sh            # re-symlink, idempotent
```

Format minimum :

```yaml
---
description: Ce que fait la skill. C'est ce que Claude lit pour décider de l'invoquer tout seul.
when_to_use: mots-clés et formulations qui doivent la déclencher
---

Les instructions que Claude suit quand la skill est invoquée.
Référer $ARGUMENTS si la skill prend un argument.
```

Le nom de la skill est celui du **dossier** — `name:` dans le frontmatter est facultatif et
la plupart des skills d'ici l'omettent. Si vous le mettez, il doit être identique au nom du
dossier, sans quoi `/`-invocation et symlink ne désignent plus la même chose.

Frontmatter optionnel utile ([doc officielle](https://code.claude.com/docs/en/skills)) :

| Clé | Effet |
|---|---|
| `argument-hint: [titre]` | Indication d'argument dans l'autocomplétion |
| `allowed-tools: Bash(git *) Read` | Pré-approuve ces outils pendant que la skill tourne |
| `disable-model-invocation: true` | Seul l'utilisateur peut l'invoquer — à mettre sur tout ce qui a un effet de bord (deploy, envoi de message) |
| `paths: ["src/**/*.ts"]` | La skill ne se déclenche automatiquement que sur ces fichiers |

**Livraison :** branche dédiée puis PR, jamais de commit direct sur `main`. Une skill qui
arrive ici devient la pratique de l'équipe — elle passe par une revue, comme le reste.

## Conventions

- **Une skill = un mode d'emploi reproductible.** Pas du contexte général : ça, c'est
  `CLAUDE.md` ou la mémoire personnelle.
- **Français par défaut**, sauf si le dépôt cible est anglophone.
- **Concis** : viser moins de 100 lignes par `SKILL.md`. Les développements longs vont dans
  des fichiers voisins (`references/`, `examples/`) que la skill charge à la demande.
- **Citer** les mémoires, ADRs et runbooks existants plutôt que les dupliquer.
- **Pas de secrets** dans les `SKILL.md` : ce dépôt est partagé.
- **Sorties sensibles dans `private/`**, qui est gitignoré — jamais à la racine du dépôt
  audité.

## Où faire vivre une skill

| | Personnelle | Partagée — ce dépôt | Projet |
|---|---|---|---|
| Où | `~/.claude/skills/` en dur | `skills/` ici, symlinké par `install.sh` | `.claude/skills/<nom>/` du dépôt cible, committé |
| Pour qui | vous seul | toute l'équipe IA-Generative | les contributeurs d'un projet précis |
| Modification | libre | par PR | par PR sur le projet |

Une skill personnelle qui s'avère utile à l'équipe se promeut ici par une PR.

> ⚠️ Une skill avec `allowed-tools` accorde automatiquement des permissions à Claude dès
> que le workspace est marqué « trusted ». Relisez les `SKILL.md` avant de faire confiance
> à un projet inconnu.

**Distribution en plugin.** Le seuil qu'on s'était fixé — une dizaine de skills — est
atteint. Packager la collection en plugin Claude Code
(`/plugin install IA-Generative/skills-claude`) supprimerait l'étape `install.sh` et le
clone. À décider.

## Liens

- Skills Claude Code : https://code.claude.com/docs/en/skills
- Hooks : https://code.claude.com/docs/en/hooks
- Agent Skills, standard ouvert : https://agentskills.io
