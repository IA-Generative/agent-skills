# Écrire le CHANGELOG pour ceux qui ne sont pas dans le projet

Le `CHANGELOG.md` n'est pas un journal de bord d'équipe : il est **servi tel quel** sur
`/__version__` (`changes` et `history`), sans authentification, et il alimente la note que lisent les
testeurs. Deux conséquences qui font règle :

1. **Rien de sensible, jamais.** Une ligne de CHANGELOG est publique dès que l'image tourne.
2. **Lisible par quelqu'un qui n'est ni technicien ni membre du projet.** Il dit ce qui change
   pour la personne qui utilise le service, pas comment le code a été modifié.

## Ce qui ne doit jamais y figurer (→ le contrôle **échoue**)

| Interdit | Exemples |
|---|---|
| adresses et hôtes d'infrastructure | IP, `*.svc.cluster.local`, noms de cluster ou de namespace, registres d'images, URL internes |
| identifiants et secrets | jetons, clés, mots de passe, même « d'exemple » ; noms de comptes de service |
| données personnelles | adresses de courriel, noms de personnes, identifiants d'utilisateurs |
| chemins de postes | `/Users/…`, `/home/…`, `C:\…` |
| noms d'environnements et de clients internes | plateformes, marchés, projets voisins, noms de code |
| détail d'une faille | ce qui était exploitable et comment ; dire seulement « un contrôle d'accès a été renforcé » |

## Ce qu'on évite (→ le contrôle **avertit**)

Le détail technique précis : noms de fichiers, de fonctions, de colonnes, de variables
d'environnement, codes de lint (`B406`, `UP037`), codes HTTP, noms de bibliothèques, jargon
(`refactor`, `fixture`, `pool de connexions`, `FK`). Ce détail a sa place dans le **corps** du
commit, la PR ou la documentation développeur, pas dans la ligne du CHANGELOG.

## Comment écrire une ligne

- **Le sujet, c'est l'utilisateur ou l'exploitant**, pas le code : « Les administrateurs voient
  combien de versions circulent sur le parc » plutôt que « dashboard : requête sur config_pod_state ».
- **Un effet visible, en une phrase**, au présent. Si rien n'est visible, le dire simplement :
  « Fiabilisation interne, sans changement visible ».
- **Regrouper** le bruit d'équipe (lint, tests, dépendances, CI) en une ligne par version :
  « Qualité du code : corrections de lint et tests supplémentaires ». Jamais une ligne par correctif.
- **Expliquer les mots** qu'un lecteur externe ne connaît pas, ou les éviter : « campagne de mise à
  jour (le déploiement progressif d'une version aux postes) ».

| Avant (sujet de commit) | Après (ligne de CHANGELOG) |
|---|---|
| `fix(catalog): échapper les attributs de update.xml sans xml.sax (Bandit B406)` | Le flux de mise à jour LibreOffice est produit de façon plus sûre. |
| `feat(admin): version du DM sur le tableau de bord (+ alerte versions mixtes)` | Le tableau de bord affiche la version du service et alerte quand plusieurs versions tournent en même temps. |
| `fix(deploy): mapper RELAY_KEYCLOAK_UPSTREAM sur le pod API (relais token répondait 503)` | La connexion des extensions par le relais fonctionne de nouveau après un déploiement. |
| `refactor(versions): un seul parseur de version, dans app/services/versions` | Fiabilisation interne, sans changement visible. |

## Où ça s'applique dans le flux

- **Avec release-please**, la ligne du CHANGELOG **est le sujet du commit** conventionnel. La règle
  vaut donc pour les sujets de commit et les titres de PR (le *squash* prend le titre) : une phrase
  pour l'utilisateur ; le détail technique dans le corps. Le point de relecture est la **PR de
  release** : son diff de `CHANGELOG.md` s'édite avant fusion.
- **Sans release-please**, le fichier se tient à la main avec la même consigne.
- **CHANGELOG reconstitué depuis git** : les sujets bruts sont un brouillon, jamais le résultat.
  Reformuler chaque section, puis relecture humaine.

## Le contrôle

`python3 scripts/verif-changelog.py CHANGELOG.md` : **échec** sur tout motif sensible (IP, hôte
interne, courriel, secret, chemin de poste), **avertissement** sur le détail technique (identifiants
de code, chemins de fichiers, variables d'environnement, codes de lint, jargon), et sur la
structure (titre sans version ou sans date, section vide, ligne trop longue). `--strict` transforme
les avertissements en échec. Le brancher dans le pipeline de pull request : un CHANGELOG qui
fuite ne doit pas atteindre une image.

Le contrôle est lexical : il ne remplace pas la relecture. Il attrape ce qui se voit, pas ce qui
se comprend.
