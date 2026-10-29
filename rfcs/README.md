# D2E Enhancement Proposals (D2E EPs)

A D2E EP is a short written proposal for a change that affects more than one
component, or everyone working on D2E. It is discussed and decided as a pull
request to this directory, so the reasons for a decision stay next to the code.

Who decides which kind of change is set out in
[GOVERNANCE.md](../GOVERNANCE.md#across-components). This document describes
how a D2E EP is written, discussed and decided.

## When a D2E EP is needed

A D2E EP is needed for the changes listed in the table in
[GOVERNANCE.md](../GOVERNANCE.md#across-components). Changes that stay inside one
component do not need one; the component's code owners decide them in the pull
request.

When in doubt, ask in an issue or write a short D2E EP. A D2E EP can be one
page.

## Types

| Type | Covers |
|---|---|
| *Standards* | APIs, REST and plugin interfaces, config formats, data model, CDM handling, database schema |
| *Architecture* | New services, plugins, repositories, shared runtime dependencies, replacing or adding a central component |
| *Product* | Database dialects, stopping a feature, support commitments |
| *Process* | `GOVERNANCE.md`, `CONTRIBUTING.md`, `RELEASE.md`, review and approval rules |

## Lifecycle

1. Draft. Copy the [template](#template) to `rfcs/0000-short-title.md` and open
   a pull request as a draft. Rename the file to the pull request number once
   it is known, for example `rfcs/1234-short-title.md`.
2. Discussion. Mark the pull request ready for review. The discussion is open
   for at least 7 calendar days, so that every time zone and a weekend are
   covered. Comments go on the pull request; changes to the text are commits
   to it, so the history shows how the proposal moved. The roles to be
   consulted are mentioned in the pull request description, which notifies
   them.
3. Decision. If no binding objection is raised within the 7 days, the D2E EP
   is accepted. A binding objection must give a technical reason and can come
   from the people named in
   [GOVERNANCE.md](../GOVERNANCE.md#across-components). If it cannot be
   resolved on the D2E EP, it is decided as set out there, with the reasons
   written down. The decision is recorded in the D2E EP's status and in a
   closing comment.
4. Merge or close. Accepted D2E EPs are merged with status *Accepted*. Rejected
   and withdrawn ones are closed with the decision in the last comment.
   Postponed ones are merged with status *Postponed*, so they can be picked up
   later.

Once the change is implemented, the status moves to *Final*. A later D2E EP
that replaces an earlier one sets the earlier one to *Superseded by D2E EP-n*.

Statuses: *Draft*, *Accepted*, *Rejected*,
*Postponed*, *Withdrawn*, *Final*, *Superseded by D2E EP-n*.

Accepted D2E EPs can be changed later only through a new D2E EP, except for
corrections that do not change the decision.

## Announcing new work

Not every piece of work needs a D2E EP, but new work is announced before it
starts, as described in [GOVERNANCE.md](../GOVERNANCE.md#across-components).
Work that turns out to need a D2E EP gets one before it merges.

## Template

```markdown
---
d2e-ep: 0000
title: Short title
type: Standards | Architecture | Product | Process
status: Draft
author: '@github-handle'
consulted: '@github-handle, ...'
created: YYYY-MM-DD
---

## Summary
One paragraph.

## Motivation
The problem, who has it, and the evidence.

## Proposal
What changes: interfaces, data model, behaviour.

## Alternatives
Including doing nothing.

## Compatibility
Migration, deprecation and the upgrade path.

## Security and privacy
Patient data, authentication, threat model.

## Operations
Deployment, configuration, Helm values, observability.

## Testing
How we know it works, and on which database dialects.

## Ownership
Which team owns the result.

## Unresolved questions
```
