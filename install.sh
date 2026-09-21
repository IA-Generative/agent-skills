#!/usr/bin/env bash
# Installe les skills de ce repo via symlinks, pour Claude Code et les autres agents.
# Idempotent : ré-exécutable, ne casse pas les liens existants.
#
# Usage:
#   ./install.sh                  # Claude Code : ~/.claude/skills
#   ./install.sh --agents         # + ~/.agents/skills (Codex, Gemini CLI, Copilot CLI, Vibe, Roo…)
#   ./install.sh --target <dir>   # + un répertoire de skills de plus (ex. ~/.cline/skills) ; répétable
#   ./install.sh --dry-run        # liste ce qui serait fait (se combine avec --agents / --target)
#   ./install.sh --remove         # désinstalle nos symlinks de ~/.claude/skills et ~/.agents/skills
#                                 # (répéter --target <dir> pour nettoyer un autre répertoire)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${HOME}/.claude/skills"
AGENTS_DIR="${HOME}/.agents/skills"
TARGETS=("$CLAUDE_DIR")
DRY_RUN=0
REMOVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --remove)  REMOVE=1 ;;
    --agents)  TARGETS+=("$AGENTS_DIR") ;;
    --target)
      [[ $# -ge 2 ]] || { echo "--target attend un répertoire" >&2; exit 1; }
      TARGETS+=("${2/#\~/$HOME}")
      shift
      ;;
    -h|--help)
      sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Option inconnue: $1" >&2; exit 1 ;;
  esac
  shift
done

# --remove nettoie aussi ~/.agents/skills même sans --agents : un lien oublié là-bas
# resterait actif pour les autres agents.
if [[ $REMOVE -eq 1 && -d "$AGENTS_DIR" && " ${TARGETS[*]} " != *" $AGENTS_DIR "* ]]; then
  TARGETS+=("$AGENTS_DIR")
fi

for target_dir in "${TARGETS[@]}"; do
  echo "== $target_dir"
  [[ $DRY_RUN -eq 1 || $REMOVE -eq 1 ]] || mkdir -p "$target_dir"

  for skill_dir in "$REPO_DIR"/skills/*/; do
    name="$(basename "$skill_dir")"
    link="$target_dir/$name"

    if [[ $REMOVE -eq 1 ]]; then
      if [[ -L "$link" ]] && [[ "$(readlink "$link")" == "${skill_dir%/}" ]]; then
        [[ $DRY_RUN -eq 1 ]] && echo "would remove: $link" || { rm "$link"; echo "removed: $link"; }
      fi
      continue
    fi

    if [[ -L "$link" ]]; then
      current="$(readlink "$link")"
      if [[ "$current" == "${skill_dir%/}" ]]; then
        echo "ok (already linked): $name"
        continue
      fi
      echo "WARN: $link points elsewhere ($current) — skipped" >&2
      continue
    fi

    if [[ -e "$link" ]]; then
      echo "WARN: $link exists and is not a symlink — skipped" >&2
      continue
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
      echo "would link: $link -> ${skill_dir%/}"
    else
      ln -s "${skill_dir%/}" "$link"
      echo "linked: $name"
    fi
  done
done

echo
echo "Fait. Dans Claude Code : /<nom>. Autres agents : voir « Autres agents » dans le README."
