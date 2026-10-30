import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { AgentSkillsPlugin } from '../plugin/agent-skills.js'
import { addExternalPlugins, bundleSelection, stagePlugin } from '../plugin/external.js'

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

let workDir
let gitBase
let sha

function writeSkill(root, relativeDir, name) {
  const dir = join(root, relativeDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name}\n---\n`)
}

// A fake "remote": acme/kit with two skills under skills/, served from the local filesystem.
before(() => {
  workDir = mkdtempSync(join(tmpdir(), 'external-test-'))
  gitBase = `${join(workDir, 'remote')}/`
  const repo = join(workDir, 'remote', 'acme', 'kit')
  mkdirSync(repo, { recursive: true })
  git(repo, 'init', '-q')
  git(repo, 'config', 'user.email', 'test@example.com')
  git(repo, 'config', 'user.name', 'test')
  git(repo, 'config', 'uploadpack.allowAnySHA1InWant', 'true')
  writeSkill(repo, 'skills/lint', 'lint')
  writeSkill(repo, 'skills/format', 'format')
  writeSkill(repo, '..odd', 'odd')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'init')
  sha = git(repo, 'rev-parse', 'HEAD')
})

after(() => rmSync(workDir, { recursive: true, force: true }))

const options = () => ({ cacheDir: join(workDir, 'cache'), gitBase })
const skillNames = dir => readdirSync(dir).sort()

test('bundleSelection merges the groups and plugins of several bundles without duplicates', () => {
  const manifest = {
    plugins: { a: {}, b: {} },
    bundles: { one: { plugins: ['a'], groups: ['audit'] }, two: { plugins: ['a', 'b'], groups: ['audit', 'dat'] } },
  }
  const selection = bundleSelection(manifest, ['one', 'two'])
  assert.deepEqual(selection.groups, ['audit', 'dat'])
  assert.deepEqual(selection.plugins.map(([name]) => name), ['a', 'b'])
})

test('bundleSelection rejects an unknown bundle and lists the available ones', () => {
  assert.throws(() => bundleSelection({ plugins: {}, bundles: { one: {} } }, ['nope']), /nope.*one/)
})

test('a skillsDir plugin exposes the whole directory of the pinned commit', () => {
  const dir = stagePlugin('acme-all', { repo: 'acme/kit', sha, skillsDir: 'skills' }, options())
  assert.deepEqual(skillNames(dir), ['format', 'lint'])
})

test('a skill plugin exposes only that skill, not its siblings', () => {
  const dir = stagePlugin('acme-lint', { repo: 'acme/kit', sha, skill: 'skills/lint' }, options())
  assert.deepEqual(skillNames(dir), ['lint'])
})

test('a skill directory whose name starts with two dots is not mistaken for a path escape', () => {
  const dir = stagePlugin('acme-odd', { repo: 'acme/kit', sha, skill: '..odd' }, options())
  assert.deepEqual(skillNames(dir), ['..odd'])
})

test('a path escaping the repository is refused', () => {
  assert.throws(() => stagePlugin('evil', { repo: 'acme/kit', sha, skillsDir: '../outside' }, options()), /hors du dépôt/)
})

test('two processes filling the same cache at once both succeed', async () => {
  const cacheDir = join(workDir, 'race-cache')
  const script = `import { stagePlugin } from ${JSON.stringify(new URL('../plugin/external.js', import.meta.url).href)}
    stagePlugin('acme-lint', { repo: 'acme/kit', sha: ${JSON.stringify(sha)}, skill: 'skills/lint' }, { cacheDir: ${JSON.stringify(cacheDir)}, gitBase: ${JSON.stringify(gitBase)} })`
  const run = () => new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: 'pipe' })
    let stderr = ''
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('close', code => resolve({ code, stderr }))
  })
  const results = await Promise.all([run(), run(), run()])
  assert.deepEqual(results.map(result => result.code), [0, 0, 0], results.map(result => result.stderr).join('\n'))
})

test('a pinned commit already in the cache is not fetched again', () => {
  stagePlugin('acme-all', { repo: 'acme/kit', sha, skillsDir: 'skills' }, options())
  const unreachable = { ...options(), gitBase: join(workDir, 'gone/') }
  assert.deepEqual(skillNames(stagePlugin('acme-all', { repo: 'acme/kit', sha, skillsDir: 'skills' }, unreachable)), ['format', 'lint'])
})

test('a skill name already provided is refused and the source skipped, with a warning', () => {
  const warnings = []
  const config = { skills: { paths: [] } }
  const seen = new Set(['lint'])
  addExternalPlugins(config, [['acme-all', { repo: 'acme/kit', sha, skillsDir: 'skills' }]], { ...options(), warn: message => warnings.push(message) }, seen)
  assert.deepEqual(config.skills.paths, [])
  assert.match(warnings.join('\n'), /acme-all.*lint/)
})

test('an unreachable source is skipped with a warning and does not break the others', () => {
  const warnings = []
  const config = { skills: { paths: [] } }
  const plugins = [
    ['broken', { repo: 'ghost/repo', sha: 'f'.repeat(40), skillsDir: 'skills' }],
    ['acme-lint', { repo: 'acme/kit', sha, skill: 'skills/lint' }],
  ]
  addExternalPlugins(config, plugins, { ...options(), warn: message => warnings.push(message) }, new Set())
  assert.equal(config.skills.paths.length, 1)
  assert.match(warnings.join('\n'), /broken/)
})

test('the plugin exposes every group by default', async () => {
  const config = {}
  await (await AgentSkillsPlugin({}, {})).config(config)
  assert.equal(config.skills.paths.length, 5)
})

test('with bundles and no explicit groups, only the groups of the bundles are exposed', async () => {
  const config = {}
  const manifest = { plugins: {}, bundles: { only: { description: '', plugins: [], groups: ['audit'] } } }
  await (await AgentSkillsPlugin({}, { bundles: ['only'], manifest })).config(config)
  assert.equal(config.skills.paths.length, 1)
  assert.ok(config.skills.paths[0].endsWith(join('skills', 'audit')))
  assert.ok(existsSync(config.skills.paths[0]))
})

test('explicit groups and bundles are combined', async () => {
  const config = {}
  const manifest = { plugins: {}, bundles: { only: { description: '', plugins: [], groups: ['audit'] } } }
  await (await AgentSkillsPlugin({}, { groups: ['dat'], bundles: ['only'], manifest })).config(config)
  assert.deepEqual(config.skills.paths.map(dir => dir.split(/[\\/]/).pop()), ['dat', 'audit'])
})

test('an unknown bundle name is rejected', async () => {
  const config = {}
  await assert.rejects(() => AgentSkillsPlugin({}, { bundles: ['no-such-bundle'] }).then(plugin => plugin.config(config)), /no-such-bundle/)
})
