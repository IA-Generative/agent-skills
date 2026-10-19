---
name: bug-investigate
description: Force 2-3 hypothèses de cause + plan B avant tout fix de bug. Utiliser sur tout bug signalé, régression, comportement inattendu, ou avant de toucher au code "pour corriger". Inspiré du guide Karpathy §1.
when_to_use: bug, regression, ne marche pas, ne fonctionne plus, crash, erreur, 500, "ça plante", "ça bloque"
argument-hint: [description du symptôme — optionnel si déjà dans le contexte]
---

# Bug investigate — hypothèses avant fix

Avant d'écrire **une seule ligne de code**, produire :

## 1. Symptôme observé
Une phrase factuelle, sans interprétation. Ce que l'utilisateur a vu / ce que les logs disent.

> Si le symptôme est ambigu ou second-hand, demander un repro avant d'aller plus loin.

## 2. Trois hypothèses de cause racine
Numérotées, classées par probabilité décroissante. Chacune avec :
- **Mécanisme** : pourquoi ça produirait ce symptôme
- **Signal de confirmation** : ce qu'il faudrait observer pour valider (log, query, ligne de code)
- **Probabilité a priori** : élevée / moyenne / faible — et pourquoi

## 3. Hypothèse choisie + justification
Laquelle on instruit en premier et pourquoi (coût d'instruction × probabilité).

## 4. Plan B
Si l'hypothèse #1 est invalidée, quelle est la suivante et comment on bascule sans repartir de zéro.

## 5. Reproduire avant de corriger
Écrire un test qui **échoue** et reproduit le symptôme, le voir échouer, puis corriger jusqu'au
vert. Sans test rouge, on ne sait pas si on a corrigé le bug ou seulement changé le comportement.
Repro impossible en test automatisé → consigner la procédure manuelle et le signal observé.

## 6. Chercher les échecs silencieux voisins
Autour du chemin incriminé : `except`/`catch` vides, erreur convertie en `None`/`[]` sans trace,
valeur par défaut qui masque une panne, trace d'origine perdue au relancement, appel réseau / fichier /
base sans timeout. Les signaler même s'ils ne sont pas la cause : ce sont eux qui ont caché le bug.

## 7. Avant de coder
- Vérifier dans `docs/chantier-resilience-batch-processing.md` (si pipeline mirai) ou équivalent : ce bug appartient-il à une classe déjà cataloguée ?
- Si oui : appliquer le pattern documenté avant d'inventer.

## Anti-patterns à éviter
- Shotgun debugging (tester des fix sans hypothèse)
- Sauter à la solution sans formuler le mécanisme
- Marquer le job `failed` agressivement (cf. mémoire pipeline antipatterns)
- Ack RabbitMQ avant la fin du traitement long

---

**Symptôme à investiguer** : $ARGUMENTS

> Si la ligne ci-dessus montre encore un nom de variable, ton agent ne substitue pas les
> arguments : prends-les dans la demande de l'utilisateur.
