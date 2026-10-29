# D2E Governance

This document describes who decides what in D2E and how. Work and decisions
happen in writing, code owners decide inside their components, and the Chief
Architect has the final technical say.

How to contribute code is in [CONTRIBUTING.md](./CONTRIBUTING.md); how proposals
work is in [rfcs/README.md](./rfcs/README.md); releases are in
[RELEASE.md](./RELEASE.md). This document is changed only through a *Process*
D2E EP (see [Changing this document](#changing-this-document)).

## Principles

1. Work is proposed, reviewed and decided on GitHub: in issues, pull requests,
   Discussions and D2E EPs. Decisions are written down with their reasons.
2. Code owners decide inside their component. Only questions that cross
   components, or affect everyone, are decided centrally.
3. Most questions settle without a vote: if nobody objects with a reason by the
   stated deadline, the proposal stands.
4. Every change is reviewed by a code owner of the component it touches.
5. Rights follow roles and contribution, not job titles.
6. Regressions are reverted first and discussed second.

## Roles

| Role | What it may do | How someone gets it | How it ends |
|---|---|---|---|
| Contributor | Open issues, pull requests and D2E EPs; comment and review | Anyone with a GitHub account | — |
| Code owner | Approving review and decisions for the paths of a component | Working on the component; proposed by a code owner of it, confirmed by the Chief Architect | Inactive for 6 months, stepping down, or by decision of the Chief Architect with reasons |
| Core maintainer | Votes on every pull request to `develop` | Named by the Chief Architect from experienced code owners | Inactive for 6 months, stepping down, or by decision of the Chief Architect with reasons |
| Chief Architect | See [Chief Architect](#chief-architect) | — | — |
| Product Manager | Decides *Product* D2E EPs | — | — |
| Steering Board | Decides disagreements between the Product Manager and the Chief Architect | — | — |

New engineers spend their first month with a mentor and start working on their
components during that month. Becoming a code owner follows from that work;
there is no fixed date.

### Where roles are recorded

- Code owners: `.github/CODEOWNERS.src` maps each path to a GitHub team,
  `.github/CODEOWNERS.teams` lists the members of each team, and
  `.github/CODEOWNERS.sh` generates `.github/CODEOWNERS`. Paths without an
  entry fall to `@data2evidence/core`. Every path has at least two code owners,
  so someone can always step in. A comment above each component marks its
  status (*Supported*, *Maintained*, *Odd Fixes*, *Orphan* or *Obsolete*) and
  whether it is core or critical.
- Core maintainers: the `REQUIRED_APPROVERS` list in
  `.github/workflows/pr-approval.yml`.
- Chief Architect, Product Manager and Steering Board: listed at the end of this
  document.

A role change is a pull request to the file that records it, so the history
shows who changed what and when.

## Chief Architect

The Chief Architect decides:

- Architecture across components, the core engine and the shared architecture
  plan. The plan is written down in `docs/architecture/` and kept current;
  every *Architecture* and *Standards* D2E EP refers to it, so every
  architecture change is seen before it is built.
- The engineering process: reviews, code owners, approval rules and the
  release process, through *Process* D2E EPs.
- Who owns which component.
- Whether a release is ready to ship, when that is contested.
- Technical questions code owners cannot settle, and D2E EPs that lazy
  consensus does not settle, with the reasons written down.

If the Chief Architect is unavailable, the core maintainers take these
decisions by majority until the Chief Architect is available again or the role
is filled.

## How decisions are made

### Inside a component

The component's code owners decide everything that stays inside the
component. If they disagree, the Chief Architect decides.

### Across components

| Change | D2E EP needed | Who decides |
|---|---|---|
| Bug fix, refactor or feature inside one component | No | The component's code owners |
| New or changed API, REST, plugin interface or config format | Yes, *Standards* | Code owners of the affected components; the Chief Architect if they disagree |
| Data model, CDM handling or database schema | Yes, *Standards* | Chief Architect, after discussion on the D2E EP |
| New service, plugin, repository, or a runtime dependency shared across components | Yes, *Architecture* | Chief Architect, after discussion on the D2E EP |
| Replacing or adding a central component | Yes, *Architecture* | Chief Architect, after discussion on the D2E EP, Product Manager and Steering Board consulted |
| Adding or dropping a database dialect, stopping a feature, support commitments | Yes, *Product* | Product Manager, Chief Architect consulted |
| This document, `CONTRIBUTING.md`, `RELEASE.md`, review or approval rules | Yes, *Process* | Chief Architect, after discussion on the D2E EP, Product Manager and Steering Board consulted |

A D2E EP is open for discussion for at least 7 calendar days, so that every
time zone and a weekend are covered. A shepherd (a code owner other than the
author) proposes a disposition: accept, reject or postpone. A final comment
period of 7 days follows. If no binding objection is raised, the disposition
stands.

Consulted means: notified when the D2E EP is opened, with the chance to raise
objections during the discussion period. Objections are answered on the D2E EP;
the decision stays with the role that decides.

A binding objection must give a technical reason. It can come from a code owner
of an affected component, the Chief Architect, or, for *Product* D2E EPs, the
Product Manager. If it cannot be resolved on the D2E EP, the Chief Architect
decides within 5 working days and writes down why.

New work is announced before it starts, in GitHub Discussions (Announcements),
in three lines: what, why, who. Announcing is enough to start; no approval is
needed. Work that turns out to need a D2E EP gets one before it merges.

### Escalation

If the Product Manager and the Chief Architect disagree, either of them writes
up the question on an issue with both positions. The Steering Board decides and
records the decision and its reasons on that issue.

If the Product Manager is unavailable, the core maintainers take the Product
Manager's decisions by majority until the Product Manager is available again or
the role is filled.

## Merging

- Every pull request needs an approving review from a code owner of the paths
  it touches, as the branch ruleset requires. Nobody approves their own pull
  request.
- On top of the review, the pull request needs three votes from core
  maintainers: a thumbs-up on the pull request. A thumbs-down from a core
  maintainer takes one vote away; whoever gives it says why in a comment. The
  `check-vote` workflow (`.github/workflows/pr-approval.yml`) counts the votes
  and blocks the merge until there are enough.
- `develop`, `main` and `release/*` take changes only through pull requests and
  the merge queue, with squash merges, signed commits and the required checks.
- An urgent fix may be merged first and reviewed afterwards.

## Releases

The release calendar and process are in [RELEASE.md](./RELEASE.md). An
objection to shipping needs a reproducible regression. If "ready to ship" is
contested, the Chief Architect decides.

## Security

Security reports go to a private GitHub security advisory, not to issues. A
security team of at least two code owners triages, fixes in a private fork and
coordinates disclosure, as described in [SECURITY.md](./SECURITY.md). This is
the only engineering work done outside the repositories, and it is published
with the advisory.

## Code of conduct

Everyone follows the [Code of Conduct](./CODE_OF_CONDUCT.md), which adopts the
[Contributor Covenant, version 1.4](https://www.contributor-covenant.org/version/1/4/code-of-conduct/).
Review can be direct; it is about the code, never the person. Reports go to the
contacts named there.

## Changing this document

This document is changed by a *Process* D2E EP, decided by the Chief Architect
after discussion, with the Product Manager and the Steering Board consulted.

## Current role holders

| Role | Holder |
|---|---|
| Chief Architect | @<github-handle> |
| Product Manager | @<github-handle> |
| Steering Board | @<github-handle> |
| Security team | @<github-handle>, @<github-handle> |
