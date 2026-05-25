#!/usr/bin/env bash
# Installe les skills de ce repo dans ~/.claude/skills/ via symlinks.
# Idempotent : ré-exécutable, ne casse pas les liens existants.
#
# Usage:
#   ./install.sh            # installe toutes les skills
#   ./install.sh --dry-run  # liste ce qui serait fait
#   ./install.sh --remove   # désinstalle (supprime les symlinks créés par nous)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.claude/skills"
DRY_RUN=0
REMOVE=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --remove)  REMOVE=1 ;;
    -h|--help)
      sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Option inconnue: $arg" >&2; exit 1 ;;
  esac
done

mkdir -p "$TARGET_DIR"

for skill_dir in "$REPO_DIR"/skills/*/; do
  name="$(basename "$skill_dir")"
  link="$TARGET_DIR/$name"

  if [[ $REMOVE -eq 1 ]]; then
    if [[ -L "$link" ]] && [[ "$(readlink "$link")" == "$skill_dir"* ]]; then
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

echo
echo "Fait. Les skills sont disponibles via /<nom> dans Claude Code."
echo "Liste : $(ls "$TARGET_DIR" 2>/dev/null | tr '\n' ' ')"
