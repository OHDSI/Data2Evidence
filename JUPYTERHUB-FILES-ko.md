# `services/jupyterhub/` 파일별 상세 설명

이 디렉터리에 5개 파일이 있습니다.

| 파일 | 줄 수 | 한 줄 요약 | Git |
| --- | --- | --- | --- |
| `Dockerfile` | 11 | 허브 이미지를 어떻게 만드는지 | 추적 |
| `jupyterhub_config.py` | 129 | **설정 전체. 이 PR의 핵심** | 추적 |
| `jupyterhub.env.example` | 38 | 선택적 튜닝 템플릿 | 추적 |
| `logto-role.py` | 147 | 역할 부여/회수/조회 도구 | 추적 |
| `.env` | 18 | 실제 값 (비밀키 포함) | **제외** (`**/.env*`) |

---

# 1. `Dockerfile` — 11줄

```dockerfile
FROM quay.io/jupyterhub/jupyterhub:5.4.2
```
**1행** — JupyterHub 공식 이미지. 버전을 고정했습니다. `latest` 를 쓰면 언젠가
말없이 동작이 바뀝니다.

```dockerfile
RUN python3 -m pip install --no-cache-dir \
    "dockerspawner==14.0.0" \
    "oauthenticator==17.4.0"
```
**3~5행** — 확장 2개 설치.
- `dockerspawner` : 유저별 노트북을 **도커 컨테이너로** 띄우는 모듈
- `oauthenticator` : **OIDC 로그인** 모듈. "JupyterHub에 OIDC 인증이 있냐"는 질문의
  답이 이것입니다. 공식 확장이고 별도 개발이 없습니다.

`--no-cache-dir` 은 pip 캐시를 이미지에 안 남겨서 크기를 줄입니다.
`==` 로 버전 고정 — 재빌드해도 같은 결과가 나오게.

```dockerfile
COPY jupyterhub_config.py /srv/jupyterhub/jupyterhub_config.py
```
**7행** — 설정 파일을 이미지 안에 복사. 설정을 볼륨 마운트가 아니라 이미지에
넣었기 때문에, **설정을 바꾸면 재빌드(`--build`)가 필요합니다.**

```dockerfile
WORKDIR /srv/jupyterhub
CMD ["jupyterhub", "--config", "/srv/jupyterhub/jupyterhub_config.py"]
```
**9~11행** — 작업 디렉터리 지정 후 허브 실행. `/srv/jupyterhub/data` 볼륨이 여기
아래에 마운트되어 DB와 쿠키 시크릿이 저장됩니다.

---

# 2. `jupyterhub_config.py` — 129줄

JupyterHub는 시작할 때 이 파이썬 파일을 **실행**합니다. `c` 객체에 값을 넣는 것이
설정입니다.

## 2.1 임포트 (1~2행)

```python
import os
from urllib.parse import quote
```
`os` 는 환경변수를 읽으려고, `quote` 는 로그아웃 URL을 만들 때 URL 인코딩에
씁니다 (96행).

## 2.2 `required_env()` (5~9행)

```python
def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value
```

**필수 환경변수를 읽되, 없으면 즉시 죽습니다.**

왜 이렇게 하나: 없는 값을 빈 문자열로 넘기면 허브가 **뜨긴 뜨는데 로그인이 이상하게
실패**합니다. 원인 찾기가 훨씬 어렵습니다. 차라리 시작할 때 변수 이름을 말하며
죽는 게 낫습니다.

`client_id`, `client_secret`, `oauth_callback_url`, `authorize_url`, `token_url`,
`LOGTO_ALLOWED_ROLE` 6개에 씁니다.

## 2.3 `granted_scopes()` (12~19행) — **가장 중요한 함수**

```python
def granted_scopes(auth_state: dict) -> list[str]:
    token_response = auth_state.get("token_response") or {}
    scopes = token_response.get("scope") or auth_state.get("scope") or []
    if isinstance(scopes, str):
        scopes = scopes.split()
    return [scope for scope in scopes if isinstance(scope, str)]
```

