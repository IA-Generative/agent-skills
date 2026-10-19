# Instructions pour un agent travaillant sur ce dépôt

Ce fichier est lu par Codex, OpenCode, Cursor, Copilot, Gemini CLI… ; `CLAUDE.md` l'importe
pour Claude Code. **Une seule source : c'est ici qu'on écrit.**

Ce dépôt **contient** des skills au format ouvert [Agent Skills](https://agentskills.io),
il n'en exécute aucune. Il n'y a rien à compiler ; les seuls tests sont
`./install.sh --check` (conformité des `SKILL.md`) et `skills/dat-word/tests/` (script de
rendu `.docx`). Le produit, ce sont des fichiers Markdown.

Le `README.md` s'adresse aux humains ; ce fichier énonce ce qu'il ne faut pas casser.

## Structure

```
skills/<nom>/SKILL.md   une skill = un dossier ; le nom du DOSSIER est le nom de la skill
hooks/<nom>.md          hooks Claude Code à coller dans un settings.json (non installés)
docs/                   documentation du dépôt (sources externes reprises ou citées)
install.sh              installe / met à jour : symlinks vers ~/.agents/skills et ~/.claude/skills
.github/                CI (./install.sh --check) et modèles d'issue
```

## Invariants

1. **Le nom du dossier fait foi, et `name:` doit lui être identique.** Le standard Agent
   Skills rend `name` **obligatoire** (Codex, OpenCode, Gemini CLI ignorent une skill sans
   lui) : minuscules, chiffres, tirets simples, 64 caractères max. `install.sh` crée un
   lien par dossier et **nettoie** les liens devenus orphelins après un renommage : relancer
   `./install.sh` suffit, sur chaque machine.
2. **Frontmatter obligatoire** : `name` et `description` (≤ 1024 caractères). La
   `description` est **le seul déclencheur que tous les agents lisent** : elle doit dire
   seule quoi et quand. `when_to_use`, `argument-hint`, `allowed-tools`,
   `disable-model-invocation` et `$ARGUMENTS` sont des extensions Claude Code, ignorées
   ailleurs — utiles, jamais suffisantes.
3. **Préfixe de famille dans le nom** : `audit-*`, `dat-*`, `repo-*`… et **`mirai-*` pour
   tout ce qui ne sert qu'aux projets MirAI**, afin qu'une skill spécifique ne se
   déclenche pas sur la demande générique qui lui ressemble.
4. **`skills/controle-qualite-code/` est une copie vendorée.** Ne jamais éditer `SKILL.md`
   ni `references/` ici : l'amont est https://github.com/etiquet/controle-qualite-code et
   la copie doit rester identique à l'octet près. Lire
   [`skills/controle-qualite-code/UPSTREAM.md`](skills/controle-qualite-code/UPSTREAM.md).
5. **Pas de secrets.** Ce dépôt est partagé. Aucune URL interne sensible, aucun token,
   aucun nom de personne dans un exemple. Les sorties des skills d'audit vont dans
   `private/`, qui est gitignoré.
6. **Livraison par PR.** Jamais de commit direct sur `main` : branche dédiée, PR, revue
   humaine. Une skill fusionnée ici se propage à toutes les machines au prochain
   `./install.sh` — le coût d'une erreur n'est pas local.

## Écrire une skill

- **Français**, sauf si le dépôt cible est anglophone.
- **Moins de 100 lignes** par `SKILL.md`. Au-delà, sortir les développements dans
  `references/` ou `examples/`, chargés à la demande.
- **Un mode d'emploi reproductible** : étapes, commandes exactes, critères d'arrêt.
- **Neutre vis-à-vis de l'agent.** Ne pas nommer un outil propre à un agent sans
  l'alternative (« présente le plan et attends la validation — sous Claude Code :
  `ExitPlanMode` »). Hors Claude Code, `$ARGUMENTS` n'est pas substitué : l'agent le lit
  comme « les arguments de la demande ».
- **Déclarer les effets de bord.** Une skill qui déploie, envoie ou supprime porte
  `disable-model-invocation: true` **et** le dit dans sa `description` (« à lancer
  uniquement sur demande explicite ») : les autres agents ignorent le champ.
- `allowed-tools` pré-approuve des outils sous Claude Code : strict nécessaire, motifs
  étroits (`Bash(git status)`) plutôt que larges (`Bash(*)`).

## Vérifications avant de proposer une PR

```bash
./install.sh --check                # frontmatter conforme, name == dossier, description ≤ 1024
./install.sh --dry-run --offline    # liens attendus, sans rien changer
git status --short                  # rien d'inattendu, pas de private/ ni de __pycache__
```
