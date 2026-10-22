---
name: ci-cd
description: Use when a developer sets up or reviews the basic CI of a Fabrique Numérique project (lint, tests, build) or needs the CI/CD principles — for a CI/CD built on the fabnum-cicd reusable workflows use cicd-cpin (repo group), for deployment (Helm, infra repo, Cloud Pi Native) use the dso group
allowed-tools: Bash Read Write
---

# CoFabNum CI/CD : ce que le développeur doit savoir

Principes et gabarit de base. Cette skill s'arrête à **l'image construite et scannée** : elle ne couvre ni le
chart Helm, ni le dépôt d'infra, ni le déploiement.

## Principes

CI/CD automatise les étapes de développement pour augmenter la fréquence de livraison.

- **Pipeline runner** : GitHub Actions
- [SonarQube](https://www.sonarsource.com/products/sonarqube/) — qualité du code ; [Trivy](https://trivy.dev/) — CVE des dépendances et images
- **CI** (à chaque pull request) : Lint → Tests (unitaires/intégration) → Build → Tests (E2E) → Qualité de code
- **CD** (à chaque release) : Scan CVE → Release (avec changelog) → Image versionnée
- La CI exécute les **mêmes commandes** que le poste (`pnpm lint`, `pnpm test`, `pnpm build`) : un job rouge se reproduit en local.
- Un seul check de synthèse est **requis** sur la branche protégée : il liste tous les jobs, un job oublié laisse la barrière verte.
- Aucun secret en clair dans un workflow : `secrets.*` et `vars.*` uniquement ; l'humain les crée.
- Les conventions de branches et de commits (voir `conventions-cofabnum`) alimentent le lint des commits et le changelog.

## Checklist

Progress:
- [ ] Lint (ESLint/Ruff)
- [ ] Tests unitaires (Vitest/pytest)
- [ ] Build
- [ ] Tests E2E (Playwright)
- [ ] Scan SonarQube
- [ ] Build + push Docker
- [ ] Scan Trivy

## Gabarit CI minimal (pnpm)

```yaml
name: CI
on:
  pull_request:
    branches: ["**"]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with: { node-version: "24", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with: { node-version: "24", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with: { node-version: "24", cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

## Aller plus loin

La Fabrique Numérique maintient [`dnum-mi/fabnum-cicd`](https://github.com/dnum-mi/fabnum-cicd) : privilégier ses workflows réutilisables plutôt qu'un pipeline sur mesure (cohérence, scans de sécurité).

| Besoin | Où |
|--------|----|
| Brancher un projet existant sur fabnum-cicd (PR, release, scans, release-please, Renovate) | skill `cicd-cpin` du groupe `repo` |
| Gabarits `ci.yml`/`cd.yml`, dépôt d'infra séparé, bump et publication du chart Helm, déploiement sur Cloud Pi Native | groupe `dso` (`cicd-fabnum`, `helm-chart-cpin`, `deploiement-cpin`) |
| Dockerfile de production, durcissement du conteneur | skill `deploiement` |

## Pièges

- **`--frozen-lockfile` en CI** — évite les changements de dépendances inattendus
- **Cache du store pnpm** — accélère les runs
- **Version de Node** — `24` (LTS) sur tous les jobs
- **Versions d'actions** — épingler par SHA avec la version en commentaire (les `@v6` du gabarit sont à remplacer), jamais `@latest`, `@main` ni `@master`
- **Trivy scanne l'image APRÈS le build** — elle doit exister
