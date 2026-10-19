# Frontière d'action d'un tool — contrôles détaillés (section 7)

Un tool derrière OpenWebUI / MCP transforme une sortie de modèle en **effet de bord**
(écriture, appel d'API, envoi, suppression). La garde ne vaut que si elle est **dans le code,
juste avant l'effet** : une consigne dans le prompt système est indicative, pas une garde.

## 1. Cartographier les frontières

Pour chaque effet de bord, une ligne `source → parseur → validateur → effet`, avec :
l'identité (`sub`) et la portée qui l'autorisent, le validateur exécuté **immédiatement**
avant, la taille max d'entrée/sortie, la trace d'audit produite, le chemin de reprise si
l'opération est interrompue. Sources à couvrir : saisie utilisateur, **argument fourni par le
LLM**, document récupéré (RAG), mémoire, résultat d'un autre tool, message d'un autre agent.

Critère d'arrêt : chaque écriture, commande, mutation réseau et usage de credential a **une**
frontière d'autorisation nommée.

## 2. Actions irréversibles

Supprimer, publier, envoyer un message, faire tourner un secret : le point d'entrée réel du
tool vérifie que le `sub` authentifié est autorisé pour **cette opération sur cette
ressource**, puis exige une confirmation explicite ou une pré-approbation bornée. Preuve
manquante ou invalide → **aucun effet** (fail closed).

## 3. URL et redirections (tool qui appelle un service tiers)

- schémas autorisés en liste blanche, hôte obligatoire, pas d'identifiants dans l'URL ;
- destinations privées bloquées si l'URL vient de l'utilisateur ou du modèle (SSRF) ;
- validation **à chaque saut de redirection** et contre l'adresse effectivement connectée
  (DNS rebinding) ;
- requête porteuse de credential : HTTPS avec vérification du certificat ; si l'origine change
  pendant une redirection, **retirer le credential** ou refuser.

## 4. Sortie du tool bornée et typée

- lire la sortie avec une limite d'octets, ajouter un marqueur explicite de troncature ;
- retirer les caractères de contrôle (séquences terminal) ;
- une sortie mal formée renvoie une **erreur typée** (tool, frontière, raison), jamais un succès
  vide : un `[]` silencieux fait halluciner le modèle en aval ;
- ne jamais renvoyer au modèle un secret, un en-tête d'autorisation ou une trace d'exception brute.

## 5. Fichiers temporaires et credentials

Fichiers sensibles en `0600`, dossiers en `0700`, noms imprévisibles créés atomiquement,
nettoyage en `finally` ; secret jamais dans les arguments de commande, les logs, les traces, le
contexte du modèle. **Test sentinelle** : injecter un faux secret repérable et vérifier qu'il
n'apparaît dans aucun canal émis (logs, traces, réponse du tool).

## 6. Barrière de vérification

Avant de déclarer le tool durci, prouver par son point d'entrée réel que :
1. une consigne injectée dans un document ou un argument reste une donnée et ne déclenche ni tool ni écriture ;
2. une action irréversible sans autorisation + confirmation ne laisse aucun effet ;
3. un identifiant d'un autre utilisateur / espace est refusé à la frontière ;
4. une sortie trop grosse ou mal formée produit une erreur bornée et explicite.

Consigner la commande, le code de sortie, l'entrée refusée et l'absence constatée d'effet.
Des tests uniquement sur mocks ne prouvent ni les permissions système, ni l'isolation réseau.

---
Adapté de la skill `agent-security-hardening` d'ECC (licence MIT,
https://github.com/affaan-m/ECC, commit 76aaa77).
