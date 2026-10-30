#!/usr/bin/env bash
# agent-skills — installe OU met à jour les skills de ce dépôt pour tous les agents de code.
# Idempotent : relancer ne change rien si tout est déjà en place.
#
# Usage :
#   ./install.sh                  # met à jour le clone (git pull --ff-only) puis synchronise les liens
#   ./install.sh --offline        # synchronise sans toucher au réseau
#   ./install.sh --dry-run        # affiche ce qui serait fait, ne change rien
#   ./install.sh --target NOM     # cible(s) explicite(s), répétable ; remplace la détection automatique
#   ./install.sh --force          # remplace aussi un lien qui pointe vers une autre copie de la skill
#   ./install.sh --check          # valide les SKILL.md (frontmatter, nom) et sort — utilisé par la CI
#   ./install.sh --uninstall      # retire les liens créés par ce script, dans toutes les cibles
#
# Cibles (--target) : agents  ~/.agents/skills          Codex, Gemini CLI, Cursor, Copilot, OpenCode
#                     claude  ~/.claude/skills          Claude Code (ne lit pas ~/.agents/skills)
#                     opencode ~/.config/opencode/skills, gemini ~/.gemini/skills,
#                     cursor ~/.cursor/skills, copilot ~/.copilot/skills, kimi ~/.kimi/skills,
#                     deepcode ~/.deepcode/skills — pour les versions d'agent qui ne lisent pas
#                     encore ~/.agents/skills ; ou un chemin absolu.
# Défaut : agents, plus claude si Claude Code est détecté.
#
# Hors d'un clone (ex. `gh api …/contents/install.sh -H "Accept: application/vnd.github.raw" | bash`), il clone dans
# $AGENT_SKILLS_HOME (défaut ~/.local/share/agent-skills) puis s'y relance.

set -euo pipefail

REPO_URL="${AGENT_SKILLS_REPO:-https://github.com/IA-Generative/agent-skills.git}"
# Noms (ancien et actuel) du dépôt : un lien MORT vers un clone de ce nom est un reliquat à nettoyer.
LEGACY_REPO_NAMES="skills-claude agent-skills"

ORIG_ARGS=("$@")   # la boucle ci-dessous consomme "$@" ; l'amorçage doit relancer avec les mêmes options
DRY_RUN=0 OFFLINE=0 FORCE=0 CHECK=0 UNINSTALL=0 TARGETS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)   DRY_RUN=1 ;;
    --offline)   OFFLINE=1 ;;
    --force)     FORCE=1 ;;
    --check)     CHECK=1 ;;
    --uninstall|--remove) UNINSTALL=1 ;;
    --target)    shift; TARGETS="$TARGETS ${1:?--target attend une valeur}" ;;
    --target=*)  TARGETS="$TARGETS ${1#--target=}" ;;
    -h|--help)   sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Option inconnue : $1 (voir --help)" >&2; exit 2 ;;
  esac
  shift
done

say()  { printf '%s\n' "$*"; }
warn() { printf 'ATTENTION : %s\n' "$*" >&2; }
run()  { if [[ $DRY_RUN -eq 1 ]]; then say "  (simulation) $*"; else "$@"; fi; }

# --- 0. Localiser le clone, ou l'amorcer ---------------------------------------------------
# Si gh est là, git emprunte son jeton : ni « gh auth setup-git » ni trousseau à configurer.
GIT_AUTH=()
command -v gh >/dev/null 2>&1 && GIT_AUTH=(-c credential.helper= -c 'credential.helper=!gh auth git-credential')
# Sur macOS, /usr/bin/git existe toujours : sans les outils Xcode, c'est un leurre qui ouvre
# une fenêtre d'installation au lieu de cloner.
need_git() {
  if ! command -v git >/dev/null 2>&1 \
     || { [[ "$(uname -s)" == Darwin && "$(command -v git)" == /usr/bin/git ]] && ! xcode-select -p >/dev/null 2>&1; }; then
    warn "git est absent."
    [[ "$(uname -s)" == Darwin ]] && say "  macOS : lancez « xcode-select --install », attendez la fin, puis relancez." \
                                  || say "  Installez git avec le gestionnaire de paquets, puis relancez."
    exit 1
  fi
}
access_hint() {
  say "  Le dépôt est interne à l'organisation IA-Generative : il faut en être membre et que git"
  say "  soit authentifié. Vérifiez avec « gh auth status », sinon « gh auth login --web -p https »."
}
REPO_DIR=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
fi
if [[ -z "$REPO_DIR" || ! -d "$REPO_DIR/skills" ]]; then
  HOME_DIR="${AGENT_SKILLS_HOME:-$HOME/.local/share/agent-skills}"
  if [[ ! -d "$HOME_DIR/.git" ]]; then
    say "Clonage de $REPO_URL dans $HOME_DIR"
    [[ $DRY_RUN -eq 1 ]] && { say "  (simulation) git clone"; exit 0; }
    need_git
    mkdir -p "$(dirname "$HOME_DIR")"
    git ${GIT_AUTH[@]+"${GIT_AUTH[@]}"} clone --quiet "$REPO_URL" "$HOME_DIR" || { warn "le clonage a échoué."; access_hint; exit 1; }
  fi
  exec bash "$HOME_DIR/install.sh" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"}
