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

const MANIFEST_FILE = 'external-sources.json'
const GIT_BASE = 'https://github.com/'
const GIT_TIMEOUT_MS = 120_000
const SHA_PATTERN = /^[0-9a-f]{40}$/
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/
const SHA_PREFIX_LENGTH = 12
const SKILL_FILE = 'SKILL.md'

const defaultCacheDir = () => path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'), 'agent-skills')

export function readManifest(root) {
  return JSON.parse(fs.readFileSync(path.join(root, MANIFEST_FILE), 'utf8'))
}

export function bundleSelection(manifest, bundleNames) {
  const groups = new Set()
  const plugins = new Set()
  for (const name of bundleNames) {
    const bundle = manifest.bundles[name]
    if (!bundle)
      throw new Error(`agent-skills : bundle inconnu '${name}' (attendu : ${Object.keys(manifest.bundles).join(', ')})`)
    bundle.groups.forEach(group => groups.add(group))
    bundle.plugins.forEach(plugin => plugins.add(plugin))
  }
  return { groups: [...groups], plugins: [...plugins].map(name => [name, manifest.plugins[name]]) }
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
    fs.renameSync(partial, dir)
  }
  catch (error) {
    fs.rmSync(partial, { recursive: true, force: true })
    throw error
  }
  return dir
}

function insideOf(root, relativePath) {
  const resolved = path.resolve(root, relativePath)
  if (path.relative(root, resolved).startsWith('..'))
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
  fs.cpSync(source, path.join(partial, path.basename(source)), { recursive: true })
  fs.renameSync(partial, staged)
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
