# Groupe `audit` : audits et sécurité

> Chargé par le plugin OpenCode (`"groups": ["audit"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/audit/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `audit-pentest-prep` | Audit & durcissement sécurité avant pen-test (OWASP Top 10 + LLM Top 10) |
| `audit-rag` | Revue d'un pipeline RAG — découpage, embeddings, évaluation mesurée |
| `audit-redteam` | Campagne red-team / prompt-injection contre un service adossé à un LLM |
| `audit-repo-ouverture` | Vérifier qu'une base de code peut être ouverte / travaillée sans risque |
| `audit-tool-owui` | Auditer et concevoir les outils per-user derrière OpenWebUI / passerelle LLM/MCP |

## Invariants

- Les sorties des audits vont dans `private/` (gitignoré), jamais committées.
- Lecture seule par défaut : rapport + plan de remédiation ; rien n'est écrit sans `--setup`.
- Aucun secret ni nom de personne dans ce dépôt partagé.
