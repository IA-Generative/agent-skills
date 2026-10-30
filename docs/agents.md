# Agents : compatibilité et limites

## Invoquer une skill

Chargement **automatique** quand la `description` correspond à la demande. Appel explicite :

| Agent | Syntaxe |
|---|---|
| Claude Code, Cursor, Copilot, Deep Code | `/<nom>` |
| Codex | `$<nom>` ou `/skills` |
| Gemini CLI | `/skills` |
| Kimi Code CLI | `/skill:<nom>` |
| Tous | « utilise la skill `<nom>` » |

## Compatibilité

| Agent | Découverte | Testé en usage réel |
|---|---|---|
| Claude Code | `~/.claude/skills` | oui, toutes les skills |
| Codex | `~/.agents/skills` | à confirmer |
| OpenCode | `~/.agents/skills`, `~/.claude/skills` | oui (1.x) |
| Gemini CLI | `~/.agents/skills` | à confirmer |
| Cursor | `~/.agents/skills` | à confirmer |
| GitHub Copilot | `~/.agents/skills`, `~/.claude/skills` | à confirmer |

Retours de test : [CONTRIBUTING.md](../CONTRIBUTING.md).

## Différences entre agents

| | Claude Code | Ailleurs |
|---|---|---|
| Arguments | `$ARGUMENTS` remplacé dans le corps | pas de substitution : la skill les lit dans la demande |
| Plan avant d'agir | mode plan, `ExitPlanMode` | la skill demande de présenter le plan et d'attendre la validation |
| Réserver à l'humain | `disable-model-invocation: true` | honoré par Cursor, VS Code, Vibe ; Codex lit `agents/openai.yaml` |
| `allowed-tools` | pré-approuve ces outils | sans effet |

Les clés de frontmatter propres à Claude Code sont ignorées ailleurs : la `description` porte seule le déclenchement (Kimi et Deep Code ne lisent que `name` et `description`). `skills-ref validate` refuse ces clés : écart assumé. Écrire des skills portables : [creer-une-skill.md](creer-une-skill.md).

## Limites connues

- **Symlinks** : garantis par leur documentation chez Codex et Roo Code seulement. Copilot CLI et Cursor les ont corrigés début 2026 ; Deep Code et Kimi les suivent (lu dans leur code, octobre 2026). Sinon, copier le dossier. Ne jamais faire du répertoire parent (`~/.agents/skills`) un symlink.
- **Z.AI (GLM)** : pas d'agent à skills documenté ; c'est l'agent hôte (Claude Code, Codex, OpenCode, Cursor…) qui lit les skills. ZCode : non vérifié.
- Un modèle tiers derrière un agent ne change rien : c'est l'agent qui lit les skills.
