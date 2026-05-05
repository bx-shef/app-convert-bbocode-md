#!/usr/bin/env tsx
/**
 * Unified deploy CLI for the converter SPA.
 *
 *   pnpm deploy gh-pages   # build for GitHub Pages (output → dist/)
 *   pnpm deploy joker      # build + rsync upload to a Joker.com (or any SSH) host
 *
 * The same script is invoked from .github/workflows/deploy.yml and
 * .github/workflows/deploy-joker.yml so local and CI builds stay in sync.
 *
 * Required env per target (read from process.env / .env / GH secrets):
 *
 *   gh-pages:
 *     NUXT_PUBLIC_SITE_URL    e.g. https://bx-shef.github.io
 *     NUXT_APP_BASE_URL       e.g. /app-convert-bbocode-md/
 *
 *   joker:
 *     NUXT_PUBLIC_SITE_URL    public URL of the deployed SPA
 *     NUXT_APP_BASE_URL       base path on the host (default '/')
 *     JOKER_SSH_HOST          ssh host
 *     JOKER_SSH_USER          ssh user
 *     JOKER_SSH_PORT          ssh port (default 22)
 *     JOKER_REMOTE_PATH       absolute path on the host (e.g. /var/www/app)
 *     JOKER_SSH_KEY_PATH      path to private key (optional; falls back to ssh-agent)
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

type Target = 'gh-pages' | 'joker'
const TARGETS = ['gh-pages', 'joker'] as const satisfies readonly Target[]

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

function generate(extra: Record<string, string>): void {
  run('pnpm', ['run', 'generate'], { ...process.env, ...extra })
  if (!existsSync(resolve('dist'))) {
    console.error('✗ Expected dist/ to exist after `nuxt generate`')
    process.exit(1)
  }
}

function deployGhPages(): void {
  // CI workflow sets these explicitly; require them so local runs don't ship a broken base URL.
  const siteUrl = need('NUXT_PUBLIC_SITE_URL')
  const baseUrl = need('NUXT_APP_BASE_URL')
  generate({ NUXT_PUBLIC_SITE_URL: siteUrl, NUXT_APP_BASE_URL: baseUrl })
  console.log(`\n✓ GitHub Pages build ready in dist/  (base ${baseUrl})`)
}

function deployJoker(): void {
  const host = need('JOKER_SSH_HOST')
  const user = need('JOKER_SSH_USER')
  const path = need('JOKER_REMOTE_PATH')
  const port = process.env.JOKER_SSH_PORT ?? '22'
  const keyPath = process.env.JOKER_SSH_KEY_PATH
  const siteUrl = need('NUXT_PUBLIC_SITE_URL')
  const baseUrl = process.env.NUXT_APP_BASE_URL ?? '/'

  generate({ NUXT_PUBLIC_SITE_URL: siteUrl, NUXT_APP_BASE_URL: baseUrl })

  const sshOpts = [
    '-p', port,
    '-o', 'StrictHostKeyChecking=accept-new'
  ]
  if (keyPath) sshOpts.push('-i', keyPath)

  run('rsync', [
    '-avz',
    '--delete',
    '-e', `ssh ${sshOpts.join(' ')}`,
    `${resolve('dist')}/`,
    `${user}@${host}:${path}`
  ])
  console.log(`\n✓ Deployed to ${user}@${host}:${path}`)
}

const target = process.argv[2] as Target | undefined
if (!target || !TARGETS.includes(target)) {
  console.error(`Usage: pnpm deploy <${TARGETS.join('|')}>`)
  process.exit(1)
}

switch (target) {
  case 'gh-pages': deployGhPages(); break
  case 'joker':    deployJoker();   break
}
