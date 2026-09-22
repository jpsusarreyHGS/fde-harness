---
description: Any time. Like `git --help` for the harness — every slash command in stage order with what it is for, read from the command files themselves so it cannot drift. Given an engagement, also says where you are and the next one to three commands to run, each with the reason, derived from the same state the dashboard renders. (`/help` is taken by Claude Code itself.)
allowed-tools: Read Bash
---

Run it and print the output **verbatim** — do not summarise, reorder or "improve" it. It is generated from the command files and the engagement's derived state, and an FDE reading it should see the same thing every time.

With an engagement (the usual case):

```bash
node packages/derive/src/cli.ts commands engagements/<slug>
```

Without one — a fresh clone, or just the list:

```bash
node packages/derive/src/cli.ts commands
```

If the operator asks "what should I do next?" and there is an engagement, this is the answer before `/next` is: `/commands` says which *command* comes next and why; `/next` says which *conversation*. If the "NEXT, IN ORDER" reasoning looks wrong, the fix is in the engagement files it read (material waiting, rows accepted, gate status) — say which fact it rested on rather than overriding the order.
