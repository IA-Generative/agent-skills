---
description: Pré-remplit un document d'homologation MirAI (DAT, et à terme AIPD/dossier d'homologation) à partir du code et des manifestes du repo courant. Le modèle et le prompt de référence versionnés sont embarqués dans cette skill. Lecture seule sur le service, ne jamais inventer ni recopier de valeur réelle.
when_to_use: DAT, dossier d'architecture technique, homologation, AIPD, document d'homologation, MirAI, DTNUM, "remplir le DAT", "générer le DAT", analyse de risques homologation
argument-hint: [type de doc + nom du service — ex. "DAT mesreunions" — défaut DAT]
---

# Gen-doc homologation MirAI

Cette skill **embarque** le modèle et le prompt de référence (anciennement le dépôt
`IA-Generative/gen-document-homologation`, fusionné ici en 2026-06 pour n'avoir qu'un seul dépôt à
maintenir). Les artefacts vivent à côté de ce fichier :

```
skills/gen-doc-homologation/
├── SKILL.md          # ce fichier (loader)
├── CHANGELOG.md      # versions des modèles/prompts (tags vX.Y du contenu)
└── dat/
    ├── PROMPT_coding_assistant_DAT.md   # prompt de référence — fait foi
    └── MODELE_DAT_MirAI.docx            # modèle Word
```

D'autres types de documents s'ajouteront sous leurs propres répertoires (`aipd/`, `homologation/`…),
même convention.

## Étapes

1. **Identifier le type de document** depuis `$ARGUMENTS` (défaut : **DAT**).
   - DAT → prompt `dat/PROMPT_coding_assistant_DAT.md` + modèle `dat/MODELE_DAT_MirAI.docx`.
   - Si le type demandé n'a pas encore de répertoire dans la skill, le signaler et s'arrêter.
2. **Lire `CHANGELOG.md`** (racine de la skill) pour connaître la version courante du modèle/prompt
   et la mentionner dans le document produit.
3. **Lire le prompt embarqué et le suivre intégralement.** Il fait foi : rôle, règles impératives,
   méthode de découverte, format de sortie. Ne pas le paraphraser ni l'abréger — l'appliquer.
4. **Cible = repo courant** (le service à homologuer). Détecte le nom du service ; sortie `.docx`
   construite SUR le modèle, sinon Markdown fidèle à la structure du modèle.

## Garde-fous (rappel — le prompt source les détaille)
- **Lecture seule sur le service** : aucune branche, aucun push, aucune modif de fichier source.
- **Ne jamais inventer** : donnée manquante → `[À CONFIRMER]` ; choix de conception ou responsabilité
  socle/plateforme → `N/A — …` (pas `[À CONFIRMER]`).
- **Aucune valeur réelle** dans le document : pas d'IP/port d'écoute réel/hôte/clé/token/bucket ;
  désigner par nom de composant ; matrice des flux = **port standard** du protocole (443/5432/4318…).
- **LLM01 (injection de prompt) APPLICABLE** dès que le service transmet du contenu non maîtrisé à un
  LLM, même s'il n'héberge aucun modèle. (cf. skill `/security-pentest-prep` pour l'audit technique.)
- **Tracer les sources** (`# source: helm/values.yaml`) en annexe « Provenance » supprimable.

## Maintenance du contenu de référence
Le modèle/prompt évoluent **ici** désormais. À chaque changement : éditer `dat/…`, ajouter une entrée
dans `CHANGELOG.md` (format `vMAJEUR.MINEUR`), committer. Plus de synchro avec un dépôt externe.

---

**Type de doc + service demandés** : $ARGUMENTS
