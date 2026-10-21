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
 * Pour chaque groupe, le plugin ajoute son instructions.md aux instructions et ses skills
 * (skills/<groupe>/ est découvert récursivement par OpenCode) à config.skills.paths.
 * Ce que l'utilisateur déclare lui-même (skill ou instruction du même nom) l'emporte.
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
  addUnique(config.instructions, path.join(dir, 'instructions.md'))
  addUnique(config.skills.paths, dir)
}

export const AgentSkillsPlugin = async (_input, options = {}) => ({
  config: async (config) => {
    if (!fs.existsSync(SKILLS_DIR))
      return
    config.instructions ??= []
    config.skills ??= {}
    config.skills.paths ??= []
    const groups = options.groups ?? ALL_GROUPS
    for (const group of groups)
      installGroup(config, group)
  },
})
