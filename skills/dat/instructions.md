# Groupe `dat` : dossiers d'homologation MirAI

> Chargé par le plugin OpenCode (`"groups": ["dat"]`) ou via la marketplace Claude
> (`/plugin install skills --marketplace IA-Generative/agent-skills`). Voir le README.

## Skills

Skills dans `skills/dat/` :

| Skill | Quand l'utiliser |
|-------|-----------------|
| `dat-generation` | Pré-remplir un document d'homologation MirAI (DAT, AIPD) à partir du code |
| `dat-word` | Rendre un document d'homologation au format `.docx` (modèle MirAI) |

## Invariants

- Lecture seule sur le service ; ne jamais inventer ni recopier de valeur réelle.
- Sorties dans `private/`, gitignoré.
