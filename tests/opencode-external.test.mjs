import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
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

test('an unknown bundle name is rejected', async () => {
  const config = {}
  await assert.rejects(() => AgentSkillsPlugin({}, { bundles: ['no-such-bundle'] }).then(plugin => plugin.config(config)), /no-such-bundle/)
})
