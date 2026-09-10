#!/usr/bin/env bash
set -euo pipefail
# setup.sh — one-time setup for the HGS FDE harness.
#
# Verifies prerequisites, checks the harness layout, and refreshes
# .claude/skills/skills-practice from the practice asset repository if one is
# configured. Safe to re-run: a clean clone is fast-forwarded, and local edits
# are never overwritten (use /update-practice-skills inside Claude Code for a
# selective refresh).

SKILLS_DIR=".claude/skills/skills-practice"
# Set this to the practice asset repository once it exists, or leave empty to
# treat the bundled skills-practice as canonical.
REPO_URL=""

cd "$(dirname "$0")"

echo "HGS FDE harness — setup"
echo

# --- prerequisites ---------------------------------------------------------
missing=()
for tool in git uv node npm; do
  command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing prerequisites: ${missing[*]}"
  echo "  git  : https://git-scm.com/downloads"
  echo "  node : https://nodejs.org/  (v24 or newer)"
  echo "  uv   : https://docs.astral.sh/uv/  (needed to read PDF/Office documents)"
  echo
else
  echo "Prerequisites: git, node, npm, uv - present"
fi

# Presence is not enough. Every documented command is a bare
# `node packages/derive/src/cli.ts ...`, which needs Node 24's default
# TypeScript stripping. On 22 those commands fail with a syntax error that
# looks like a bug in the harness rather than a version problem.
if command -v node >/dev/null 2>&1; then
  node_major=$(node -p 'process.versions.node.split(".")[0]')
  if [[ "$node_major" -lt 24 ]]; then
    echo
    echo "Node $(node -v) is too old. This harness needs v24 or newer."
    echo "  Every 'node packages/derive/src/cli.ts ...' command runs TypeScript"
    echo "  directly, with no build step. That is on by default from v24."
    echo
    exit 1
  fi
  echo "Node $(node -v) - OK"
fi

# --- layout check ----------------------------------------------------------
bad=()
for p in CLAUDE.md .claude/agents .claude/commands "$SKILLS_DIR" .claude/templates/engagement-init; do
  [[ -e "$p" ]] || bad+=("$p")
done
if [[ ${#bad[@]} -gt 0 ]]; then
  echo "Layout incomplete — missing: ${bad[*]}"
else
  echo "Harness layout: OK"
fi

for dir in engagements deliverables datasources; do
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir"
    echo "Created $dir/"
  fi
done

# --- dependencies ----------------------------------------------------------
# Lockfiles are committed and node_modules/ is gitignored, so a fresh clone has
# nothing installed and `npm test` fails on a missing typescript.
echo
for pkg in packages/derive apps/web; do
  if [[ -d "$pkg/node_modules" ]]; then
    echo "$pkg - dependencies already installed"
  else
    echo "Installing $pkg ..."
    (cd "$pkg" && npm ci --silent)
  fi
done

# --- practice skills refresh ----------------------------------------------
echo
if [[ -z "$REPO_URL" ]]; then
  echo "No practice asset repository configured — using the bundled skills-practice."
  echo "Set REPO_URL in this script once the practice repo exists."
elif [[ -d "$SKILLS_DIR/.git" ]]; then
  if [[ -z "$(git -C "$SKILLS_DIR" status --porcelain)" ]]; then
    echo "skills-practice installed — refreshing…"
    git -C "$SKILLS_DIR" pull --ff-only --quiet
    echo "Skills refreshed."
  else
    echo "Local edits detected in $SKILLS_DIR — leaving them untouched."
    echo "Run /update-practice-skills inside Claude Code for a selective refresh."
  fi
else
  echo "Installing practice skills…"
  git clone --quiet "$REPO_URL" "$SKILLS_DIR"
  echo "Skills installed to $SKILLS_DIR."
fi

echo
echo "Next steps (see README.md):"
echo "  1. Start Claude Code in this directory:  claude"
echo "  2. Scaffold an engagement:               /init-engagement"
echo "  3. Settle the evidence-handling terms and check the monitoring"
echo "     constraint for the client jurisdiction. Capture is blocked until"
echo "     the terms are signed, on purpose."
echo "  4. Then the loop: drop material in 02-Workflow/evidence/<class>/,"
echo "     run /capture to turn it into proposed rows, accept them, and run"
echo "     /next to see what to ask about tomorrow."
