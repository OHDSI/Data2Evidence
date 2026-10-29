# Contributing to Data2Evidence

Thank you for your interest in contributing to Data2Evidence (D2E).
Contributions of every size are welcome: bug reports, documentation, reviews,
answers to questions and code.

Everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md). Who
decides what, and how, is described in [GOVERNANCE.md](./GOVERNANCE.md).

## Questions, bugs and ideas

- Questions and general discussion go to
  [GitHub Discussions](https://github.com/OHDSI/Data2Evidence/discussions).
- Bugs go to [GitHub Issues](https://github.com/OHDSI/Data2Evidence/issues),
  with a clear title, the steps to reproduce, what you expected and what
  happened, and the version you use.
- Security issues are not reported in public issues. Use a private
  [security advisory](https://github.com/OHDSI/Data2Evidence/security/advisories/new)
  as described in [SECURITY.md](./SECURITY.md).
- Changes that affect more than one component, or everyone working on D2E, start
  as a D2E Enhancement Proposal. How that works is described in
  [rfcs/README.md](./rfcs/README.md).

Before opening an issue, check whether it already exists.

## Finding something to work on

Issues labelled
[good first issue](https://github.com/OHDSI/Data2Evidence/labels/good%20first%20issue)
and
[help wanted](https://github.com/OHDSI/Data2Evidence/labels/help%20wanted)
are a good start. If you start working on an issue, leave a comment so others
know.

New work is announced before it starts, as described in
[GOVERNANCE.md](./GOVERNANCE.md#across-components).

## Setting up D2E

How to install and run D2E is described in the
[getting started guide](https://data2evidence.org/docs/getting_started/).

## Making a change

1. Create a branch from `develop`. If you have write access to the repository,
   name it after your GitHub handle, `<github-handle>/<topic>`. Otherwise work
   on a fork.
2. Keep the change focused on one thing. A large change is easier to review as
   a series of smaller pull requests.
3. Add or update tests for the behaviour you change.
4. Update the documentation if users or administrators notice the change.
5. Sign your commits; the protected branches only accept signed commits.
6. Open a pull request against `develop`. Describe what changes and why, and
   link the issue it addresses (`Fixes #123`).

Pull requests are merged as a single squashed commit, so the title of the pull
request becomes the commit message.

## Review

Every pull request is reviewed by a code owner of the component it touches.
On top of that review, it needs three votes from core maintainers before it can
be merged. The rules are in [GOVERNANCE.md](./GOVERNANCE.md#merging).

- Reviewers aim to respond within a few working days. Reviewers and authors
  work in different time zones, so a day of waiting is normal. If a pull
  request waits longer, mention a code owner of the component.
- Answer each review comment, either with a change or with a reply.
- Review can be direct; it is about the code, never the person.

Anyone can review. Reviews from people who are not code owners are welcome and
are part of how contributors become code owners.

## Licence

D2E is licensed under the [Apache License 2.0](./LICENSE). By contributing, you
agree that your contribution is licensed under the same terms.
