# Instructions pour un agent travaillant sur ce dépôt

Ce dépôt **contient** des skills Claude Code, il n'en exécute aucune. Il n'y a rien à
compiler, aucune suite de tests à lancer (hors `skills/dat-word/tests/`, qui teste le
script de rendu `.docx`). Le produit, ce sont des fichiers Markdown.

Le `README.md` s'adresse aux humains ; ce fichier énonce ce qu'il ne faut pas casser.

## Structure

```
skills/<nom>/SKILL.md   une skill = un dossier ; le nom du DOSSIER est le nom de la skill
hooks/<nom>.md          hooks à coller dans un settings.json (pas installés par install.sh)
install.sh              symlinke chaque skills/<nom>/ vers ~/.claude/skills/<nom>
```

## Invariants

1. **Le nom du dossier fait foi.** `install.sh` boucle sur `skills/*/` et crée un symlink
   par dossier ; c'est ce nom qui devient `/<nom>`. Un `name:` dans le frontmatter est
   facultatif — s'il est présent, il doit être identique au nom du dossier. **Renommer un
   dossier casse les symlinks existants** de toute la machine : le lien devient mort et
   `install.sh` ne le nettoie pas (il ne supprime que des liens valides pointant vers ce
   dépôt). Un renommage exige donc `./install.sh --remove` **avant**, puis `./install.sh`
   après.
2. **Frontmatter obligatoire.** Tout `SKILL.md` commence par un frontmatter YAML avec au
   moins `description` (ce que Claude lit pour s'auto-invoquer) et, par convention ici,
   `when_to_use`. Sans lui, la skill est invisible.
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
- `allowed-tools` pré-approuve des outils dès que le workspace est « trusted » : n'y mettre
  que le strict nécessaire, et préférer des motifs étroits (`Bash(git status)`) aux larges
  (`Bash(*)`).

## Vérifications avant de proposer une PR

```bash
./install.sh --dry-run                              # les symlinks attendus, sans rien changer
ls skills/*/SKILL.md                                # tout dossier de skills/ a bien son SKILL.md
head -1 skills/*/SKILL.md                           # chaque SKILL.md ouvre sur un `---`
git status --short                                  # rien d'inattendu, pas de private/ ni de __pycache__
```
