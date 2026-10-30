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
 * Pour chaque groupe, le plugin ajoute skills/<groupe>/ à config.skills.paths (découvert
 * récursivement par OpenCode). Il n'injecte aucune instruction : chaque skill ne se charge
 * que lorsque sa description correspond à la demande.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = path.join(ROOT, 'skills')
const ALL_GROUPS = ['dev', 'audit', 'repo', 'dat', 'mirai']

function addUnique(list, value) {
  if (!list.includes(value))
    list.push(value)
}

function installGroup(config, group) {
  const dir = path.join(SKILLS_DIR, group)
  if (!fs.existsSync(path.join(dir, 'index.json')))
    throw new Error(`agent-skills : groupe inconnu '${group}' (attendu : ${ALL_GROUPS.join(', ')})`)
  addUnique(config.skills.paths, dir)
}

export const AgentSkillsPlugin = async (_input, options = {}) => ({
  config: async (config) => {
    if (!fs.existsSync(SKILLS_DIR))
      return
    config.skills ??= {}
    config.skills.paths ??= []
    const groups = options.groups ?? ALL_GROUPS
    if (!Array.isArray(groups))
      throw new Error(`agent-skills : "groups" doit être une liste, par exemple ["dev", "repo"] (reçu : ${JSON.stringify(groups)})`)
    for (const group of groups)
      installGroup(config, group)
  },
})
