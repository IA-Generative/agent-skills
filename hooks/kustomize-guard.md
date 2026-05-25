# Hook : kustomize-guard

**Type** : `PreToolUse` sur `Bash`
**But** : refuser tout `kubectl apply -f` qui pointe vers un manifest `base/` du repo mirai-mesreunions, et forcer le passage par overlay kustomize.

## Pourquoi
Cf. `feedback_manifest_prod_divergence` : un `kubectl apply -f` direct sur les
manifests de base **écrase ~15 env vars critiques** (`TRANSCRIPTION_BACKEND`,
`KEVENT_*_ENABLED`, `LITELLM_BASE_URL`, …) qui ne sont définies que dans
l'overlay. Résultat : pipeline transcription cassé silencieusement.

La règle est : **toujours** passer par
```bash
kustomize build --load-restrictor=LoadRestrictionsNone \
  deploy/kubernetes/environments/<env>/<scope>/ | kubectl apply -f -
```

## Installation
Coller ce bloc dans `~/.claude/settings.json` (ou `.claude/settings.json` du
projet) :

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command // \"\"' | grep -qE 'kubectl[[:space:]]+apply[[:space:]]+-f[[:space:]]+[^|]*deploy/kubernetes/(base|environments/[^/]+/base)' && { echo 'BLOCKED: kubectl apply -f sur un manifest base/ → écrase les env vars overlay. Utiliser: kustomize build --load-restrictor=LoadRestrictionsNone deploy/kubernetes/environments/<env>/<scope>/ | kubectl apply -f -' >&2; exit 2; } || exit 0"
          }
        ]
      }
    ]
  }
}
```

## Test
Après installation, demander à Claude `kubectl apply -f deploy/kubernetes/base/transcription-relay.yaml` :
le hook doit renvoyer le message d'erreur et Claude doit re-proposer la
variante kustomize.

## Notes
- Le hook **ne** bloque **pas** `kubectl apply -k` ni les pipes (`kustomize build … | kubectl apply -f -`) — qui sont les chemins autorisés.
- Ne bloque pas non plus les manifests **hors** `base/` (overlays, CRDs ad hoc).
- Si tu utilises un autre layout, adapter la regex (`deploy/kubernetes/base|environments/[^/]+/base`).
