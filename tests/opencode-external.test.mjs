import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
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

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const SHA = 'a'.repeat(40)
const marketplace = {
  plugins: [
    { name: 'local-audit', source: './', skills: ['./skills/audit'] },
    { name: 'acme-lint', source: { source: 'git-subdir', url: 'acme/kit', path: 'skills/lint', sha: SHA } },
    { name: 'acme-all', source: { source: 'github', repo: 'acme/kit', sha: SHA }, skills: ['./skills'] },
    { name: 'plain', source: { source: 'github', repo: 'acme/kit', sha: SHA } },
    { name: 'base', source: './', skills: [], dependencies: ['acme-lint', 'local-audit'] },
    { name: 'more', source: './', skills: [], dependencies: ['base', 'acme-all'] },
  ],
}

test('bundleSelection follows dependencies recursively, once each', () => {
  const selection = bundleSelection(marketplace, ['more', 'base'], REPO_ROOT)
  assert.deepEqual(selection.localDirs, [join(REPO_ROOT, 'skills', 'audit')])
  assert.deepEqual(selection.plugins, [
    ['acme-lint', { repo: 'acme/kit', sha: SHA, skill: 'skills/lint' }],
    ['acme-all', { repo: 'acme/kit', sha: SHA, skillsDir: 'skills' }],
  ])
})

test('a github plugin without a skills field exposes its default skills directory', () => {
  assert.deepEqual(bundleSelection(marketplace, ['plain'], REPO_ROOT).plugins, [['plain', { repo: 'acme/kit', sha: SHA, skillsDir: 'skills' }]])
})

test('bundleSelection rejects an unknown plugin and lists the available ones', () => {
  assert.throws(() => bundleSelection(marketplace, ['nope'], REPO_ROOT), /nope.*acme-lint/)
})

test('bundleSelection refuses what it cannot fetch instead of skipping it silently', () => {
  const npm = { plugins: [{ name: 'p', source: { source: 'npm', package: 'x' } }] }
  const cross = { plugins: [{ name: 'p', source: './', skills: [], dependencies: [{ name: 'q', marketplace: 'other' }] }] }
  assert.throws(() => bundleSelection(npm, ['p'], REPO_ROOT), /npm/)
  assert.throws(() => bundleSelection(cross, ['p'], REPO_ROOT), /autre marketplace/)
})

test('every external source of the committed marketplace is pinned to a full commit', () => {
  const committed = JSON.parse(readFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const external = committed.plugins.filter(plugin => typeof plugin.source === 'object')
  assert.ok(external.length > 0)
  for (const { name, source } of external) {
    assert.ok(['github', 'git-subdir'].includes(source.source), `${name} : source non prise en charge par le plugin OpenCode`)
    assert.match(source.repo ?? source.url, /^[\w.-]+\/[\w.-]+$/, `${name} : owner/repo attendu`)
    assert.match(source.sha, /^[0-9a-f]{40}$/, `${name} : sha de commit complet attendu`)
  }
})

test('the committed bundles resolve to the expected sources', () => {
  const committed = JSON.parse(readFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const base = bundleSelection(committed, ['mishell-base'], REPO_ROOT)
  const more = bundleSelection(committed, ['mishell-more'], REPO_ROOT)
  assert.deepEqual([base.localDirs.length, base.plugins.length], [0, 2])
  assert.deepEqual(more.localDirs.map(dir => dir.split(/[\\/]/).pop()), ['audit', 'dat'])
  assert.equal(more.plugins.length, 3)
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
  const only = { plugins: [{ name: 'only', source: './', skills: ['./skills/audit'] }] }
  await (await AgentSkillsPlugin({}, { bundles: ['only'], marketplace: only })).config(config)
  assert.equal(config.skills.paths.length, 1)
  assert.ok(config.skills.paths[0].endsWith(join('skills', 'audit')))
  assert.ok(existsSync(config.skills.paths[0]))
})

test('explicit groups and bundles are combined', async () => {
  const config = {}
  const only = { plugins: [{ name: 'only', source: './', skills: ['./skills/audit'] }] }
  await (await AgentSkillsPlugin({}, { groups: ['dat'], bundles: ['only'], marketplace: only })).config(config)
  assert.deepEqual(config.skills.paths.map(dir => dir.split(/[\\/]/).pop()), ['dat', 'audit'])
})

test('an unknown bundle name is rejected', async () => {
  const config = {}
  await assert.rejects(() => AgentSkillsPlugin({}, { bundles: ['no-such-bundle'] }).then(plugin => plugin.config(config)), /no-such-bundle/)
})
