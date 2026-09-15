# Example engagements

Three sets of the material an FDE actually produces on a first visit — the
`/init-engagement` answers, and raw evidence to drop into the four class
folders. Nothing here is a filled-in instrument: **the point is to start where
a real engagement starts**, with notes and a transcript and an export, and let
the harness do the structuring.

They are fixtures, not clients. Every name, figure and quote is invented.

```bash
node scripts/load-example.mjs northwind-insurance
```

That scaffolds `engagements/<slug>/` from `vars.json` and copies the evidence
into place. Then work it exactly as you would a real engagement — `/capture`,
accept, `/next`.

## What each one is for

| | Client | Tests |
|---|---|---|
| **1** | **Northwind Insurance** — motor FNOL triage | The happy path, and the **documented-versus-observed gap**. The SOP says decline out-of-cover claims and return bad policy numbers to the broker; Ana escalates the first to a folder nobody is reading and sends the second to a colleague who "knows which of the legacy books it'll be in". Neither rule is written down anywhere |
| **2** | **Meridian Health** — prior-auth intake | **The monitoring constraint**, and a three-way contradiction. Works council, so capture needs consultation rather than notice. The policy says fax was retired in 2022 and the COO says "it all comes through Epic" — the shadowing opens with the fax queue and the system export shows 168 faxes a week. Documented and stated both wrong, observed and system both right |
| **3** | **Caldera Logistics** — freight exceptions | **The messy intake.** A `.vtt` transcript that needs converting, a photograph that needs a description pass, a note deliberately misfiled outside a class folder, and `TBD` answers that should raise open questions. Union site, undecided target platform |

## What you should expect to find

Each set contains real material for the things the method says matter, so the
coach has something to rank:

- **Exceptions with no named rule holder.** "I hand those to Dev", "that one
  goes to Dan", "ADR stuff is Yusuf" — three people carrying rules nobody has
  written down. This is the register the eval golden sets are later built from.
- **All four behavioural tells**, countable: re-keying, copy-paste between
  systems, tool switching, and dead time waiting on a slow system.
- **Undocumented knowledge stated out loud.** "Four hundred kilos a pallet
  unless it's drinks." "You just get a feel — the reference is shorter."
- **A queue nobody owns.** Each set has one: 11 claims waiting on a director
  who is on holiday, 26 requests in a folder called Chase, roughly 800
  amendments a month that never reach the system.
- **A dead end.** Work that goes somewhere nobody consumes.

## Using them to test a change

Two things worth checking after any change to templates or derivation:

1. **Caldera should refuse the misfiled note.** `cli.ts intake` exits 1 and
   names `MISFILED-note-from-dawn.txt`. If it ever silently classifies it, the
   evidence-class discipline has broken.
2. **Meridian should not let the SOP win.** A requirement sourced only from
   `documented/` or `stated/` is `UNVERIFIED`. If a fax-free workflow reaches
   the requirements register as verified, the weighting is wrong.
