/**
 * Plugin OpenCode des skills IA-Generative.
 *
 * Injecte le socle de conventions puis, pour chaque groupe choisi, ses skills, ses agents
 * (opencode/agents/<groupe>/*.md) et ses commandes (opencode/commands/<groupe>/*.md), via le hook
 * `config`, sans aucun clone ni symlink local : le plugin est lui-même chargé par OpenCode depuis
 * le cache (URL git+https), et ses fichiers sont lus depuis le répertoire du plugin.
 *
 *   "plugin": [["agent-skills@git+https://github.com/IA-Generative/agent-skills.git",
 *               { "groups": ["dev", "repo"] }]]
 *
 * Groupes disponibles : dev, audit, repo, dat, mirai, dso (défaut : tous).
 * Pour chaque groupe, le plugin ajoute skills/<groupe>/ à config.skills.paths (découvert
 * récursivement par OpenCode). Aucune consigne de groupe n'est injectée : chaque skill ne se
 * charge que lorsque sa description correspond à la demande.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = path.join(ROOT, 'skills')
const ALL_GROUPS = ['dev', 'audit', 'repo', 'dat', 'mirai', 'dso']
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

function readMarkdown(file) {
  const match = fs.readFileSync(file, 'utf8').match(FRONTMATTER)
  if (!match)
    throw new Error(`agent-skills : frontmatter absent dans ${file}`)
  // {{KIT_ROOT}} : chemin réel du dépôt (cache du plugin chez l'utilisateur, jamais un dépôt local)
  return { meta: Bun.YAML.parse(match[1]) ?? {}, body: match[2].trim().replaceAll('{{KIT_ROOT}}', ROOT) }
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir))
    return []
  return fs.readdirSync(dir).filter(file => file.endsWith('.md')).sort().map(file => path.join(dir, file))
}

function addUnique(list, value) {
  if (!list.includes(value))
    list.push(value)
}

function register(target, dir, bodyKey) {
  for (const file of markdownFiles(dir)) {
    const name = path.basename(file, '.md')
    const { meta, body } = readMarkdown(file)
    target[name] = { ...meta, [bodyKey]: body, ...target[name] }
  }
}

function installGroup(config, group) {
  const dir = path.join(SKILLS_DIR, group)
  if (!fs.existsSync(path.join(dir, 'index.json')))
    throw new Error(`agent-skills : groupe inconnu '${group}' (attendu : ${ALL_GROUPS.join(', ')})`)
  addUnique(config.skills.paths, dir)
  register(config.agent, path.join(ROOT, 'opencode/agents', group), 'prompt')
  register(config.command, path.join(ROOT, 'opencode/commands', group), 'template')
}

export const AgentSkillsPlugin = async (_input, options = {}) => ({
  config: async (config) => {
    if (!fs.existsSync(SKILLS_DIR))
      return
    config.skills ??= {}
    config.skills.paths ??= []
    config.agent ??= {}
    config.command ??= {}
    addUnique(config.instructions, path.join(ROOT, 'socle/conventions.md'))
    const groups = options.groups ?? ALL_GROUPS
    if (!Array.isArray(groups))
      throw new Error(`agent-skills : "groups" doit être une liste, par exemple ["dev", "repo"] (reçu : ${JSON.stringify(groups)})`)
    for (const group of groups)
      installGroup(config, group)
  },
})
