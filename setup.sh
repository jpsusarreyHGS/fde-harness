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
for tool in git uv; do
  command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing prerequisites: ${missing[*]}"
  echo "  git : https://git-scm.com/downloads"
  echo "  uv  : https://docs.astral.sh/uv/  (needed to read PDF/Office documents)"
  echo
else
  echo "Prerequisites: git, uv — OK"
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
echo "  3. Before any capture, settle the evidence-handling terms and check"
echo "     the monitoring constraint for the client jurisdiction."