**Logto가 실제로 승인한 권한 목록 → JupyterHub 그룹 목록으로 변환합니다.**

| 줄 | 하는 일 |
| --- | --- |
| 15 | 토큰 응답 전체를 꺼냄. 없으면 빈 dict |
| 16 | 그 안의 `scope` 를 꺼냄. 없으면 `auth_state["scope"]` 를 대신 봄 (oauthenticator 버전에 따라 위치가 다름) |
| 17~18 | Logto는 `"a b c"` 형태 문자열로 주므로 공백으로 분리 |
| 19 | 문자열만 남기고 반환 |

로그인하면 Logto가 이런 응답을 줍니다:
```json
{"scope": "role.jupyteruser", "access_token": "...", "id_token": "..."}
```
이 함수가 `["role.jupyteruser"]` 를 반환하고, JupyterHub는 그 이름의 **그룹**에
유저를 넣습니다. 79행에서 연결됩니다.

**요청한 것이 아니라 승인된 것을 봅니다.** 요청은 아무나 할 수 있지만 승인은
Logto가 그 유저의 실제 역할을 보고 결정합니다.

## 2.4 설정 객체 (22행)

```python
c = get_config()  # noqa: F821 - provided by JupyterHub at runtime
```
`get_config()` 는 JupyterHub가 실행 시점에 주입하는 함수라 파일 안에 정의가
없습니다. 그래서 린터가 "정의 안 된 이름"이라고 경고하는데 `# noqa: F821` 로
끕니다.

## 2.5 기본 주소와 저장소 (24~30행)

```python
c.JupyterHub.bind_url = "http://0.0.0.0:8000"
```
**24행** — 웹 UI가 듣는 주소. `0.0.0.0` 은 컨테이너 안에서 모든 인터페이스.
외부 노출은 compose가 `127.0.0.1:8000:8000` 으로 제한합니다.

```python
c.JupyterHub.hub_bind_url = "http://0.0.0.0:8081"
```
**25행** — 8000은 사람이 쓰는 포트, **8081은 노트북 컨테이너가 허브에 보고하는
내부 포트**입니다. 둘은 용도가 다릅니다.

```python
c.JupyterHub.hub_connect_url = os.getenv("JUPYTERHUB_HUB_CONNECT_URL", "http://d2e-jupyterhub:8081")
```
**26~28행** — 노트북이 허브를 **어떤 주소로 부를지**. 노트북 입장에서
`localhost` 는 자기 자신이라 컨테이너 이름을 써야 합니다.

```python
c.JupyterHub.cookie_secret_file = "/srv/jupyterhub/data/jupyterhub_cookie_secret"
c.JupyterHub.db_url = "sqlite:////srv/jupyterhub/data/jupyterhub.sqlite"
```
**29~30행** — 둘 다 `/srv/jupyterhub/data` = 볼륨입니다. 컨테이너를 지워도 살아
남습니다. 쿠키 시크릿을 잃으면 전원 로그아웃되고, DB를 잃으면 유저·그룹이 사라져서
다음 로그인에 Logto로부터 다시 만들어집니다.

## 2.6 auth_state 보관 (33~37행)

```python
if os.getenv("JUPYTERHUB_CRYPT_KEY"):
    c.Authenticator.enable_auth_state = True
```
Logto 토큰을 **암호화해서** DB에 보관합니다. 키가 없으면 그냥 안 켭니다 (토큰을
평문으로 저장하지 않으려고).

나중에 노트북이 D2E API를 호출해야 할 때 필요한 값입니다. 지금은 보관만 합니다.

## 2.7 주기적 재검증 끄기 (39~48행)

```python
c.Authenticator.auth_refresh_age = 0
```

**한 줄이지만 설명이 9줄 붙어 있는 이유가 있습니다.**

JupyterHub는 기본적으로 300초마다 `refresh_user()` 를 불러 "이 사람 아직
유효한가" 를 확인합니다. 그런데 `oauthenticator` 의 그 함수가 **저장된** 토큰
응답을 다시 검사하고, `userdata_from_id_token` (60행)과 같이 쓰면 **저장된 id
토큰을 만료 검사까지 해서 디코딩**합니다.

