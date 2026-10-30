/**
 * External skill sources for the OpenCode plugin.
 *
 * Reads the same external-sources.json as scripts/external-sources.mjs (which generates the Claude Code
 * marketplace entries). Each source is fetched once, at its pinned commit, into a cache directory under
 * the user's home: nothing third-party is stored in this repository.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Standalone on purpose: the plugin is installed from a git URL and cannot import from scripts/.
const MARKETPLACE_FILE = path.join('.claude-plugin', 'marketplace.json')
const GIT_BASE = 'https://github.com/'
const GIT_TIMEOUT_MS = 120_000
const SHA_PATTERN = /^[0-9a-f]{40}$/
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/
const SHA_PREFIX_LENGTH = 12
const SKILL_FILE = 'SKILL.md'
const DEFAULT_SKILLS_DIR = 'skills'

const defaultCacheDir = () => path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'), 'agent-skills')

export function readMarketplace(root) {
  return JSON.parse(fs.readFileSync(path.join(root, MARKETPLACE_FILE), 'utf8'))
}

const withoutDotSlash = relativePath => relativePath.replace(/^\.\//, '')

// What a marketplace entry contributes: local directories of this repository, or external sources to fetch.
function entrySkills(entry, root, selection) {
  const { source } = entry
  if (source === './') {
    for (const skillsPath of entry.skills ?? [])
      selection.localDirs.push(insideOf(root, withoutDotSlash(skillsPath)))
  }
  else if (source?.source === 'github') {
    for (const skillsPath of entry.skills?.length ? entry.skills : [DEFAULT_SKILLS_DIR])
      selection.plugins.push([entry.name, { repo: source.repo, sha: source.sha, skillsDir: withoutDotSlash(skillsPath) }])
  }
  else if (source?.source === 'git-subdir') {
    selection.plugins.push([entry.name, { repo: source.url, sha: source.sha, skill: source.path }])
  }
  else {
    throw new Error(`agent-skills : la source '${source?.source ?? source}' de '${entry.name}' n'est pas prise en charge (github, git-subdir ou ./ attendus)`)
  }
}

function collect(marketplace, name, root, selection, visited) {
  if (visited.has(name))
    return
  visited.add(name)
  const entry = marketplace.plugins.find(plugin => plugin.name === name)
  if (!entry)
    throw new Error(`agent-skills : plugin inconnu '${name}' (attendu : ${marketplace.plugins.map(plugin => plugin.name).join(', ')})`)
  for (const dependency of entry.dependencies ?? []) {
    if (dependency.marketplace)
      throw new Error(`agent-skills : '${name}' dépend d'un plugin d'un autre marketplace, non pris en charge`)
    collect(marketplace, typeof dependency === 'string' ? dependency.split('@')[0] : dependency.name, root, selection, visited)
  }
  entrySkills(entry, root, selection)
}

// Resolves marketplace plugins (bundles included, through their `dependencies`) into the skills they provide.
export function bundleSelection(marketplace, names, root) {
  const selection = { localDirs: [], plugins: [] }
  const visited = new Set()
  for (const name of names)
    collect(marketplace, name, root, selection, visited)
  return selection
}

export function skillNames(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, SKILL_FILE)))
    .map(entry => entry.name)
}

function git(args, cwd) {
  execFileSync('git', ['-c', 'advice.detachedHead=false', ...args], { cwd, stdio: 'pipe', timeout: GIT_TIMEOUT_MS })
}

// Fetches one commit (shallow) into <cacheDir>/repos/, atomically: a half-fetched directory is never reused.
function fetchCommit({ repo, sha }, cacheDir, gitBase) {
  if (!REPO_PATTERN.test(repo) || !SHA_PATTERN.test(sha))
    throw new Error(`repo ou sha invalide (${repo}@${sha})`)
  const dir = path.join(cacheDir, 'repos', `${repo.replace('/', '__')}-${sha.slice(0, SHA_PREFIX_LENGTH)}`)
  if (fs.existsSync(dir))
    return dir
  const partial = `${dir}.partial-${process.pid}`
  fs.rmSync(partial, { recursive: true, force: true })
  fs.mkdirSync(partial, { recursive: true })
  try {
    git(['init', '-q'], partial)
    git(['fetch', '-q', '--depth', '1', `${gitBase}${repo}`, sha], partial)
    git(['checkout', '-q', 'FETCH_HEAD'], partial)
    publish(partial, dir)
  }
  finally {
    fs.rmSync(partial, { recursive: true, force: true })
  }
  return dir
}

// Moves a fully built directory into place. Another process may have published the same one first:
// that is a success, since a published directory is always complete.
function publish(partial, dir) {
  try {
    fs.renameSync(partial, dir)
  }
  catch (error) {
    if (!fs.existsSync(dir))
      throw error
  }
}

function insideOf(root, relativePath) {
  const resolved = path.resolve(root, relativePath)
  const relative = path.relative(root, resolved)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`chemin hors du dépôt : ${relativePath}`)
  if (!fs.existsSync(resolved))
    throw new Error(`chemin absent du commit : ${relativePath}`)
  return resolved
}

// Returns a directory whose children are skill directories: the source's own directory (skillsDir), or a
// staging directory holding a copy of the single requested skill, so its siblings are not exposed.
export function stagePlugin(name, plugin, { cacheDir = defaultCacheDir(), gitBase = GIT_BASE } = {}) {
  const checkout = fetchCommit(plugin, cacheDir, gitBase)
  if (plugin.skillsDir)
    return insideOf(checkout, plugin.skillsDir)
  const source = insideOf(checkout, plugin.skill)
  const staged = path.join(cacheDir, 'skills', `${name}-${plugin.sha.slice(0, SHA_PREFIX_LENGTH)}`)
  if (fs.existsSync(staged))
    return staged
  const partial = `${staged}.partial-${process.pid}`
  fs.rmSync(partial, { recursive: true, force: true })
  try {
    fs.cpSync(source, path.join(partial, path.basename(source)), { recursive: true })
    publish(partial, staged)
  }
  finally {
    fs.rmSync(partial, { recursive: true, force: true })
  }
  return staged
}

// Skill names are flat in OpenCode: a source that would shadow an already exposed skill is skipped,
// and an unreachable source never prevents the other skills from loading.
export function addExternalPlugins(config, plugins, options = {}, seenNames = new Set()) {
  const warn = options.warn ?? console.warn
  for (const [name, plugin] of plugins) {
    try {
      const dir = stagePlugin(name, plugin, options)
      const names = skillNames(dir)
      const clash = names.find(skill => seenNames.has(skill))
      if (clash) {
        warn(`agent-skills : source externe "${name}" ignorée, la skill "${clash}" existe déjà`)
        continue
      }
      names.forEach(skill => seenNames.add(skill))
      if (!config.skills.paths.includes(dir))
        config.skills.paths.push(dir)
    }
    catch (error) {
      warn(`agent-skills : source externe "${name}" ignorée (${error.message.split('\n')[0]})`)
    }
  }
}
