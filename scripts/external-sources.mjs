#!/usr/bin/env node
// Generates or checks the external-source entries of .claude-plugin/marketplace.json from external-sources.json.
// external-sources.json is the single list read by Claude Code (through the generated entries) and by the
// OpenCode plugin (plugin/agent-skills.js reads it directly). CI runs `--check`: a stale marketplace fails the PR.
// Generated entries carry GENERATED_MARK in their `metadata`; every other entry is hand-written and left untouched.
// Usage: node scripts/external-sources.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const MANIFEST_FILE = 'external-sources.json'
const MARKETPLACE_FILE = '.claude-plugin/marketplace.json'
const SKILLS_DIR = 'skills'
const GROUP_PLUGIN_PREFIX = 'mishell-'
const SHA_PATTERN = /^[0-9a-f]{40}$/
const JSON_INDENT = 2

export const GENERATED_MARK = { generatedBy: 'scripts/external-sources.mjs' }

const isGenerated = plugin => plugin.metadata?.generatedBy === GENERATED_MARK.generatedBy
const groupPlugin = group => `${GROUP_PLUGIN_PREFIX}${group}`

function pathErrors(name, field, value) {
  if (typeof value !== 'string' || value === '' || value.startsWith('/') || value.split('/').includes('..'))
    return [`${name} : chemin invalide pour "${field}" (relatif, sans "..")`]
  return []
}

function pluginErrors(name, plugin) {
  const errors = []
  if (!/^[\w.-]+\/[\w.-]+$/.test(plugin.repo ?? ''))
    errors.push(`${name} : "repo" doit être de la forme owner/repo`)
  if (!SHA_PATTERN.test(plugin.sha ?? ''))
    errors.push(`${name} : "sha" doit être un sha de commit complet (40 caractères hexadécimaux)`)
  if (Boolean(plugin.skill) === Boolean(plugin.skillsDir))
    errors.push(`${name} : exactement un de "skill" et "skillsDir" est attendu`)
  for (const field of ['skill', 'skillsDir'])
    if (plugin[field])
      errors.push(...pathErrors(name, field, plugin[field]))
  return errors
}

function bundleErrors(name, bundle, pluginNames, groups) {
  return [
    ...bundle.plugins.filter(plugin => !pluginNames.includes(plugin)).map(plugin => `${name} : plugin inconnu "${plugin}"`),
    ...bundle.groups.filter(group => !groups.includes(group)).map(group => `${name} : groupe inconnu "${group}"`),
  ]
}

export function validateManifest(manifest, groups, handWrittenNames) {
  const pluginNames = Object.keys(manifest.plugins)
  const generatedNames = [...pluginNames, ...Object.keys(manifest.bundles), ...groups.map(groupPlugin)]
  return [
    ...generatedNames.filter(name => handWrittenNames.includes(name)).map(name => `${name} : nom déjà pris par un plugin écrit à la main`),
    ...Object.entries(manifest.plugins).flatMap(([name, plugin]) => pluginErrors(name, plugin)),
    ...Object.entries(manifest.bundles).flatMap(([name, bundle]) => bundleErrors(name, bundle, pluginNames, groups)),
  ]
}

function pluginEntry(name, plugin) {
  const entry = { name, description: plugin.description }
  if (plugin.skill)
    return { ...entry, source: { source: 'git-subdir', url: plugin.repo, path: plugin.skill, sha: plugin.sha }, metadata: GENERATED_MARK }
  return {
    ...entry,
    source: { source: 'github', repo: plugin.repo, sha: plugin.sha },
    skills: [`./${plugin.skillsDir}`],
    metadata: GENERATED_MARK,
  }
}

function groupEntry(group) {
  return {
    name: groupPlugin(group),
    source: './',
    description: `Skills du groupe ${group} de ce dépôt`,
    skills: [`./${SKILLS_DIR}/${group}`],
    metadata: GENERATED_MARK,
  }
}

function bundleEntry(name, bundle) {
  return {
    name,
    source: './',
    description: bundle.description,
    skills: [],
    dependencies: [...bundle.plugins, ...bundle.groups.map(groupPlugin)],
    metadata: GENERATED_MARK,
  }
}

export function buildEntries(manifest) {
  const groups = [...new Set(Object.values(manifest.bundles).flatMap(bundle => bundle.groups))]
  return [
    ...Object.entries(manifest.plugins).map(([name, plugin]) => pluginEntry(name, plugin)),
    ...groups.map(groupEntry),
    ...Object.entries(manifest.bundles).map(([name, bundle]) => bundleEntry(name, bundle)),
  ]
}

export function mergeMarketplace(marketplace, entries) {
  return { ...marketplace, plugins: [...marketplace.plugins.filter(plugin => !isGenerated(plugin)), ...entries] }
}

const readJson = file => JSON.parse(readFileSync(file, 'utf8'))
const serialize = value => `${JSON.stringify(value, null, JSON_INDENT)}\n`

function repositoryGroups() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(SKILLS_DIR, entry.name, 'index.json')))
    .map(entry => entry.name)
}

function main(check) {
  const manifest = readJson(MANIFEST_FILE)
  const marketplace = readJson(MARKETPLACE_FILE)
  const handWritten = marketplace.plugins.filter(plugin => !isGenerated(plugin)).map(plugin => plugin.name)
  const errors = validateManifest(manifest, repositoryGroups(), handWritten)
  if (errors.length > 0) {
    console.error(errors.map(error => `${MANIFEST_FILE} : ${error}`).join('\n'))
    process.exit(1)
  }
  const expected = serialize(mergeMarketplace(marketplace, buildEntries(manifest)))
  if (!check) {
    writeFileSync(MARKETPLACE_FILE, expected)
    return
  }
  if (readFileSync(MARKETPLACE_FILE, 'utf8') !== expected) {
    console.error(`${MARKETPLACE_FILE} est périmé : lancer node scripts/external-sources.mjs`)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.includes('--check'))
