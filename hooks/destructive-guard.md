# Hook : destructive-guard

**Type** : `PreToolUse` sur `Bash`
**But** : refuser à l'agent les commandes destructrices ou difficilement réversibles ; l'humain
les lance lui-même s'il le décide.

## Pourquoi
Un agent en mode autonome peut enchaîner un `git reset --hard`, un `git push --force` ou un
`kubectl delete namespace` « pour débloquer » une situation. Ces commandes détruisent du travail
ou un environnement partagé et ne se rattrapent pas. Le hook ne cherche pas à tout prévoir : il
arrête les cas les plus coûteux et oblige à repasser par une décision humaine.

## Ce qui est bloqué
| Motif | Risque |
|---|---|
| `rm -rf` visant `/`, `~`, `$HOME`, `.` ou `*` | effacement massif |
| `git push --force` / `-f` (mais **pas** `--force-with-lease`) | écrase l'historique distant |
| `git reset --hard`, `git clean -fd…`, `git checkout -- .`, `git restore .` | perte du travail local non commité |
| `--no-verify` | contourne les hooks anti-fuite (gitleaks, pre-commit) |
| `DROP TABLE`, `DROP DATABASE`, `TRUNCATE` | perte de données |
| `kubectl delete namespace/ns`, `kubectl delete … --all`, `helm uninstall` | suppression d'un environnement |
| `docker system prune`, `docker volume prune` | perte de volumes |

## Installation
Coller ce bloc dans `~/.claude/settings.json` (ou `.claude/settings.json` du projet) :

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // \"\"' | grep -qiE '(rm[[:space:]]+-[a-z]*r[a-z]*f[a-z]*[[:space:]]+(/|~|\\$HOME|\\.|\\*)([[:space:]]|$))|(git[[:space:]]+push([[:space:]].*)?[[:space:]](--force|-f)([[:space:]]|$))|(git[[:space:]]+reset[[:space:]]+--hard)|(git[[:space:]]+clean[[:space:]]+-[a-z]*f)|(git[[:space:]]+(checkout[[:space:]]+--|restore)[[:space:]]+\\.)|(--no-verify)|(drop[[:space:]]+(table|database))|(truncate[[:space:]]+table)|(kubectl[[:space:]]+delete[[:space:]]+(namespace|ns)[[:space:]])|(kubectl[[:space:]]+delete[[:space:]].*--all)|(helm[[:space:]]+uninstall)|(docker[[:space:]]+(system|volume)[[:space:]]+prune)' && { echo 'BLOCKED (destructive-guard) : commande destructrice ou irréversible. Expliquer à l utilisateur ce que fait la commande, proposer une alternative sûre (git stash, --force-with-lease, sauvegarde, dry-run) et le laisser la lancer lui-même s il le décide.' >&2; exit 2; } || exit 0"
          }
        ]
      }
    ]
  }
}
```

## Test
Demander à l'agent `git reset --hard HEAD~1` : le hook renvoie le message et l'agent doit proposer
une alternative (`git stash`, branche de sauvegarde). Vérifier aussi que `git push --force-with-lease`,
`rm -rf build/` et `kubectl delete pod x` passent.

## Notes
- Hook propre à Claude Code. Les autres agents n'ont pas d'équivalent standard : rappeler ces
  interdits dans `AGENTS.md` du projet.
- Contournable (commande encodée, script intermédiaire) : c'est un garde-fou contre l'erreur, pas
  une frontière de sécurité. L'isolation reste le rôle des droits (pas d'accès `cluster-admin` pour
  l'agent, branche `main` protégée).
- Adapter la liste au projet : ajouter par exemple `terraform destroy`, `aws s3 rm --recursive`.

---
Inspiré de la skill `safety-guard` d'ECC (licence MIT, https://github.com/affaan-m/ECC, commit 76aaa77).