로그인 후 약 1시간이 지나면 그 토큰이 만료되어 예외가 나는데, 감싸는 코드가 다른
종류의 예외만 잡아서 **500으로 빠져나가고 모든 요청이 거부**됩니다. refresh
token은 시도조차 되지 않습니다.

재현 → 수정 → 재검증한 결과:
```
수정 전: {'status': 403, 'message': 'Missing or invalid credentials.'}
수정 후: user: admin | groups: ['role.jupyteruser']
```

**인가는 이것에 의존하지 않습니다.** 82행이 매 로그인마다 역할을 다시 읽습니다.

## 2.8 OIDC 인증 설정 (50~64행)

```python
c.JupyterHub.authenticator_class = "generic-oauth"
```
**50행** — 인증 방식을 `oauthenticator` 의 `GenericOAuthenticator` 로 지정.

```python
c.GenericOAuthenticator.client_id     = required_env("LOGTO_JUPYTERHUB_CLIENT_ID")
c.GenericOAuthenticator.client_secret = required_env("LOGTO_JUPYTERHUB_CLIENT_SECRET")
```
**51~54행** — Logto에 등록된 앱의 ID와 비밀키. compose가 넘겨줍니다.

```python
c.GenericOAuthenticator.oauth_callback_url = required_env("JUPYTERHUB_OAUTH_CALLBACK_URL")
```
**55~57행** — Logto가 인증 후 **브라우저를 되돌려보낼 주소**.
Logto에 등록된 `redirectUris` 와 **글자 하나까지 같아야** 합니다. 다르면
`redirect_uri mismatch`. 그래서 compose에서 양쪽을 같은 변수로 만듭니다.

```python
c.GenericOAuthenticator.authorize_url = required_env("LOGTO_AUTHORIZE_URL")   # 58
c.GenericOAuthenticator.token_url     = required_env("LOGTO_TOKEN_URL")       # 59
```
**주소가 두 개인 이유** — 58행은 **브라우저**가 가는 곳(외부 접근 가능해야 함),
59행은 **허브 컨테이너**가 가는 곳(내부 주소면 충분, 인증서 불필요).

```python
c.GenericOAuthenticator.userdata_from_id_token = True
```
**60행** — 유저 정보를 별도 API 호출 없이 **id 토큰 안에서** 꺼냅니다. 호출이 하나
줄어듭니다.

부작용: 토큰의 발급자(`iss`)가 `http://d2e-caddy:8080/oidc` 라 브라우저가 접속한
주소와 다른데, oauthenticator가 **토큰을 Logto에서 직접 받았기 때문에** 서명 검증을
건너뛰고 `aud`(수신자)와 `exp`(만료)만 봅니다. OIDC 표준이 허용합니다
(Core 3.1.3.7.6).

```python
c.GenericOAuthenticator.username_claim = os.getenv("LOGTO_USERNAME_CLAIM", "username")
```
**61~63행 — 실제로 걸렸던 함정.** 처음엔 `preferred_username` 이었는데 로그인이
실패했습니다. Logto 1.23은 그 claim을 **discovery 문서에 광고만 하고 채우지
않습니다.** 실제 토큰:
```json
{"sub":"pjot55s095gl","username":"admin","email":null,"name":null}
```
`email` 과 `name` 도 null이라 대안이 없습니다. **`username` 이어야 합니다.**

```python
c.GenericOAuthenticator.login_service = "Data2Evidence"
```
**64행** — 로그인 화면 버튼 문구. JupyterHub가 `Sign in with {이 값}` 을 그립니다.
**"버튼이 어디서 나오냐"는 질문의 답이 이 한 줄입니다.**

## 2.9 요청할 권한 (65~77행)

