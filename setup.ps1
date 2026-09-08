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
foreach ($tool in 'git', 'uv') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { $missing += $tool }
}
if ($missing.Count -gt 0) {
    Write-Host ("Missing prerequisites: {0}" -f ($missing -join ', '))
    Write-Host '  git : https://git-scm.com/downloads'
    Write-Host '  uv  : https://docs.astral.sh/uv/  (needed to read PDF/Office documents)'
    Write-Host ''
}
else {
    Write-Host 'Prerequisites: git, uv - OK'
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
Write-Host '  3. Before any capture, settle the evidence-handling terms and check'
Write-Host '     the monitoring constraint for the client jurisdiction.'
