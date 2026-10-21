# Groupe `dev` : pratiques de développement transverses

> Chargé par le plugin OpenCode (`"groups": ["dev"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/dev/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `adr-new` | Rédiger une ADR au format IA-Generative et tenir l'index des ADR |
| `bug-investigate` | Forcer des hypothèses de cause + plan B avant tout fix de bug |
| `controle-qualite-code` | Contrôle qualité du code (copie vendorée, ne pas éditer) |

## Invariants

- `controle-qualite-code/` est une copie vendorée : ne jamais éditer son `SKILL.md` ni ses
  `references/` — rester identique à l'octet près à son amont (voir `UPSTREAM.md`).
