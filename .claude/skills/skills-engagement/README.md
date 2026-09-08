# skills-engagement

Client-calibrated skills for **this engagement only**.

## What belongs here

Anything true of this client and not of clients generally:

- Their vocabulary where it diverges from the practice's default terms
- Their system quirks — the API that lies about its rate limit, the export that silently truncates, the field that means something different after 2023
- Their constraints — data residency, change windows, approval chains, release calendars
- Their gotchas — anything that cost an FDE more than an hour to work out and would cost the next one the same

## The supersede rule

When a skill here and a skill in `skills-practice/` cover the same topic, **this one wins for practice on this engagement.** Agents read both and prefer these values where they disagree — and say so in their output, so a reader knows which rule applied.

## What does not belong here

- **Anything reusable across clients.** That is a `skills-practice/` skill. If you find yourself writing something generic here, write it there instead.
- **Client secrets.** Credentials, tokens, connection strings. Record *where* they live in `chronicle/memory/environment.md`, never the values.
- **Engagement artefacts.** Requirements, evidence, decisions and designs live in `engagements/<client>/`. This directory holds *method*, not *findings* — the boundary rule in `CLAUDE.md` applies.

## At engagement close

`harness-improver` in `engagement-close` mode scans this directory for skills whose content is not actually client-specific and proposes promoting them — generalised, with all identifying material stripped — to `skills-practice/`.

That pass is how the practice compounds. A skill that stayed here when it could have been generalised is a lesson HGS paid for once and will pay for again.