```python
c.GenericOAuthenticator.scope = [
    "openid",          # OIDC 필수
    "profile",         # username 등 프로필 claim
    "email",
    "offline_access",  # refresh token 발급
    required_env("LOGTO_ALLOWED_ROLE"),   # ← role.jupyteruser
]
```
**65~71행** — Logto에 "이 권한들 주세요" 라고 요청하는 목록. 마지막 줄이 핵심입니다.

```python
c.GenericOAuthenticator.extra_authorize_params = {"resource": os.getenv("LOGTO_RESOURCE", "https://alp-default")}
c.GenericOAuthenticator.token_params           = {"resource": os.getenv("LOGTO_RESOURCE", "https://alp-default")}
```
**72~77행 — 빼먹으면 전원 거부되는 부분.**

Logto는 scope를 "API 리소스"에 묶어 관리합니다. 요청에 **어느 리소스인지 안 적으면
scope를 토큰에 넣어주지 않습니다.** 그러면 `granted_scopes()` 가 빈 목록을 반환하고,
그룹이 없으니 **권한 있는 사람도 전부 403**이 됩니다.

두 번 적는 이유: 인가 요청(`authorize`)과 토큰 교환(`token`) **양쪽 모두**에
필요합니다.

## 2.10 게이트 (78~82행) — **접근 통제 그 자체**

```python
c.GenericOAuthenticator.manage_groups         = True             # 78
c.GenericOAuthenticator.auth_state_groups_key = granted_scopes   # 79
c.GenericOAuthenticator.allowed_groups        = {required_env("LOGTO_ALLOWED_ROLE")}  # 80
c.GenericOAuthenticator.allow_all             = False            # 81
c.GenericOAuthenticator.allow_existing_users  = False            # 82
```

| 줄 | 의미 | 없으면 |
| --- | --- | --- |
| 78 | 그룹 관리를 인증기에 위임 | 79·80이 동작 안 함 |
| 79 | **2.3의 함수를 여기에 연결** | 그룹이 안 만들어짐 |
| 80 | 이 그룹 멤버만 허용 | 게이트 없음 |
| 81 | **기본 거부** | 인증만 되면 전원 통과 |
| 82 | 이미 아는 유저도 매번 재확인 | **권한 회수가 반영 안 됨** |

**82행이 데모의 핵심입니다.** 이게 `False` 라서, 권한을 회수하면 JupyterHub 내부
DB에 그 유저와 그룹이 남아 있어도 **다음 로그인에 거부**됩니다.

## 2.11 로그아웃 (85~102행)

```python
_end_session = os.getenv("LOGTO_END_SESSION_URL")
if _end_session:
    _post_logout = os.getenv(
        "JUPYTERHUB_POST_LOGOUT_REDIRECT_URL",
        required_env("JUPYTERHUB_OAUTH_CALLBACK_URL").replace("/hub/oauth_callback", "/hub/login"),
    )
    c.GenericOAuthenticator.logout_redirect_url = (
        f"{_end_session}"
        f"?client_id={quote(required_env('LOGTO_JUPYTERHUB_CLIENT_ID'))}"
        f"&post_logout_redirect_uri={quote(_post_logout, safe='')}"
    )
```

**85행** — 선택 기능이라 변수가 있을 때만 켭니다.
**87~92행** — 로그아웃 후 돌아올 주소. 지정 안 하면 콜백 URL에서
`/hub/oauth_callback` → `/hub/login` 으로 바꿔 씁니다.
**93~97행** — Logto의 `end_session` 주소를 조립. `quote(..., safe='')` 는 URL을
쿼리 파라미터에 넣기 위해 `:` `/` 까지 전부 인코딩합니다.

**정직하게 말해야 하는 부분**: 이걸 켜도 **Logto 계정 세션은 안 끊깁니다.** 이
앱의 승인만 해제되어 다음 로그인에 동의 화면이 다시 나올 뿐, 비밀번호는 안
묻습니다. 계정 세션을 끊으려면 `id_token_hint` 가 필요한데 **고정 주소로는 유저별
토큰을 실어 보낼 수 없습니다.** 완전한 단일 로그아웃은 미구현입니다.

