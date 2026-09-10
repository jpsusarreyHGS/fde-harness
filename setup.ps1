#!/usr/bin/env pwsh
#Requires -Version 5.1
# setup.ps1 - one-time setup for the HGS FDE harness.
#
# Verifies prerequisites, checks the harness layout, and refreshes
# .claude/skills/skills-practice from the practice asset repository if one is
# configured. Safe to re-run: a clean clone is fast-forwarded, and local edits
# are never overwritten (use /update-practice-skills inside Claude Code for a
# selective refresh).

$ErrorActionPreference = 'Stop'

$SkillsDir = '.claude/skills/skills-practice'
# Set this to the practice asset repository once it exists, or leave empty to
# treat the bundled skills-practice as canonical.
$RepoUrl   = ''

Set-Location -Path $PSScriptRoot

Write-Host 'HGS FDE harness - setup'
Write-Host ''

# --- prerequisites ---------------------------------------------------------
$missing = @()
foreach ($tool in 'git', 'uv', 'node', 'npm') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { $missing += $tool }
}
if ($missing.Count -gt 0) {
    Write-Host ("Missing prerequisites: {0}" -f ($missing -join ', '))
    Write-Host '  git  : https://git-scm.com/downloads'
    Write-Host '  node : https://nodejs.org/  (v24 or newer)'
    Write-Host '  uv   : https://docs.astral.sh/uv/  (needed to read PDF/Office documents)'
    Write-Host ''
}
else {
    Write-Host 'Prerequisites: git, node, npm, uv - present'
}

# Presence is not enough. Every documented command is a bare
# `node packages/derive/src/cli.ts ...`, which needs Node 24's default
# TypeScript stripping. On 22 those commands fail with a syntax error that
# looks like a bug in the harness rather than a version problem.
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeMajor = [int](node -p 'process.versions.node.split(".")[0]')
    if ($nodeMajor -lt 24) {
        $nodeVersion = node -v
        Write-Host ''
        Write-Host "Node $nodeVersion is too old. This harness needs v24 or newer."
        Write-Host "  Every 'node packages/derive/src/cli.ts ...' command runs TypeScript"
        Write-Host '  directly, with no build step. That is on by default from v24.'
        Write-Host ''
        exit 1
    }
    Write-Host ("Node {0} - OK" -f (node -v))
}

# --- layout check ----------------------------------------------------------
$required = @(
    'CLAUDE.md',
    '.claude/agents',
    '.claude/commands',
    '.claude/skills/skills-practice',
    '.claude/templates/engagement-init'
)
$bad = $required | Where-Object { -not (Test-Path $_) }
if ($bad) {
    Write-Host ("Layout incomplete - missing: {0}" -f ($bad -join ', '))
}
else {
    Write-Host 'Harness layout: OK'
}

foreach ($dir in 'engagements', 'deliverables', 'datasources') {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created $dir/"
    }
}

# --- dependencies ----------------------------------------------------------
# Lockfiles are committed and node_modules/ is gitignored, so a fresh clone has
# nothing installed and `npm test` fails on a missing typescript.
Write-Host ''
foreach ($pkg in 'packages/derive', 'apps/web') {
    if (Test-Path (Join-Path $pkg 'node_modules')) {
        Write-Host "$pkg - dependencies already installed"
    }
    else {
        Write-Host "Installing $pkg ..."
        Push-Location $pkg
        npm ci --silent
        Pop-Location
    }
}

# --- practice skills refresh ----------------------------------------------
Write-Host ''
if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
    Write-Host 'No practice asset repository configured - using the bundled skills-practice.'
    Write-Host 'Set $RepoUrl in this script once the practice repo exists.'
}
elseif (Test-Path -Path (Join-Path $SkillsDir '.git')) {
    $status = git -C $SkillsDir status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host 'skills-practice installed - refreshing...'
        git -C $SkillsDir pull --ff-only --quiet
        Write-Host 'Skills refreshed.'
    }
    else {
        Write-Host "Local edits detected in $SkillsDir - leaving them untouched."
        Write-Host 'Run /update-practice-skills inside Claude Code for a selective refresh.'
    }
}
else {
    Write-Host 'Installing practice skills...'
    git clone --quiet $RepoUrl $SkillsDir
    Write-Host "Skills installed to $SkillsDir."
}

Write-Host ''
Write-Host 'Next steps (see README.md):'
Write-Host '  1. Start Claude Code in this directory:  claude'
Write-Host '  2. Scaffold an engagement:               /init-engagement'
Write-Host '  3. Settle the evidence-handling terms and check the monitoring'
Write-Host '     constraint for the client jurisdiction. Capture is blocked until'
Write-Host '     the terms are signed, on purpose.'
Write-Host '  4. Then the loop: drop material in 02-Workflow/evidence/<class>/,'
Write-Host '     run /capture to turn it into proposed rows, accept them, and run'
Write-Host '     /next to see what to ask about tomorrow.'
