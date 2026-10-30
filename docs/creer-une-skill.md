# Ajouter ou modifier une skill

Règles et invariants : [AGENTS.md](../AGENTS.md). Process de contribution : [CONTRIBUTING.md](../CONTRIBUTING.md).

Une skill = un dossier `skills/<groupe>/<nom>/SKILL.md` : un frontmatter YAML qui dit quand l'utiliser, un corps Markdown que l'agent suit. Groupes : `dev`, `audit`, `repo`, `dat`, `mirai`.

```bash
mkdir -p skills/<groupe>/<nom> && $EDITOR skills/<groupe>/<nom>/SKILL.md
node scripts/skills-index.mjs          # régénère le catalogue du groupe (vérifié par la CI)
./install.sh --check && ./install.sh --offline
```

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

Pour rester portable :

- `$ARGUMENTS` **une seule fois**, en dernière ligne, suivi de la phrase de repli ; ailleurs, parler « des arguments ».
- Nommer l'intention avant l'outil : « présente le plan et attends la validation (Claude Code : `ExitPlanMode`) ».

Champs optionnels (Claude Code, ignorés ailleurs, [doc](https://code.claude.com/docs/en/skills)) :

| Clé | Effet |
|---|---|
| `argument-hint: [titre]` | indication d'argument dans l'autocomplétion |
| `allowed-tools: Bash(git *) Read` | pré-approuve ces outils pendant la skill |
| `disable-model-invocation: true` | réserve la skill à l'humain (à répéter dans la `description`) |

## Skills qui embarquent ou lisent des sources externes

- `dat-generation` embarque son modèle (`dat/MODELE_DAT_MirAI.docx`), son prompt et un `CHANGELOG.md` (issus de `IA-Generative/gen-document-homologation`). `dat-word` embarque son script de rendu et ses tests.
- `controle-qualite-code` est **vendoré** depuis [`etiquet/controle-qualite-code`](https://github.com/etiquet/controle-qualite-code) : ne pas l'éditer ici ([UPSTREAM.md](../skills/dev/controle-qualite-code/UPSTREAM.md)).
- `repo-cicd-cpin` ne vendore rien de [`dnum-mi/fabnum-cicd`](https://github.com/dnum-mi/fabnum-cicd) : à chaque lancement elle clone le dernier tag dans un dossier temporaire et le lit comme une **donnée**. Justification : [garde-fous.md](../skills/repo/repo-cicd-cpin/references/garde-fous.md).