```python
c.JupyterHub.shutdown_on_logout = (os.getenv("JUPYTERHUB_SHUTDOWN_ON_LOGOUT", "true").lower() == "true")
```
**99~102행** — 로그아웃하면 그 유저의 노트북 컨테이너를 정지시킵니다. 이건 **정상
동작합니다** (검증함). 안 하면 컨테이너가 계속 떠서 자원을 씁니다.

## 2.12 거부 메시지 (104~106행)

```python
c.GenericOAuthenticator.custom_403_message = (
    "Your D2E account is valid, but it does not have the JupyterHub access role."
)
```
권한 없는 유저가 보는 문구. **"로그인은 됐는데 권한이 없다"** 를 구분해서
알려줍니다. 기본 메시지는 그냥 403이라 유저가 비밀번호를 의심하게 됩니다.

## 2.13 노트북 생성 (108~127행)

```python
c.JupyterHub.spawner_class = "dockerspawner.DockerSpawner"
```
**108행** — 유저별 환경을 프로세스가 아니라 **컨테이너로** 만듭니다.

```python
c.DockerSpawner.image = os.getenv("JUPYTERHUB_NOTEBOOK_IMAGE", "quay.io/jupyterhub/singleuser:5.4.2")
```
**109~111행** — 노트북 이미지. 나중에 OHDSI R 패키지가 필요하면 여기를 바꿉니다.

```python
c.DockerSpawner.network_name = os.getenv("DOCKER_NETWORK_NAME", "jupyterhub-notebooks")
```
**112~117행 — 보안상 중요한 줄.** 노트북이 붙을 네트워크입니다.

원래 여기가 D2E 네트워크였는데, 노트북은 **유저가 원하는 코드를 그대로 실행하는
환경**이라 측정해보니 Postgres·Redis·Logto 관리 API에 전부 닿았습니다. 지금은 전용
네트워크에만 붙고, 거기엔 허브만 같이 있습니다.

```python
c.DockerSpawner.use_internal_ip = True
```
**118행** — 컨테이너 간 통신에 내부 IP 사용. 포트 매핑이 필요 없어집니다.

```python
c.DockerSpawner.remove = True
```
**119행** — 노트북 정지 시 컨테이너를 **삭제**합니다. 안 하면 정지된 컨테이너가
쌓입니다. 작업물은 볼륨에 있어서 안 사라집니다.

```python
c.DockerSpawner.notebook_dir = "/home/jovyan/work"
c.DockerSpawner.volumes = {"jupyterhub-user-{username}": "/home/jovyan/work"}
```
**120~123행** — `{username}` 이 자동 치환되어 **유저마다 별도 볼륨**이 생깁니다.
`jupyterhub-user-admin`, `jupyterhub-user-seolhwa` 처럼. 서로의 파일을 못 봅니다.

```python
c.DockerSpawner.mem_limit = os.getenv("JUPYTERHUB_USER_MEM_LIMIT", "1G")
c.DockerSpawner.cpu_limit = float(os.getenv("JUPYTERHUB_USER_CPU_LIMIT", "1"))
```
**124~125행** — 유저당 자원 상한. 한 사람이 VM 전체를 잡아먹는 것을 막습니다.

```python
c.Spawner.default_url = "/lab"
c.Spawner.start_timeout = 120
```
**126~127행** — 구형 Notebook 대신 **JupyterLab** 으로 진입. 120초 안에 컨테이너가
안 뜨면 실패 처리 (이미지를 미리 pull 해두라는 이유).

```python
c.JupyterHub.log_level = os.getenv("JUPYTERHUB_LOG_LEVEL", "INFO")
```
**129행** — 문제 추적 시 `DEBUG` 로 올립니다.

---

# 3. `jupyterhub.env.example` — 38줄

**이 파일은 선택사항입니다.** 복사하지 않아도 허브가 뜹니다.

## 왜 선택사항인가 (1~7행 주석)

