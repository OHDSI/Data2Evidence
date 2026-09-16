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

A user added in Logto after the upgrade can sign in after the next start, or
straight away after `d2e migrate-idp-roles --run`. Note that `--run` restarts
trex, so anyone signed in at the time is signed out; only `--run` in federated
mode does this, `--report` never restarts anything.

## Roles

After the upgrade D2E manages roles in trex. Changing a role in Logto has no
effect; change it in D2E's user management.

## Leaving Logto

Set `D2E_IDP_MODE=trex` in the env file and restart. Logto stops and the button
disappears. Users without a trex password use password reset. Account links are
kept, so setting the mode back restores Logto sign-in.
