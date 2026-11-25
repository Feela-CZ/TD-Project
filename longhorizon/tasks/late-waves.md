# TD Pilot — solo progression after wave 40

Base commit: `e941fc2feb1dec7c43d193f7f0994c36d66b6760`

## Outcome

Find which measurable factors keep the strongest current solo plans from clearing the late waves. Return a short Czech recommendation backed by reproducible trials and a clear next test. Treat roughly one hour as a work budget. Stop earlier if the agreed report is complete.

## Known context

- The TD playtest uses a deterministic Node simulation and has browser verification for the playable game.
- The previous screen used twelve legal plans and four matched seeds per variant. Sustained Offense reached wave 53 in both variants. Raising kill rewards to 1.8× left much more unused Flux. Those are historical results, available in `reviews/TD_RESCUE_PLAYTEST.md`.
- Start from `scripts/alpha-balance.mjs`, the live engine, and the existing design records. Reuse the existing simulation and explain any added measurement. The source commit is the public test baseline. A separate turret graphics branch has no bearing on this experiment.

## Checks for completion

1. Reproduce the baseline with the existing build and test legal game states with normal starting Flux. Preserve enough metadata to rerun the measured comparisons.
2. Inspect damage output, Core Strain, and unused Flux for at least two legal plans. Compare one late-wave hypothesis on matched seeds and, time permitting, validate it on additional seeds. Distinguish a hypothesis from a measured result.
3. Write `reports/late-wave-pilot.md` with source SHA, commands, seeds, a small results table, limitations, and proposed next step. Save relevant evidence with it. Ask the reviewer to independently reproduce a reported result or state why they could not.
4. Keep this run experimental. Leave production game defaults and GitHub Pages alone. Work within the isolated TD checkout and return the report for review.