허브가 **없으면 못 뜨는 값**(client id·secret, 콜백, Logto 주소, 역할)은 전부
`docker-compose-jupyterhub.yml` 이 파생시킵니다. 여기 있는 건 **튜닝용**뿐입니다.

이렇게 나눈 이유: 예전에는 비밀키를 두 군데 적어야 했고, 콜백 URL과 등록된 redirect
URI가 어긋날 수 있었습니다. 지금은 양쪽이 같은 변수에서 나오므로 **불일치가 구조적
으로 불가능**합니다.

## 항목별

| 변수 | 기본 동작 | 언제 바꾸나 |
| --- | --- | --- |
| `JUPYTERHUB_CRYPT_KEY` | 없으면 토큰 보관 안 함 | 노트북이 D2E API를 호출해야 할 때. `openssl rand -hex 32` |
| `LOGTO_RESOURCE` | `https://alp-default` | D2E의 `LOGTO__RESOURCE` 와 **반드시 일치**해야 함 |
| `LOGTO_USERNAME_CLAIM` | `username` | **바꾸지 말 것** (2.8 61행 참고) |
| `DOCKER_NETWORK_NAME` | `jupyterhub-notebooks` | **D2E 네트워크로 바꾸면 격리가 깨짐** |
| `JUPYTERHUB_NOTEBOOK_IMAGE` | 표준 singleuser | OHDSI R 패키지 등이 필요할 때 |
| `JUPYTERHUB_USER_MEM_LIMIT` / `CPU_LIMIT` | 1G / 1 | VM 사양에 맞게 |
| `JUPYTERHUB_LOG_LEVEL` | INFO | 디버깅 시 DEBUG |
| `LOGTO_END_SESSION_URL` | 미설정 | 로그아웃을 Logto까지 보내고 싶을 때 (2.11의 한계 읽고) |
| `JUPYTERHUB_POST_LOGOUT_REDIRECT_URL` | 콜백에서 파생 | Logto 앱에 등록돼 있어야 함 |
| `JUPYTERHUB_SHUTDOWN_ON_LOGOUT` | true | 로그아웃 시 컨테이너 정지 |

---

# 4. `logto-role.py` — 147줄

**왜 있나**: 이 스택은 Caddy 설정에서 **Logto 관리 화면을 주석 처리해 막아놨습니다.**
그래서 "누가 JupyterHub를 쓸 수 있나"를 정하는 그 하나의 작업을 할 UI가 없습니다.

`role.sh` 가 이걸 감싸는 래퍼입니다.

## 4.1 설정 상수 (32~34행)

```python
TOKEN_URL = os.getenv("LOGTO_OIDC_TOKEN_URL", "http://d2e-logto-1:3001/oidc/token")
ADMIN     = os.getenv("LOGTO_ADMIN_URL", "http://d2e-logto-1:3002")
ROLE      = os.getenv("LOGTO_ALLOWED_ROLE", "role.jupyteruser")
```

**포트가 두 개인 이유**: Logto는 `3001`(OIDC)과 `3002`(관리 API)를 **다른 포트로**
서빙합니다. 토큰은 3001에서 받고, 그 토큰으로 3002를 호출합니다.

전부 환경변수로 덮어쓸 수 있어서 다른 배포에도 씁니다.

## 4.2 `decode()` (37~44행)

```python
def decode(raw):
    if not raw.strip():
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw
```

**Logto가 일관성 없이 응답하기 때문에 있는 함수입니다.** 쓰기 작업에 201/204를
주면서 본문이 비어 있거나 JSON이 아닌 경우가 있습니다. 그냥 `json.loads()` 하면
거기서 죽습니다. 실제로 처음에 그 문제로 터졌습니다.

## 4.3 `call()` (47~63행)

```python
def call(url, data=None, method=None, headers=None, form=False):
    h = dict(headers or {})
    body = None
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            h["content-type"] = "application/x-www-form-urlencoded"
        else:
            body = json.dumps(data).encode()
            h["content-type"] = "application/json"
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, body, h, method=method), timeout=30)
        return r.status, decode(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
```

HTTP 호출 공통 함수. 포인트 세 개:

