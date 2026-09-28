# La route `GET /__version__` — par langage et par serveur

## Le contrat, commun à tous

| | |
|---|---|
| Méthode et chemin | `GET /__version__` (deux tirets bas de chaque côté, singulier) |
| Réponse | `200`, `Content-Type: application/json`, le contenu de `/app/version.json` tel quel |
| Hors image (tests, poste) | le fichier manque → `{"source":"","version":"dev","commit":"","build":"","code_date":"","changes":[],"history":[]}` — **jamais** une erreur |
| Authentification | aucune : le noteur l'appelle par le Service interne, sans session |
| Schéma OpenAPI | exclue (`include_in_schema=False` ou équivalent) |
| Logs d'accès | exclue, comme les sondes de santé : elle est appelée toutes les 10 minutes |
| Listes de chemins | ajoutée à **chaque** allowlist, exemption de gate, matcher d'auth, filtre de mode que le projet possède |
| Préfixe d'URL | si l'application sert sous un préfixe (`/mon-app/…`), servir la route **aussi** sous le préfixe |

Le chemin du fichier est constant : `/app/version.json`. Une constante de module (surchargeable
en test par monkeypatch ou variable d'environnement) suffit.

## Où brancher, quoi écrire, quoi tester

### Python — FastAPI

Module dédié `app/version.py` (dès que le fichier d'entrée dépasse quelques centaines de lignes ;
sinon inline à côté des sondes) :

```python
"""Convention ADR-0004 MirAI next, format Dockerflow : /app/version.json servi sur /__version__."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

VERSION_JSON = Path("/app/version.json")
DEV = {"source": "", "version": "dev", "commit": "", "build": "", "code_date": "", "changes": [], "history": []}

router = APIRouter()


@router.get("/__version__", include_in_schema=False)
def version_json() -> dict:
    """Le journal que l'image porte. Hors image le fichier manque : « dev », jamais une erreur."""
    try:
        return json.loads(VERSION_JSON.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return dict(DEV)
```

Dans le fichier d'entrée : `app.include_router(version_router)` **hors** de tout bloc conditionnel
de mode (chaque pod, quel que soit son rôle, répond). Exclusions à compléter : filtre du logger
`uvicorn.access`, allowlists de mode, exemptions de readiness gate, `dependencies=` d'auth globale.

Test (`pytest`, `TestClient`) : (1) hors image → sept clés et `version == "dev"` ; (2) fichier
temporaire + `monkeypatch.setattr(version, "VERSION_JSON", tmp)` → contenu rendu tel quel ;
(3) gate ou mode restrictif actif → toujours `200` ; (4) `"/__version__"` présent dans chaque
tuple d'exclusion du projet ; (5) le script : `changes` = section de cette version seule,
`history` = toutes les sections dans l'ordre du fichier, `[]` pour les deux sans CHANGELOG.

### Python — Flask

```python
@app.get("/__version__")
def version_json():
    try:
        return app.response_class(VERSION_JSON.read_text(encoding="utf-8"), mimetype="application/json")
    except OSError:
        return jsonify(DEV)
```

Exclusions : `before_request` d'auth, filtre sur le logger `werkzeug`. Test : `app.test_client()`.

### Python — Django

`urls.py` racine : `path("__version__", version_json)` ; vue `@require_GET` qui rend
`JsonResponse(json.loads(...))` ou `JsonResponse(DEV)`. Exclusions : middleware de connexion
obligatoire (liste d'URL exemptées). Test : `Client().get("/__version__")`.

### Node — Express

Avant les routers protégés et l'auth globale :

```js
const fs = require('fs');
const DEV = { source: '', version: 'dev', commit: '', build: '', code_date: '', changes: [], history: [] };
app.get('/__version__', (_req, res) => {
  try { res.type('application/json').send(fs.readFileSync('/app/version.json', 'utf8')); }
  catch { res.json(DEV); }
});
```

Exclusions : `morgan(format, { skip: req => req.path === '/__version__' })`, limiteurs de débit.
Test : supertest.

### Node — NestJS

Contrôleur `VersionController`, `@Get('__version__')`, marqué public si un guard global existe
(`@SetMetadata('isPublic', true)` ou le décorateur du projet). Test : `@nestjs/testing` + supertest.

### Next.js (App Router)

`app/__version__/route.ts` :

```ts
import { readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const DEV = { source: '', version: 'dev', commit: '', build: '', code_date: '', changes: [], history: [] };
export async function GET() {
  try { return new NextResponse(readFileSync('/app/version.json', 'utf8'), { headers: { 'content-type': 'application/json' } }); }
  catch { return NextResponse.json(DEV); }
}
```

Exclusions : `middleware.ts` → `matcher` qui exclut `__version__`. L'image `standalone` tourne en
`/app` : le fichier y est. Test : appeler `GET()` directement.

### Nuxt

`server/routes/__version__.get.ts` avec `defineEventHandler` : lecture `fs`, repli `DEV`,
`setHeader(event, 'content-type', 'application/json')`. Exclusions : `server/middleware` d'auth.
Un site **généré** (`nuxt generate`) n'a pas de serveur : c'est le bloc nginx qui sert la route.

### Go — net/http, Gin, Echo

```go
const versionJSON = "/app/version.json"
var dev = []byte(`{"source":"","version":"dev","commit":"","build":"","code_date":"","changes":[],"history":[]}`)

mux.HandleFunc("GET /__version__", func(w http.ResponseWriter, _ *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    if b, err := os.ReadFile(versionJSON); err == nil { w.Write(b); return }
    w.Write(dev)
})
```

Exclusions : middlewares d'auth et de log. Image distroless : pas de `cat` → `verif-version.sh`
extrait le fichier par `docker cp`. Test : `httptest`.

### Java — Spring Boot

`@RestController`, `@GetMapping(value = "/__version__", produces = MediaType.APPLICATION_JSON_VALUE)` ;
`Files.readString(Path.of("/app/version.json"))`, `catch (IOException)` → JSON `dev`. Sécurité :
`requestMatchers("/__version__").permitAll()`. `/actuator/info` reste distinct (écarté par l'ADR :
propre à Java). Test : `MockMvc`.

### nginx (application web statique, SPA)

Pas de code : le bloc `location = /__version__ { alias /app/version.json; … }` de
[`dockerfile.md`](dockerfile.md). Pas de test unitaire : `verif-version.sh --url` après `docker run`.

### Reverse-proxy ou sidecar devant l'application

Si le Service interne pointe le proxy et non l'application, le proxy doit relayer la route :
`location = /__version__ { proxy_pass http://<application>; }`. Vérifier avec `--url` sur le port
du proxy, pas sur celui de l'application.

### Autre langage, serveur inconnu

Servir le fichier statique par le serveur déjà présent (la plupart savent servir un fichier avec un
type MIME). Si rien ne le permet, la route est **« non faite »** dans le rapport — jamais bricolée
par un service supplémentaire.
