"""Log in to the PoC JupyterHub as a Logto user without a browser, and start the server.

Walks the same redirects a browser would: hub -> Logto sign-in (Experience API with
username + password) -> hub callback. Then asks the hub to start the user's server.
    python3 hub_login.py alice
Prints the HTTP status of each step; exit code 0 when the server is running.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HUB = "http://localhost:8000"
LOGTO = "http://localhost:3001"
user = sys.argv[1]
password = os.environ.get("POC_USER_PASSWORD", "PocPassword-2026")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), NoRedirect)


def go(url, data=None, method=None, json_body=None):
    headers = {}
    if json_body is not None:
        data = json.dumps(json_body).encode()
        headers["content-type"] = "application/json"
    try:
        r = opener.open(urllib.request.Request(url, data, headers, method=method), timeout=30)
        return r.status, r.headers, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read().decode()


def follow(url, until):
    """Follow redirects by hand (cookies matter on both hosts) until `until` matches."""
    for _ in range(15):
        st, h, body = go(url)
        loc = h.get("location")
        if not loc or until(url):
            return url, st, body
        url = urllib.parse.urljoin(url, loc)
    sys.exit(f"too many redirects at {url}")


# 1. hub -> Logto authorize -> Logto sign-in page
url, st, _ = follow(f"{HUB}/hub/oauth_login", lambda u: "/sign-in" in u)
print("sign-in page:", st, url.split("?")[0])

# 2. Logto Experience API: sign in with username + password
st, _, _ = go(f"{LOGTO}/api/experience", method="PUT", json_body={"interactionEvent": "SignIn"})
print("start interaction:", st)
st, _, body = go(f"{LOGTO}/api/experience/verification/password", method="POST",
                 json_body={"identifier": {"type": "username", "value": user}, "password": password})
print("verify password:", st)
verification = json.loads(body)["verificationId"]
st, _, _ = go(f"{LOGTO}/api/experience/identification", method="POST",
              json_body={"verificationId": verification})
print("identify:", st)
st, _, body = go(f"{LOGTO}/api/experience/submit", method="POST", json_body={})
print("submit:", st)
redirect = json.loads(body)["redirectTo"]

# 3. back through Logto (consent is automatic for first-party apps) to the hub callback
url, st, body = follow(redirect, lambda u: u.startswith(HUB) and "oauth_callback" not in u)
print("hub after login:", st, url.split("?")[0])
if st == 403:
    print("hub refused the user (403):", "does not have the JupyterHub access role" in body)
    sys.exit(3)

# 4. start the server through the hub's spawn page, then wait until it answers
go(f"{HUB}/hub/spawn")
for _ in range(60):
    st, _, _ = go(f"{HUB}/user/{user}/api")
    if st == 200:
        break
    time.sleep(2)
print("server answering:", st == 200)
sys.exit(0 if st == 200 else 1)