| | |
| --- | --- |
| `form=True` 분기 (51~53행) | **OAuth 토큰 엔드포인트는 JSON이 아니라 폼 인코딩**을 요구합니다. 관리 API는 JSON. 그래서 둘 다 지원 |
| `except HTTPError` (62~63행) | 4xx/5xx를 **예외가 아니라 반환값으로** 처리. 호출부에서 상태 코드로 분기할 수 있게 |
| `timeout=30` | 무한 대기 방지 |

표준 라이브러리만 씁니다 — `requests` 를 안 쓴 이유는 `python:3.12-alpine` 에
아무것도 설치하지 않고 바로 실행하기 위해서입니다.

## 4.4 `management_token()` (66~85행)

```python
cid    = os.environ["LOGTO_API_M2M_CLIENT_ID"]
secret = os.environ["LOGTO_API_M2M_CLIENT_SECRET"]
basic  = base64.b64encode(f"{quote(cid)}:{quote(secret)}".encode()).decode()
```
**67~71행** — M2M(Machine-to-Machine) 자격증명으로 **HTTP Basic 인증 헤더**를
만듭니다. `id:secret` 을 base64 인코딩하는 것이 Basic 인증의 형식입니다.
`quote()` 는 특수문자가 있을 때를 대비한 URL 인코딩입니다.

```python
st, body = call(TOKEN_URL, {
    "grant_type": "client_credentials",
    "resource": "https://default.logto.app/api",
    "scope": "all",
}, method="POST", headers={"authorization": f"Basic {basic}"}, form=True)
```
**72~82행** — 토큰 요청.
- `client_credentials` : 사람 없이 **프로그램이** 자기 자격으로 받는 방식
- `resource: https://default.logto.app/api` : Logto **관리 API** 용 토큰이라는 표시
- `scope: all` : 관리 API 전체 권한

```python
if st != 200:
    sys.exit(f"could not get a management token: {st} {body}")
return {"authorization": f"Bearer {body['access_token']}"}
```
**83~85행** — 실패하면 이유를 출력하고 종료. 성공하면 이후 호출에 쓸 헤더를 반환.

## 4.5 `find_role()` (88~95행)

```python
st, roles = call(f"{ADMIN}/api/roles", headers=auth)
for r in roles:
    if r["name"] == ROLE:
        return r["id"]
sys.exit(f"role {ROLE} does not exist in Logto")
```

역할 **이름**(`role.jupyteruser`)으로 **내부 ID**를 찾습니다. Logto API는 이름이
아니라 ID로 동작하기 때문입니다.

역할이 없으면 명확한 메시지로 종료합니다 — 시딩이 안 됐다는 뜻이라 사용자가 바로
알아챌 수 있게.

## 4.6 `find_user()` (98~107행)

```python
st, users = call(f"{ADMIN}/api/users?search={quote(username)}", headers=auth)
for u in users:
    if u.get("username") == username:
        return u["id"]
sys.exit(f"no user named {username}")
```

마찬가지로 유저명 → 유저 ID. `search` 는 **부분 일치**라서 여러 개가 올 수
있으므로, 105행에서 **정확히 일치하는 것만** 고릅니다. 안 그러면 `test` 를 찾다가
`test2` 를 건드릴 수 있습니다.

## 4.7 `main()` (110~143행)

```python
if len(sys.argv) < 2 or sys.argv[1] not in {"list", "grant", "revoke"}:
    sys.exit(f"usage: {sys.argv[0]} list | grant <username> | revoke <username>")
```
**111~112행** — 인자 검증. 오타를 조용히 무시하지 않습니다.

```python
auth    = management_token()
role_id = find_role(auth)
```
**114~115행** — 세 동작 모두 필요하므로 먼저 준비.

```python
if action == "list":
    st, users = call(f"{ADMIN}/api/roles/{role_id}/users", headers=auth)
    print(f"users holding {ROLE}:")
    for u in users:
        print(f"  {u.get('username')}  ({u['id']})")
    if not users:
        print("  (none)")
    return
```
**117~126행** — `GET /api/roles/{id}/users`. 아무도 없으면 `(none)` 을 찍습니다.
빈 출력이면 "명령이 실패한 건가?" 헷갈리니까요.

