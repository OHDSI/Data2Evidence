# Upgrading an installation that uses Logto

From this release trex is D2E's identity provider. New installations use it
alone. An installation that already has users in Logto keeps them.

## What happens on upgrade

`d2e start` notices that your env file predates trex and records
`D2E_IDP_MODE=logto-federated`, adding the trex settings it lacks. From then on
the stack starts with `docker-compose-logto-federation.yml`:

- Logto keeps running, as an upstream sign-in option of trex.
- The sign-in page shows **Sign in with Logto** next to the password form.
- On every start, trex migrates Logto users: each usermgmt user gets a trex
  account linked to their Logto identity, their D2E roles are copied to trex,
  and their usermgmt record is re-keyed to the trex account.

Users sign in exactly as before, through Logto. Nothing needs resetting.

## Checking the migration

    d2e migrate-idp-roles --report

lists each step and any user that was skipped with the reason:

- `duplicate_email`: two users resolve to the same account email.
- `email_linked_elsewhere`: the email already belongs to a trex account linked to another Logto user.
- `no_email`: the Logto user has neither an email nor a username.
- `logto_origin_missing`: the user's subject-history chain ends at a Logto id that no longer exists in `logto.users`.
- `link_failed`: trex could not link the Logto identity to the new account.
- `role_failed`: the user's D2E roles could not be copied to trex.
- `rekey_failed`: the usermgmt record could not be re-keyed to the trex account.

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
