#!/usr/bin/env tsx
/**
 * Unified deploy CLI for the converter SPA.
 *
 *   pnpm deploy gh-pages          # build for GitHub Pages (output → dist/)
 *   pnpm deploy docker            # docker build → local image
 *   pnpm deploy docker --push     # build + push to registry
 *
 * The same script is invoked from .github/workflows/deploy.yml and
 * .github/workflows/deploy-docker.yml so local and CI builds stay in sync.
 *
 * Required env per target (read from process.env / .env / GH secrets):
 *
 *   gh-pages:
 *     NUXT_PUBLIC_SITE_URL          e.g. https://bx-shef.github.io
 *     NUXT_APP_BASE_URL             e.g. /app-convert-bbocode-md/
 *     NUXT_PUBLIC_YANDEX_COUNTER_ID (optional) Yandex.Metrika id; empty = off
 *
 *   docker:
 *     DOCKER_IMAGE                  e.g. ghcr.io/bx-shef/app-convert-bbocode-md
 *     DOCKER_TAG                    tag, default 'latest'
 *     NUXT_PUBLIC_SITE_URL          baked into the static bundle at build time
 *     NUXT_APP_BASE_URL             base path, default '/'
 *     NUXT_PUBLIC_YANDEX_COUNTER_ID (optional) Yandex.Metrika id; empty = off
 *
 * All NUXT_PUBLIC_* values bake into the static bundle at `nuxt generate`, so
 * they must be present at build time (not just in the container's runtime env).
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

type Target = 'gh-pages' | 'docker'
const TARGETS = ['gh-pages', 'docker'] as const satisfies readonly Target[]

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', env })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function need(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ Missing env: ${name}`)
    process.exit(1)
  }
  return v
}

function deployGhPages(): void {
  const siteUrl = need('NUXT_PUBLIC_SITE_URL')
  const baseUrl = need('NUXT_APP_BASE_URL')
  run('pnpm', ['run', 'generate'], {
    ...process.env,
    NUXT_PUBLIC_SITE_URL: siteUrl,
    NUXT_APP_BASE_URL: baseUrl
  })
  if (!existsSync(resolve('dist'))) {
    console.error('✗ Expected dist/ to exist after `nuxt generate`')
    process.exit(1)
  }
  console.log(`\n✓ GitHub Pages build ready in dist/  (base ${baseUrl})`)
}

function deployDocker(extraArgs: string[]): void {
  const image = need('DOCKER_IMAGE')
  const tag = process.env.DOCKER_TAG ?? 'latest'
  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? ''
  const baseUrl = process.env.NUXT_APP_BASE_URL ?? '/'
  const yandexCounterId = process.env.NUXT_PUBLIC_YANDEX_COUNTER_ID ?? ''
  const ref = `${image}:${tag}`
  const push = extraArgs.includes('--push') || process.env.DOCKER_PUSH === '1'

  run('docker', [
    'build',
    '--build-arg', `NUXT_PUBLIC_SITE_URL=${siteUrl}`,
    '--build-arg', `NUXT_APP_BASE_URL=${baseUrl}`,
    '--build-arg', `NUXT_PUBLIC_YANDEX_COUNTER_ID=${yandexCounterId}`,
    '-t', ref,
    '.'
  ])

  if (push) {
    run('docker', ['push', ref])
    console.log(`\n✓ Pushed ${ref}`)
  } else {
    console.log(`\n✓ Built ${ref}  (run with --push to publish)`)
  }
}

const target = process.argv[2] as Target | undefined
const rest = process.argv.slice(3)
if (!target || !TARGETS.includes(target)) {
  console.error(`Usage: pnpm deploy <${TARGETS.join('|')}> [--push]`)
  process.exit(1)
}

switch (target) {
  case 'gh-pages':
    deployGhPages()
    break
  case 'docker':
    deployDocker(rest)
    break
}
