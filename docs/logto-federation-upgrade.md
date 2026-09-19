# Upgrading an installation that uses Logto

From this release trex is D2E's identity provider. New installations use it
alone. An installation that already has users in Logto keeps them.

## What happens on upgrade

`d2e start` notices that your env file predates trex and records
`D2E_IDP_MODE=logto-federated`, adding the trex settings it lacks. From then on
the stack starts with `docker-compose-logto-federation.yml`:

- Logto keeps running, as an upstream sign-in option of trex.
- The sign-in page shows only **Sign in with Logto**. Users carried over from
  Logto have no trex password, so trex's own password sign-in is switched off
  (`TREX_NATIVE_PASSWORD_LOGIN_ENABLED=false`): the form is hidden and trex
  refuses the password grant. Set it to `true` in your env file to bring the
  form back, for example to let a trex-native admin in while Logto is down.
- With Logto as the only way in, the sign-in page does not wait for a click: it
  sends the browser straight to Logto. It stays up when trex has just refused a
  sign-in (so the reason is shown), when the browser came back within a few
  seconds of the last redirect (so a misconfiguration cannot loop), and when the
  address carries `manual` (`/d2e-login/?manual`).
- Accounts without an email address sign in too: Logto users that have only a
  username are linked by their Logto identity, which needs no address.
- On every start, trex migrates Logto users: each usermgmt user gets a trex
  account linked to their Logto identity, and their D2E roles are copied to
  trex.

Users sign in exactly as before, through Logto. Nothing needs resetting.

### Users keep their subject

A migrated user's trex account has the same id as their Logto user, so the
tokens trex issues carry the same `sub` as the ones Logto issued. Everything
D2E keys by that subject carries over unchanged: WebAPI users with their
cohorts and other ownership, portal artifacts, flows, analyses and concept
mappings. usermgmt keeps the Logto id too.

This needs a trex that supports linking with an explicit user id. A trex
without it gives each account a new id instead; the migration refuses those
links, reports the users as `subject_would_change` and marks the `link` step
failed (or partial), and copies no roles to them, so nobody silently loses
their work. Upgrade trex and restart.

If an earlier build of the migration already moved usermgmt users to new trex
ids, the `rekey` step moves them back to their Logto id on the next start,
provided trex links them under that id.

## Checking the migration

    d2e migrate-idp-roles --report

lists each step and any user that was skipped with the reason:

- `duplicate_email`: two users resolve to the same account email.
- `email_linked_elsewhere`: trex refused the link because the Logto identity is already linked to, or its email already belongs to, a different trex user (the detail names that user).
- `no_email`: the Logto user has neither an email nor a username.
- `logto_origin_missing`: the user's subject-history chain ends at a Logto id that no longer exists in `logto.users`.
- `link_failed`: trex could not link the Logto identity to the account.
- `subject_would_change`: trex linked the identity under a different user id (the detail names it) instead of the Logto id, so the user would sign in under a new subject. The link is not counted and no roles are copied. This means trex does not support explicit-id linking; upgrade it.
- `role_failed`: the user's D2E roles could not be copied to trex.
- `rekey_failed`: the usermgmt record could not be aligned with the trex user id (only happens for a record an earlier build moved to a new id).

Fix the data, then run `d2e migrate-idp-roles --run` or restart.

A `link` step marked **failed** with no users listed means the migration could
not read any Logto users even though usermgmt still holds users with an IdP
subject. `logto.users` is protected by row-level security that only Logto's own
database role gets past, so the migration reads it as that role:
`PG__LOGTO_MANAGER_USER` (default `logto_postgres`) and
`PG__LOGTO_MANAGER_PASSWORD`, the same values the Logto container uses. Check
that both are set in your env file. The link line in the trex log also says
`nothing was linked` when no usermgmt user's subject points at a Logto
identity; the report's `notLogto` count gives the number of those users.

The migration only links users that already have a usermgmt record: it walks
`usermgmt."user"`, not Logto's user list. A person created directly in Logto
after the upgrade has no usermgmt row, so they are never linked and cannot
sign in, on any start. Create new users in D2E user management instead — that
creates the usermgmt row and, from there, a trex account is linked to them (or
created for them) the same way as everyone else. Note that `--run` restarts
trex, so anyone signed in at the time is signed out; only `--run` in federated
mode does this, `--report` never restarts anything.

## Roles

After the upgrade D2E manages roles in trex. Changing a role in Logto has no
effect; change it in D2E's user management.

## Suspending a user

Logto stays the source of truth for suspension while federated: trex's link
never rewrites an existing link's email, and only ever applies `banned: true`,
never `false` (verified against trex, OHDSI/trex#318). So if you unban someone
in trex, the next restart reapplies the suspension as long as they are still
suspended in Logto. To actually let them back in, un-suspend them in Logto,
not only in trex.

## Leaving Logto

Set `D2E_IDP_MODE=trex` in the env file and restart. Logto stops and the button
disappears. For a user without a trex password, an administrator sets one in
user management. Account links are kept, so setting the mode back restores
Logto sign-in.