fi
SKILLS_DIR="$REPO_DIR/skills"

# --- 1. Validation des SKILL.md (standard Agent Skills : name + description) --------------
validate() {
  local errors=0 dir name f fname desc_len
  # Structure : skills/<groupe>/<skill>/SKILL.md — le index.json du groupe est ignoré.
  for dir in "$SKILLS_DIR"/*/*/; do
    name="$(basename "$dir")"; f="$dir/SKILL.md"
    if [[ ! -f "$f" ]]; then warn "$name : pas de SKILL.md"; errors=$((errors+1)); continue; fi
    if [[ "$(head -1 "$f")" != "---" ]]; then warn "$name : SKILL.md doit commencer par ---"; errors=$((errors+1)); continue; fi
    if ! [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ && ${#name} -le 64 ]]; then
      warn "$name : nom de dossier invalide (minuscules, chiffres, tirets simples, 64 car. max)"; errors=$((errors+1))
    fi
    fname="$(awk 'NR>1 && /^---$/ {exit} NR>1 && /^name:/ {sub(/^name:[ \t]*/, ""); print}' "$f")"
    if [[ "$fname" != "$name" ]]; then warn "$name : frontmatter name='$fname', attendu '$name'"; errors=$((errors+1)); fi
    # Longueur de la description, scalaire simple ou plié (>-) : lignes jusqu'à la clé suivante.
    desc_len="$(awk 'NR>1 && /^---$/ {exit}
      /^description:/ {on=1; sub(/^description:[ \t]*(>-|>|\|)?[ \t]*/, ""); s=$0; next}
      on && /^[a-z_-]+:/ {on=0}
      on {sub(/^[ \t]+/, ""); s=s " " $0}
      END {gsub(/^ +| +$/, "", s); print length(s)}' "$f")"
    if [[ "$desc_len" -eq 0 ]]; then warn "$name : description absente"; errors=$((errors+1))
    elif [[ "$desc_len" -gt 1024 ]]; then warn "$name : description de $desc_len caractères (> 1024, tronquée ou refusée par certains agents)"; errors=$((errors+1)); fi
  done
  return $errors
}

if [[ $CHECK -eq 1 ]]; then
  if validate; then say "OK : toutes les skills sont conformes."; exit 0; else exit 1; fi
fi

# --- 2. Mise à jour du clone ----------------------------------------------------------------
if [[ $OFFLINE -eq 0 && $UNINSTALL -eq 0 && -d "$REPO_DIR/.git" && -z "${AGENT_SKILLS_UPDATED:-}" ]]; then
  branch="$(git -C "$REPO_DIR" symbolic-ref --quiet --short HEAD || echo '(détachée)')"
  default="$(git -C "$REPO_DIR" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
  default="${default:-main}"
  if [[ "$branch" != "$default" ]]; then
    warn "clone sur la branche '$branch', pas '$default' : pas de mise à jour. Vos sessions voient les skills de cette branche."
  elif [[ $DRY_RUN -eq 1 ]]; then
    say "(simulation) git pull --ff-only"
  else
    before="$(git -C "$REPO_DIR" rev-parse HEAD)"
    if git -C "$REPO_DIR" ${GIT_AUTH[@]+"${GIT_AUTH[@]}"} pull --ff-only --quiet; then
      if [[ "$(git -C "$REPO_DIR" rev-parse HEAD)" != "$before" ]]; then
        say "Clone mis à jour ($(git -C "$REPO_DIR" log --oneline "$before..HEAD" | wc -l | tr -d ' ') commit(s))."
        # Le script lui-même a pu changer : on relance la nouvelle version.
        AGENT_SKILLS_UPDATED=1 exec bash "$REPO_DIR/install.sh" "$@"
      fi
      say "Clone déjà à jour."
    else
      warn "git pull --ff-only a échoué (hors ligne, modifications locales, accès ?) — synchronisation avec le clone tel quel."
      access_hint
    fi
  fi
fi

validate || warn "des skills ne sont pas conformes (détail ci-dessus) : certains agents les ignoreront."

# --- 3. Cibles ------------------------------------------------------------------------------
target_path() {
  case "$1" in
    agents)   echo "$HOME/.agents/skills" ;;
    claude)   echo "$HOME/.claude/skills" ;;
    opencode) echo "${XDG_CONFIG_HOME:-$HOME/.config}/opencode/skills" ;;
    gemini)   echo "$HOME/.gemini/skills" ;;
    cursor)   echo "$HOME/.cursor/skills" ;;
    copilot)  echo "$HOME/.copilot/skills" ;;
    kimi)     echo "$HOME/.kimi/skills" ;;
    deepcode) echo "$HOME/.deepcode/skills" ;;
    /*)       echo "$1" ;;
    *) echo "Cible inconnue : $1 (voir --help)" >&2; exit 2 ;;
  esac
}
if [[ -z "${TARGETS// }" ]]; then
  if [[ $UNINSTALL -eq 1 ]]; then
    TARGETS="agents claude opencode gemini cursor copilot kimi deepcode"
  else
    TARGETS="agents"
    if [[ -d "$HOME/.claude" ]] || command -v claude >/dev/null 2>&1; then TARGETS="$TARGETS claude"; fi
  fi
fi

# Un lien nous appartient s'il pointe dans ce clone, ou (mort) dans un clone à l'ancien nom.
ours() {
  local dest="$1" legacy
  [[ "$dest" == "$SKILLS_DIR/"* ]] && return 0
  if [[ ! -e "$dest" ]]; then
    for legacy in $LEGACY_REPO_NAMES; do [[ "$dest" == */"$legacy"/skills/* ]] && return 0; done
  fi
  return 1
}

# --- 4. Synchronisation ---------------------------------------------------------------------
added=0 kept=0 removed=0 skipped=0
for t in $TARGETS; do
  dir="$(target_path "$t")"
  say "== $t : $dir"
  [[ $UNINSTALL -eq 1 && ! -d "$dir" ]] && continue
  [[ -d "$dir" ]] || run mkdir -p "$dir"

  # 4a. Nettoyage : nos liens devenus orphelins (skill renommée/supprimée, clone déplacé).
  for link in "$dir"/*; do
    [[ -L "$link" ]] || continue
    dest="$(readlink "$link")"
    ours "$dest" || continue
    if [[ $UNINSTALL -eq 1 || ! -e "$link" ]]; then
      run rm "$link"; say "  retiré : $(basename "$link")"; removed=$((removed+1))
    fi
  done
  [[ $UNINSTALL -eq 1 ]] && continue

  # 4b. Un lien par skill (skills/<groupe>/<skill>/SKILL.md).
  for skill in "$SKILLS_DIR"/*/*/; do
    skill="${skill%/}"; name="$(basename "$skill")"; link="$dir/$name"
    [[ -f "$skill/SKILL.md" ]] || continue
    if [[ -L "$link" ]]; then
      current="$(readlink "$link")"
      if [[ "$current" == "$skill" ]]; then kept=$((kept+1)); continue; fi
      if [[ -e "$link" && $FORCE -eq 0 ]]; then
        warn "$link pointe vers $current — ignoré (--force pour le remplacer)"; skipped=$((skipped+1)); continue
      fi
      run rm "$link"
    elif [[ -e "$link" ]]; then
      warn "$link existe et n'est pas un lien (skill personnelle ?) — ignoré"; skipped=$((skipped+1)); continue
    fi
    run ln -s "$skill" "$link"; say "  lié : $name"; added=$((added+1))
  done
done

say ""
if [[ $UNINSTALL -eq 1 ]]; then
  say "Désinstallé : $removed lien(s) retiré(s). Le clone $REPO_DIR n'est pas supprimé."
else
  say "Terminé : $added ajouté(s), $kept déjà en place, $removed nettoyé(s), $skipped ignoré(s)."
  say "Relancez la session de votre agent si une skill n'apparaît pas."
fi
[[ $DRY_RUN -eq 1 ]] && say "(simulation : rien n'a été modifié)"
exit 0
