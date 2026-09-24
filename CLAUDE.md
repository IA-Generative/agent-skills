# Instructions pour un agent travaillant sur ce dépôt

Ce dépôt **contient** des skills — écrites pour Claude Code, au format ouvert Agent Skills,
donc lues aussi par d'autres agents (Codex, Gemini CLI, Cursor…) — il n'en exécute aucune.
Il n'y a rien à compiler, aucune suite de tests à lancer (hors `skills/dat-word/tests/`, qui
teste le script de rendu `.docx`). Le produit, ce sont des fichiers Markdown.

Le `README.md` s'adresse aux humains ; ce fichier énonce ce qu'il ne faut pas casser.

## Structure

```
skills/<nom>/SKILL.md   une skill = un dossier ; le nom du DOSSIER est le nom de la skill
hooks/<nom>.md          hooks à coller dans un settings.json (pas installés par install.sh)
install.sh              symlinke chaque skills/<nom>/ vers ~/.claude/skills/<nom>
                        (+ ~/.agents/skills/<nom> avec --agents, + tout --target <dir>)
AGENTS.md               symlink vers ce fichier, pour les agents qui ne lisent pas CLAUDE.md
```

## Invariants

1. **Le nom du dossier fait foi.** `install.sh` boucle sur `skills/*/` et crée un symlink
   par dossier ; c'est ce nom qui devient `/<nom>`. Le `name:` du frontmatter est
   obligatoire et **identique au nom du dossier** : la spec Agent Skills l'exige et les agents
   autres que Claude Code s'y fient. **Renommer un dossier casse les symlinks existants** de
   toute la machine : le lien devient mort et
   `install.sh` ne le nettoie pas (il ne supprime que des liens valides pointant vers ce
   dépôt). Un renommage exige donc `./install.sh --remove` **avant**, puis `./install.sh`
   après.
2. **Frontmatter obligatoire.** Tout `SKILL.md` commence par un frontmatter YAML avec au
   moins `name`, `description` (ce que l'agent lit pour s'auto-invoquer, 1024 caractères au
   plus) et, par convention ici, `when_to_use`. Sans lui, la skill est invisible.
   `when_to_use` est propre à Claude Code : un déclencheur indispensable va aussi dans
   `description`. Le frontmatter doit être du **YAML strict** : une valeur qui contient `: `
   ou qui commence par `[` se met entre guillemets. Claude Code pardonne l'oubli, les autres
   agents écartent la skill sans rien dire.
3. **`skills/controle-qualite-code/` est une copie vendorée.** Ne jamais l'éditer ici :
   l'amont est https://github.com/etiquet/controle-qualite-code et la copie doit rester
   identique à l'octet près. Lire
   [`skills/controle-qualite-code/UPSTREAM.md`](skills/controle-qualite-code/UPSTREAM.md)
   avant toute intervention dessus.
4. **Pas de secrets.** Ce dépôt est partagé à l'échelle de l'organisation. Aucune URL
   interne sensible, aucun token, aucun nom de personne dans un exemple. Les sorties que
   produisent les skills d'audit vont dans `private/`, qui est gitignoré.
5. **Livraison par PR.** Jamais de commit direct sur `main` : branche dédiée, PR, revue
   humaine. Une skill fusionnée ici devient la pratique par défaut de toute l'équipe et se
   propage à toutes les machines au prochain `git pull` — le coût d'une erreur n'est pas
   local.

## Écrire une skill

- **Français**, sauf si le dépôt cible est anglophone.
- **Moins de 100 lignes** par `SKILL.md`. Au-delà, sortir les développements dans
  `references/` ou `examples/` à côté, que la skill charge à la demande — le corps du
  `SKILL.md` entre dans le contexte à chaque invocation, pas les fichiers voisins.
- **Un mode d'emploi reproductible**, pas du contexte général : des étapes, des commandes
  exactes, des critères d'arrêt. Ce qui relève du contexte va dans un `CLAUDE.md`.
- **Déclarer les effets de bord.** Une skill qui déploie, envoie ou supprime porte
  `disable-model-invocation: true` pour que seul un humain puisse la lancer.
- **Rester portable.** Trois constructions sont propres à Claude Code ; les écrire ainsi :
  - `$ARGUMENTS` **une seule fois**, sur la dernière ligne, suivie de la phrase de repli
    (modèle : fin de `skills/adr-new/SKILL.md`). Ailleurs dans le corps, écrire « les
    arguments » : Claude Code remplace *toutes* les occurrences, les autres agents aucune.
  - l'intention avant l'outil : « présente le plan et attends la validation (Claude Code :
    `ExitPlanMode`) », jamais le nom d'outil seul.
  - `disable-model-invocation: true` s'accompagne de `agents/openai.yaml` contenant
    `policy.allow_implicit_invocation: false` — Codex ignore la clé du frontmatter.
  Les clés propres à Claude Code restent à la racine du frontmatter, pas sous `metadata` :
  Claude Code ne les y lirait plus. `skills-ref validate` les refuse, c'est assumé.
- `allowed-tools` pré-approuve des outils dès que le workspace est « trusted » : n'y mettre
  que le strict nécessaire, et préférer des motifs étroits (`Bash(git status)`) aux larges
  (`Bash(*)`).

## Vérifications avant de proposer une PR

```bash
./install.sh --dry-run --agents                     # les symlinks attendus, sans rien changer
ls skills/*/SKILL.md                                # tout dossier de skills/ a bien son SKILL.md
head -1 skills/*/SKILL.md                           # chaque SKILL.md ouvre sur un `---`
for f in skills/*/SKILL.md; do d=$(basename "$(dirname "$f")")   # `name:` = nom du dossier
  grep -qx "name: $d" "$f" || echo "name manquant ou différent : $d"; done
grep -c 'ARGUMENTS' skills/*/SKILL.md               # 0 ou 1 par skill (hors copie vendorée)
python3 -c 'import glob,yaml; [yaml.safe_load(open(f).read()[4:].split("\n---",1)[0]) for f in glob.glob("skills/*/SKILL.md")]'  # YAML strict (pyyaml)
git status --short                                  # rien d'inattendu, pas de private/ ni de __pycache__
```
