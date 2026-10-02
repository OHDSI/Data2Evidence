#!/bin/sh
# Browserless tests: get real Logto user tokens by exchanging each user's personal
# access token, then connect to PostgreSQL with them through the validator.
#   sh test.sh
set -u
cd "$(dirname "$0")"
set -a; . ./.env.poc; set +a

conn="host=localhost dbname=poc user=jupyter_test oauth_issuer=http://localhost:3001/oidc oauth_client_id=$POC_DEVICE_CLIENT_ID"
pass=0; fail=0

token() { python3 token_exchange.py "$1" https://pg.poc; }

# run SQL with a token inside the pg18 container; prints first row or the error
run() {
  out="$(docker compose exec -T -e PGOAUTHDEBUG=UNSAFE pg18 oauth_conn_test "$conn" "$2" "$1" 2>&1)"
  # multi-line errors end with a caret line; show the error line itself
  printf '%s\n' "$out" | grep -m1 -i -E 'error|failed|denied' || printf '%s\n' "$out" | tail -1
}

check() {  # name, expected (ok|deny), output
  case "$2:$3" in
    ok:*error*|ok:*denied*|ok:*failed*) r=FAIL ;;
    ok:*) r=PASS ;;
    deny:*error*|deny:*denied*|deny:*failed*) r=PASS ;;
    *) r=FAIL ;;
  esac
  [ "$r" = PASS ] && pass=$((pass + 1)) || fail=$((fail + 1))
  printf '%-4s %-52s %s\n' "$r" "$1" "$3"
}

alice="$(token alice)"
bob="$(token bob)"

check "A  alice logs in, identity is her Logto sub" ok "$(run "$alice" "select system_user, current_user")"
check "B  bob (no jupyter-test role) is refused" deny "$(run "$bob" "select 1")"
check "C  alice reads allowed.demo" ok "$(run "$alice" "select count(*) || ' rows' from allowed.demo")"
check "D1 alice reads allowed.hidden (same schema, no grant)" deny "$(run "$alice" "select * from allowed.hidden")"
check "D2 alice reads secret.demo (other schema)" deny "$(run "$alice" "select * from secret.demo")"
check "D3 alice inserts into allowed.demo" deny "$(run "$alice" "insert into allowed.demo values (9, 'x') returning id")"
check "D4 alice creates a table" deny "$(run "$alice" "create table allowed.t(id int); select 1")"
check "F  a made-up token is refused" deny "$(run "not-a-real-token" "select 1")"

# the token decides the schema: carol holds jupyter-test-b, so only jupyter_test_b opens
carol="$(token carol)"
conn_b="host=localhost dbname=poc user=jupyter_test_b oauth_issuer=http://localhost:3001/oidc oauth_client_id=$POC_DEVICE_CLIENT_ID"
run_b() {
  out="$(docker compose exec -T -e PGOAUTHDEBUG=UNSAFE pg18 oauth_conn_test "$conn_b" "$2" "$1" 2>&1)"
  printf '%s\n' "$out" | grep -m1 -i -E 'error|failed|denied' || printf '%s\n' "$out" | tail -1
}
check "H1 carol as jupyter_test_b reads schema_b.demo" ok "$(run_b "$carol" "select label from schema_b.demo")"
check "H2 carol as jupyter_test_b reads allowed.demo" deny "$(run_b "$carol" "select * from allowed.demo")"
check "H3 carol tries to log in as jupyter_test" deny "$(run "$carol" "select 1")"
check "H4 alice tries to log in as jupyter_test_b" deny "$(run_b "$alice" "select 1")"
check "F2 password login as jupyter_test is refused" deny "$(docker compose exec -T pg18 sh -c \
  "PGPASSWORD=x psql -h localhost -U jupyter_test -d poc -Atc 'select 1'" 2>&1 | tail -1)"

echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ]
