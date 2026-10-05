# [TEST standalone] gets a real Logto user token by exchanging the user's personal access token (used by test.sh)
"""Print a Logto access token for a PoC user by exchanging their personal access token.
usage: python3 token_exchange.py <alice|bob> [resource] [--claims]"""
import base64, json, os, sys, urllib.parse, urllib.request, urllib.error
who, resource = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "")
data = {"grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
        "subject_token": os.environ[f"POC_{who.upper()}_PAT"],
        "subject_token_type": "urn:logto:token-type:personal_access_token",
        # ask for every PoC scope; Logto grants only the ones the user holds
        "scope": os.environ.get("POC_SCOPES", "jupyter:hub db:jupyter_test db:jupyter_test_b")}
if resource: data["resource"] = resource
basic = base64.b64encode(f"{os.environ['POC_TESTER_ID']}:{os.environ['POC_TESTER_SECRET']}".encode()).decode()
req = urllib.request.Request("http://localhost:3001/oidc/token", urllib.parse.urlencode(data).encode(),
                             {"authorization": f"Basic {basic}", "content-type": "application/x-www-form-urlencoded"})
try: r = json.load(urllib.request.urlopen(req))
except urllib.error.HTTPError as e: sys.exit(f"token error {e.code} {e.read().decode()[:300]}")
t = r["access_token"]
if "--claims" in sys.argv:
    p = t.split(".")
    if len(p) != 3: print("OPAQUE"); sys.exit()
    c = json.loads(base64.urlsafe_b64decode(p[1] + "=" * (-len(p[1]) % 4)))
    print({k: c.get(k) for k in ("iss", "aud", "sub", "scope", "exp")})
else: print(t)
