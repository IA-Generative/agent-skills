# agent-skills -- installe OU met a jour les skills de ce depot sur Windows (PowerShell 5.1+).
# Equivalent de install.sh : memes cibles, memes regles, idempotent. Lie chaque skill par une
# JONCTION (pas de droits administrateur ni de mode developpeur) ; ailleurs, par un lien symbolique.
#
# Sans clone (recommande) -- installe la premiere fois, met a jour ensuite :
#   & ([scriptblock]::Create((gh api repos/IA-Generative/agent-skills/contents/install.ps1 -H "Accept: application/vnd.github.raw" | Out-String)))
# Depuis un clone :
#   powershell -ExecutionPolicy Bypass -File install.ps1 [-DryRun] [-Offline] [-Force] [-Uninstall] [-Target agents,claude]
#
# Le clone vit dans $env:AGENT_SKILLS_HOME (defaut ~\.local\share\agent-skills).
# La validation des SKILL.md reste le role de la CI (install.sh --check).
# Fichier volontairement en ASCII : PowerShell 5.1 lit mal l'UTF-8 sans BOM, et plus encore par tube.
param(
  [switch]$DryRun, [switch]$Offline, [switch]$Force, [switch]$Uninstall,
  [string[]]$Target = @()
)
# 'Continue' : sous PowerShell 5.1, 'Stop' transforme en erreur fatale tout stderr d'un git redirige.
# Jamais de 'exit' : lance par scriptblock, il fermerait la fenetre de l'utilisateur ; 'throw' a la place.
$ErrorActionPreference = 'Continue'
$RepoUrl = 'IA-Generative/agent-skills'
$Legacy  = @('skills-claude', 'agent-skills')
$OnWindows = ($env:OS -eq 'Windows_NT')
$LinkType  = if ($OnWindows) { 'Junction' } else { 'SymbolicLink' }

