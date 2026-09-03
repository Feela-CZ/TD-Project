# AUD-TD-ALPHA-001 — Audit receipt

**Case:** CASE-TD-ALPHA-001  
**Verdict:** CERTIFIED  
**Audit independence:** Confirmed; no artifacts were changed during audit.

## Certified facts

- DEC-TD-002 and CASE-TD-ALPHA-001 are consistent: the artifact is a local browser alpha against a deterministic bot.
- Independent review passed and records successful headless and alpha verification plus a local browser playthrough.
- The verified playable loop covers start/restart, valid and visibly rejected purchases, Overdrive, bot activity, 0.25-second projectiles, overload result, and restart after a terminal result.
- Current sources and emitted runtime artifacts are reproducibly aligned.
- No external engine, online service, packaging, multiplayer, or rebalance was introduced.

## Residual non-blocking risks

- There is no separate `tsc --noEmit` typecheck gate.
- The long terminal path is verified by deterministic integration rather than a full real-time manual playthrough.
- Raw run logs are not stored separately; the independent review and current artifact identities provide the retained evidence.
