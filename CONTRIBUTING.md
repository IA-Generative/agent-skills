# Contribuer

Ces skills ont été écrites et éprouvées **surtout avec Claude Code**. Le format est le
standard ouvert [Agent Skills](https://agentskills.io) et l'installeur les expose à
Codex, OpenCode, Gemini CLI, Cursor et Copilot — mais leur comportement réel sur ces
agents reste à vérifier. **C'est là que votre aide compte le plus.**

Toute contribution est attendue, de tout utilisateur, quel que soit son agent :

| Vous avez… | Faites |
|---|---|
| essayé une skill avec un autre agent que Claude Code | ouvrez une issue **« Retour de test »** (modèle fourni) : agent, version, skill, ce qui a marché ou non. Un « ça marche » est aussi utile qu'un « ça casse » : il fait avancer le tableau de compatibilité du README. |
| trouvé un bug, une consigne ambiguë, un déclenchement raté | une issue, avec la demande exacte que vous avez tapée |
| un correctif ou une nouvelle skill | une PR (voir ci-dessous) |

## Proposer une PR

1. Branche dédiée, jamais de commit sur `main`.
2. Respecter les invariants de [`AGENTS.md`](AGENTS.md) — notamment `name` identique au
   dossier, et une `description` qui suffit seule à déclencher la skill.
3. `./install.sh --check` doit passer (la CI le rejoue).
4. Dans la description de la PR, dire **avec quel(s) agent(s)** la skill a été testée.
5. Ne pas modifier `skills/dev/controle-qualite-code/` ici : contribuer
   [en amont](https://github.com/etiquet/controle-qualite-code).

## Renommer une skill

Les skills sont rangées dans un groupe (`skills/<groupe>/<skill>/`). Pour renommer :

- renommez le dossier **et** le `name:` ;
- régénérez le catalogue du groupe : `node scripts/skills-index.mjs` ;
- mettez à jour le README et les éventuelles références croisées (`/ancien-nom`) ;
- mentionnez l'ancien nom dans la PR : `./install.sh` retire de lui-même les liens
  orphelins sur chaque machine.

Un renommage ne doit jamais sortir de son groupe : c'est le préfixe qui protège contre
les collisions entre groupes (voir `AGENTS.md`).