function Say([string]$m)  { Write-Host $m }
function Warn([string]$m) { Write-Host "ATTENTION : $m" -ForegroundColor Yellow }
function Run([string]$what, [scriptblock]$do) { if ($DryRun) { Say "  (simulation) $what" } else { & $do } }
function P { [IO.Path]::Combine([string[]]$args) }
function Has([string]$cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function AccessHint {
  Say "  Le depot est interne a l'organisation IA-Generative : il faut en etre membre et que git"
  Say "  soit authentifie. Verifiez avec 'gh auth status', sinon 'gh auth login --web -p https'."
}

# --- 0. Le clone : celui qui contient ce script, sinon ~\.local\share\agent-skills ----------
$RepoDir = $null; $JustCloned = $false
# Si gh est la, git emprunte son jeton : ni 'gh auth setup-git' ni gestionnaire d'identifiants requis.
$GitAuth = if (Has 'gh') { @('-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential') } else { @() }
if ($PSCommandPath -and (Test-Path (P (Split-Path $PSCommandPath) 'skills'))) {
  $RepoDir = Split-Path $PSCommandPath
} else {
  $RepoDir = if ($env:AGENT_SKILLS_HOME) { $env:AGENT_SKILLS_HOME } else { P $HOME '.local' 'share' 'agent-skills' }
  if (-not (Test-Path (P $RepoDir '.git'))) {
    if (-not (Has 'git')) {
      Warn 'git est absent.'
      Say '  Windows : winget install --id Git.Git -e, puis rouvrez le terminal et relancez.'
      throw 'installation interrompue : git absent'
    }
    Say "Clonage de $RepoUrl dans $RepoDir"
    if ($DryRun) { Say '  (simulation) git clone'; return }
    New-Item -ItemType Directory -Force -Path (Split-Path $RepoDir) | Out-Null
    if (Has 'gh') { gh repo clone $RepoUrl $RepoDir -- --quiet } else { git clone --quiet "https://github.com/$RepoUrl.git" $RepoDir }
    if ($LASTEXITCODE -ne 0) { Warn 'le clonage a echoue.'; AccessHint; throw 'installation interrompue : clonage refuse' }
    $JustCloned = $true
  }
}
$SkillsDir = (Resolve-Path (P $RepoDir 'skills')).Path

# --- 1. Mise a jour du clone, s'il est sur sa branche par defaut ----------------------------
if (-not $Offline -and -not $Uninstall -and -not $JustCloned -and (Test-Path (P $RepoDir '.git'))) {
  $branch  = (git -C $RepoDir symbolic-ref --quiet --short HEAD 2>$null)
  $default = (git -C $RepoDir symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>$null)
  $default = if ($default) { $default -replace '^origin/', '' } else { 'main' }
  if ($branch -ne $default) {
    Warn "clone sur la branche '$branch', pas '$default' : pas de mise a jour."
  } elseif ($DryRun) {
    Say '(simulation) git pull --ff-only'
  } else {
    git -C $RepoDir @GitAuth pull --ff-only --quiet
    if ($LASTEXITCODE -ne 0) { Warn 'git pull --ff-only a echoue -- synchronisation avec le clone tel quel.'; AccessHint }
    else { Say 'Clone a jour.' }
  }
}

# --- 2. Cibles ------------------------------------------------------------------------------
$cfg = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { P $HOME '.config' }
$Paths = [ordered]@{
  agents   = P $HOME '.agents' 'skills';   claude   = P $HOME '.claude' 'skills'
  opencode = P $cfg 'opencode' 'skills';   gemini   = P $HOME '.gemini' 'skills'
  cursor   = P $HOME '.cursor' 'skills';   copilot  = P $HOME '.copilot' 'skills'
  kimi     = P $HOME '.kimi' 'skills';     deepcode = P $HOME '.deepcode' 'skills'
}
if ($Target.Count -eq 0) {
  if ($Uninstall) { $Target = @($Paths.Keys) }
  else {
    $Target = @('agents')
    if ((Test-Path (P $HOME '.claude')) -or (Has 'claude')) { $Target += 'claude' }
  }
}

function LinkTarget($item) { $t = @($item.Target)[0]; if ($t) { [string]$t } else { $null } }
function IsLink($item)     { [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint) }
function Ours([string]$dest) {
  if (-not $dest) { return $false }
  if ($dest.StartsWith("$SkillsDir$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::OrdinalIgnoreCase)) { return $true }
  if (-not (Test-Path $dest)) { foreach ($l in $Legacy) { if ($dest -match "[\\/]$l[\\/]skills[\\/]") { return $true } } }
  return $false
}

# --- 3. Synchronisation ---------------------------------------------------------------------
$added = 0; $kept = 0; $removed = 0; $skipped = 0
foreach ($t in $Target) {
  $dir = if ($Paths.Contains($t)) { $Paths[$t] } elseif ([IO.Path]::IsPathRooted($t)) { $t } else { throw "cible inconnue : $t" }
  Say "== $t : $dir"
  if ($Uninstall -and -not (Test-Path $dir)) { continue }
  if (-not (Test-Path $dir)) { Run "mkdir $dir" { New-Item -ItemType Directory -Force -Path $dir | Out-Null } }

  # 3a. Nos liens devenus orphelins (skill renommee ou supprimee, clone deplace).
  foreach ($item in @(Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue | Where-Object { IsLink $_ })) {
    $dest = LinkTarget $item
    if (-not (Ours $dest)) { continue }
    if ($Uninstall -or -not (Test-Path $dest)) {
      Run "retirer $($item.FullName)" { $item.Delete() }; Say "  retire : $($item.Name)"; $removed++
    }
  }
  if ($Uninstall) { continue }

  # 3b. Un lien par skill.
  foreach ($skill in @(Get-ChildItem -LiteralPath $SkillsDir -Directory)) {
    if (-not (Test-Path (P $skill.FullName 'SKILL.md'))) { continue }
    $link = P $dir $skill.Name
    $item = Get-Item -LiteralPath $link -Force -ErrorAction SilentlyContinue
    if ($item -and (IsLink $item)) {
      $cur = LinkTarget $item
      if ($cur -eq $skill.FullName) { $kept++; continue }
      if ((Test-Path $cur) -and -not $Force) { Warn "$link pointe vers $cur -- ignore (-Force pour le remplacer)"; $skipped++; continue }
      Run "retirer $link" { $item.Delete() }
    } elseif ($item) {
      Warn "$link existe et n'est pas un lien (skill personnelle ?) -- ignore"; $skipped++; continue
    }
    Run "lier $link -> $($skill.FullName)" { New-Item -ItemType $LinkType -Path $link -Target $skill.FullName | Out-Null }
    Say "  lie : $($skill.Name)"; $added++
  }
}

Say ''
if ($Uninstall) { Say "Desinstalle : $removed lien(s) retire(s). Le clone $RepoDir n'est pas supprime." }
else {
  Say "Termine : $added ajoute(s), $kept deja en place, $removed nettoye(s), $skipped ignore(s)."
  Say "Relancez la session de votre agent si une skill n'apparait pas."
}
if ($DryRun) { Say '(simulation : rien n''a ete modifie)' }
$global:LASTEXITCODE = 0   # un git pull en echec n'est qu'un avertissement
