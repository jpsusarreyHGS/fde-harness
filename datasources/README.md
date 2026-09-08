# datasources

Drop client input files here. **Read-only to the harness** — agents convert, extract and derive into the engagement folder, and never write back.

## Before anything lands here

**The evidence-handling terms must be settled.** Residency, retention, redaction, access, deletion, onward use — see `.claude/skills/skills-practice/evidence-handling/SKILL.md`, and record the agreed position in `engagements/<slug>/01-Discovery/evidence-handling-terms.md`.

Evidence captured or received under unresolved terms may have to be destroyed, and destroying discovery evidence means redoing discovery.

## Layout

```
datasources/<slug>/<source-system>/<file>
```

## Not committed

This directory is gitignored. Client data does not go into the repository, and a converted PDF is an unredacted copy of client material — convert into the engagement folder, read it, delete it.

## Binary documents

```bash
uv run --script --frozen scripts/convert_to_md.py "datasources/<slug>/<file>.pdf" --out "engagements/<slug>/01-Discovery/evidence/tmp.md"
```

The converter refuses to write anywhere under `datasources/`.
