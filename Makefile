# Prérequis du poste (doctor, install-debug), index des skills, tests des plugins OpenCode et Claude Code.

.PHONY: help doctor install-debug skills-index skills-index-check test-cpin-rules test-plugin claude-plugin test-claude check

help: ## Liste les commandes
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-18s %s\n", $$1, $$2}'

doctor: ## Vérifie les prérequis du poste : obligatoires (code 1) et optionnels (mode dégradé)
	@bash scripts/doctor.sh

install-debug: ## Installe Playwright et Firefox (~100 Mo) pour le debug automatisé CPiN
	npm install --prefix scripts/cpin-debug
	npx --prefix scripts/cpin-debug playwright install firefox

skills-index: ## Régénère le index.json de chaque groupe de skills
	node scripts/skills-index.mjs

skills-index-check: ## Vérifie que les index.json sont à jour (code 1 sinon)
	node scripts/skills-index.mjs --check

test-cpin-rules: ## Teste check-cpin-rules.py (skill helm-chart-cpin) sur les frictions réelles
	uv run --with pyyaml --with pytest pytest -q tests/check-cpin-rules

test-plugin: ## Vérifie que le plugin OpenCode installe chaque groupe, et rien des autres
	tests/plugin/check-config.sh

claude-plugin: ## Régénère la version Claude Code des agents et commandes (claude/)
	node scripts/claude-plugin.mjs

test-claude: ## Vérifie la version Claude Code : à jour, hook des permissions, marketplace valide
	node scripts/claude-plugin.mjs --check
	node --test tests/claude/*.test.mjs
	claude plugin validate .

check: ## Vérifie ce qui ne demande ni OpenCode ni Claude Code
	./install.sh --check
	node scripts/skills-index.mjs --check
	node scripts/claude-plugin.mjs --check
	node --test tests/claude/*.test.mjs
