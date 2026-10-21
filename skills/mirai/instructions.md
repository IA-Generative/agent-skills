# Groupe `mirai` : spécifique projets MirAI

> Chargé par le plugin OpenCode (`"groups": ["mirai"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/mirai/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `mirai-check-service-names` | Détecter les anciens noms de services `mcr` (rebranding 2026-05-16) |
| `mirai-smoke-test` | Smoke-test rapide du pipeline mirai-mesreunions (gateway + auth + ingester) |

## Invariants

- Skills spécifiques au projet `mirai-mesreunions`, à ne pas déclencher sur une demande générique.
- `mirai-smoke-test` lance des appels réseau vers un environnement réel : uniquement sur demande explicite.