```python
username = sys.argv[2] if len(sys.argv) > 2 else sys.exit("username required")
user_id  = find_user(auth, username)
```
**128~129행** — `grant`/`revoke` 는 유저명이 필수.

```python
if action == "grant":
    st, body = call(f"{ADMIN}/api/users/{user_id}/roles", {"roleIds": [role_id]}, method="POST", headers=auth)
    print(f"grant {ROLE} to {username}: {st} {body if st >= 400 else 'ok'}")
else:
    st, body = call(f"{ADMIN}/api/users/{user_id}/roles/{role_id}", method="DELETE", headers=auth)
    print(f"revoke {ROLE} from {username}: {st} {body if st >= 400 else 'ok'}")
```
**131~143행** — 부여는 `POST`, 회수는 `DELETE`. 출력에서 성공이면 `ok`, 실패면
응답 본문을 보여줍니다.

실제 출력:
```
grant role.jupyteruser to jupyter_denied: 201 ok
revoke role.jupyteruser from jupyter_denied: 204 ok
```

---

# 5. `.env` — Git에서 제외됨

실제 값이 들어 있는 파일입니다. `.gitignore` 의 `**/.env*` 규칙으로 **커밋되지
않습니다.** 저장소에는 `jupyterhub.env.example` 만 있습니다.

현재 로컬 파일에는 18개 항목이 있는데, **그중 일부는 지금 무시됩니다.**

이유: `docker-compose-jupyterhub.yml` 의 `environment:` 블록이 `env_file` 보다
**우선순위가 높습니다.** 아래 6개는 compose가 덮어씁니다.

| 지금 무시되는 항목 | 어디서 오나 |
| --- | --- |
| `LOGTO_JUPYTERHUB_CLIENT_ID` | `${LOGTO__JUPYTERHUB__CLIENT_ID:-jupyterhub}` |
| `LOGTO_JUPYTERHUB_CLIENT_SECRET` | `${LOGTO__JUPYTERHUB__CLIENT_SECRET}` |
| `LOGTO_ALLOWED_ROLE` | `${LOGTO__JUPYTERHUB__ROLE:-role.jupyteruser}` |
| `JUPYTERHUB_OAUTH_CALLBACK_URL` | `${JUPYTERHUB__PUBLIC_URL}/hub/oauth_callback` |
| `LOGTO_AUTHORIZE_URL` | `${CADDY__D2E__PUBLIC_FQDN}` 기반 |
| `LOGTO_TOKEN_URL` | `${PROJECT_NAME}-caddy:8080` |

이 파일은 단순화 작업 **이전**에 만들어진 것이라 옛 항목이 남아 있습니다. 동작에는
문제가 없지만(compose가 덮어쓰므로), 혼란을 줄이려면 `jupyterhub.env.example` 기준
으로 다시 만드는 게 깔끔합니다.

VM에는 이 파일을 **절대 복사하지 않습니다.** 비밀키를 새로 생성해야 합니다.

---

# 부록: 파일 간 관계

```
docker-compose.yml           ← Logto에 역할·앱 등록 (D2E 쪽 유일한 변경)
        │  LOGTO__JUPYTERHUB__CLIENT_SECRET 하나로 켜짐
        ▼
docker-compose-jupyterhub.yml ← 허브·프록시·네트워크 정의
        │  필수 값 6개를 파생시켜 환경변수로 전달
        ▼
Dockerfile                    ← 이미지 빌드, 설정 파일 포함
        ▼
jupyterhub_config.py          ← 환경변수를 읽어 실제 동작 결정
        │  granted_scopes() 로 권한 → 그룹 변환
        ▼
게이트 통과 → DockerSpawner → 노트북 컨테이너

(별도 경로)
role.sh → logto-role.py → Logto 관리 API → 역할 부여/회수
```
