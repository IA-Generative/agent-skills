import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildEntries, GENERATED_MARK, mergeMarketplace, validateManifest } from '../scripts/external-sources.mjs'

const SHA = 'a'.repeat(40)

const manifest = () => ({
  plugins: {
    'acme-lint': { description: 'Lint', repo: 'acme/skills', sha: SHA, skill: 'skills/lint' },
    'acme-all': { description: 'All', repo: 'acme/kit', sha: SHA, skillsDir: '.agents/skills' },
  },
  bundles: {
    'team-base': { description: 'Base', plugins: ['acme-lint'], groups: ['audit'] },
    'team-more': { description: 'More', plugins: ['acme-all'], groups: ['audit', 'dat'] },
  },
})

const byName = entries => Object.fromEntries(entries.map(entry => [entry.name, entry]))

test('a single skill becomes a git-subdir plugin pinned to its sha', () => {
  const entry = byName(buildEntries(manifest()))['acme-lint']
  assert.deepEqual(entry.source, { source: 'git-subdir', url: 'acme/skills', path: 'skills/lint', sha: SHA })
  assert.equal(entry.skills, undefined)
})

test('a skills directory becomes a github plugin listing that directory', () => {
  const entry = byName(buildEntries(manifest()))['acme-all']
  assert.deepEqual(entry.source, { source: 'github', repo: 'acme/kit', sha: SHA })
  assert.deepEqual(entry.skills, ['./.agents/skills'])
})

test('a group used by several bundles yields a single local plugin', () => {
  const entries = buildEntries(manifest())
  assert.equal(entries.filter(entry => entry.name === 'mishell-audit').length, 1)
  assert.deepEqual(byName(entries)['mishell-dat'].skills, ['./skills/dat'])
  assert.equal(byName(entries)['mishell-dat'].source, './')
})

test('a bundle is an empty plugin depending on its plugins and groups', () => {
  const bundle = byName(buildEntries(manifest()))['team-base']
  assert.deepEqual(bundle.skills, [])
  assert.deepEqual(bundle.dependencies, ['acme-lint', 'mishell-audit'])
})

test('every generated entry carries the generation mark', () => {
  for (const entry of buildEntries(manifest()))
    assert.deepEqual(entry.metadata, GENERATED_MARK)
})

test('merge keeps hand-written entries and drops stale generated ones', () => {
  const marketplace = {
    name: 'mk',
    plugins: [
      { name: 'handmade', source: './' },
      { name: 'removed-from-manifest', source: './', metadata: GENERATED_MARK },
    ],
  }
  const merged = mergeMarketplace(marketplace, buildEntries(manifest()))
  const names = merged.plugins.map(plugin => plugin.name)
  assert.equal(names[0], 'handmade')
  assert.ok(!names.includes('removed-from-manifest'))
  assert.ok(names.includes('acme-lint'))
})

test('merge is idempotent', () => {
  const once = mergeMarketplace({ name: 'mk', plugins: [] }, buildEntries(manifest()))
  assert.deepEqual(mergeMarketplace(once, buildEntries(manifest())), once)
})

test('a valid manifest has no error', () => {
  assert.deepEqual(validateManifest(manifest(), ['audit', 'dat'], []), [])
})

test('rejects a sha that is not 40 hexadecimal characters', () => {
  const bad = manifest()
  bad.plugins['acme-lint'].sha = 'main'
  assert.match(validateManifest(bad, ['audit', 'dat'], []).join('\n'), /acme-lint.*sha/)
})

test('rejects a plugin that sets both skill and skillsDir, or neither', () => {
  const both = manifest()
  both.plugins['acme-lint'].skillsDir = 'skills'
  const neither = manifest()
  delete neither.plugins['acme-lint'].skill
  assert.match(validateManifest(both, ['audit', 'dat'], []).join('\n'), /acme-lint.*skill.*skillsDir/)
  assert.match(validateManifest(neither, ['audit', 'dat'], []).join('\n'), /acme-lint.*skill.*skillsDir/)
})

test('rejects a bundle that references an unknown plugin or group', () => {
  const bad = manifest()
  bad.bundles['team-base'].plugins.push('ghost')
  bad.bundles['team-base'].groups.push('nope')
  const errors = validateManifest(bad, ['audit', 'dat'], []).join('\n')
  assert.match(errors, /team-base.*ghost/)
  assert.match(errors, /team-base.*nope/)
})

test('rejects a name already used by a hand-written plugin', () => {
  assert.match(validateManifest(manifest(), ['audit', 'dat'], ['acme-lint']).join('\n'), /acme-lint.*déjà/)
})

test('rejects a path that escapes the repository', () => {
  const bad = manifest()
  bad.plugins['acme-lint'].skill = '../outside'
  assert.match(validateManifest(bad, ['audit', 'dat'], []).join('\n'), /acme-lint.*chemin/)
})

test('the committed manifest is valid against the repository groups', () => {
  const manifestFile = JSON.parse(readFileSync(new URL('../external-sources.json', import.meta.url), 'utf8'))
  const groups = ['dev', 'audit', 'repo', 'dat', 'mirai']
  assert.deepEqual(validateManifest(manifestFile, groups, ['mishell-skills']), [])
})
