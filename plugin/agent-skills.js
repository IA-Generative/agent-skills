/**
 * Plugin OpenCode des skills IA-Generative.
 *
 * Injecte les skills partagées du dépôt par groupe, via le hook `config`, sans aucun clone
 * ni symlink local : le plugin est lui-même chargé par OpenCode depuis le cache (URL git+https),
 * et ses skills sont lues depuis le répertoire du plugin.
 *
 *   "plugin": [["agent-skills@git+https://github.com/IA-Generative/agent-skills.git",
 *               { "groups": ["dev", "repo"] }]]
 *
 * Groupes disponibles : dev, audit, repo, dat, mirai (défaut : tous).
 * `bundles` charge des plugins du marketplace Claude Code (.claude-plugin/marketplace.json), par exemple
 * ["mishell-base"] : leurs `dependencies` sont suivies, et les sources github / git-subdir sont récupérées
 * à leur commit figé dans ~/.cache/agent-skills. Sans `groups`, seules les skills des bundles sont chargées.
 * Pour chaque groupe, le plugin ajoute skills/<groupe>/ à config.skills.paths (découvert
 * récursivement par OpenCode). Il n'injecte aucune instruction : chaque skill ne se charge
 * que lorsque sa description correspond à la demande.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { addExternalPlugins, bundleSelection, readMarketplace, skillNames } from './external.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = path.join(ROOT, 'skills')
const ALL_GROUPS = ['dev', 'audit', 'repo', 'dat', 'mirai']

function addUnique(list, value) {
  if (!list.includes(value))
    list.push(value)
}

function installGroup(config, group, seenNames) {
  const dir = path.join(SKILLS_DIR, group)
  if (!fs.existsSync(path.join(dir, 'index.json')))
    throw new Error(`agent-skills : groupe inconnu '${group}' (attendu : ${ALL_GROUPS.join(', ')})`)
  addUnique(config.skills.paths, dir)
  skillNames(dir).forEach(skill => seenNames.add(skill))
}

function requireList(options, key, example) {
  const value = options[key] ?? []
  if (!Array.isArray(value))
    throw new Error(`agent-skills : "${key}" doit être une liste, par exemple ${example} (reçu : ${JSON.stringify(value)})`)
  return value
}

export const AgentSkillsPlugin = async (_input, options = {}) => ({
  config: async (config) => {
    if (!fs.existsSync(SKILLS_DIR))
      return
    config.skills ??= {}
    config.skills.paths ??= []
    const bundles = requireList(options, 'bundles', '["mishell-base"]')
    const explicitGroups = options.groups === undefined ? undefined : requireList(options, 'groups', '["dev", "repo"]')
    // Without "groups", every group is exposed, unless bundles are asked for: then only theirs are.
    const selection = bundles.length > 0
      ? bundleSelection(options.marketplace ?? readMarketplace(ROOT), bundles, ROOT)
      : { localDirs: [], plugins: [] }
    const groups = new Set(explicitGroups ?? (bundles.length > 0 ? [] : ALL_GROUPS))
    const seenNames = new Set()
    for (const group of groups)
      installGroup(config, group, seenNames)
    for (const dir of selection.localDirs) {
      addUnique(config.skills.paths, dir)
      skillNames(dir).forEach(skill => seenNames.add(skill))
    }
    addExternalPlugins(config, selection.plugins, { cacheDir: options.cacheDir, gitBase: options.gitBase }, seenNames)
  },
})
