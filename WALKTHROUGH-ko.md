# MIM-7 JupyterHub — 설명용 자료

발표할 때 이 순서대로 가면 됩니다. 각 파일이 왜 있는지 → 줄 단위로 무엇을 하는지 →
명령어가 무슨 일을 하는지 → 데모.

---

## 0. 먼저 한 문장으로

> **JupyterHub를 기존 D2E 계정으로 로그인하게 만들고, Logto에서 `role.jupyteruser`
> 권한을 받은 사람만 들여보냅니다. D2E 쪽에서 바뀐 건 `docker-compose.yml` 한
> 파일이고, JupyterHub를 안 켜면 기존 배포에는 아무 영향이 없습니다.**

DB 접근은 이번 범위가 아닙니다 (뒤의 9장).

---

## 1. 전체 그림 — 로그인할 때 실제로 벌어지는 일

```
 브라우저
   │ ① http://localhost:8000 → "Sign in with Data2Evidence" 클릭
   ▼
 JupyterHub
   │ ② "이 사람 누군지 모름. Logto에 물어봐" → 브라우저를 Logto로 보냄
   │    https://localhost/oidc/auth?client_id=...&scope=...
   ▼
 Logto (D2E 것 그대로)
   │ ③ 유저가 로그인 + 동의
   │ ④ "이 사람 맞다"는 증표(code)를 들려 브라우저를 되돌려보냄
   │    http://localhost:8000/hub/oauth_callback?code=...
   ▼
 JupyterHub
   │ ⑤ code를 토큰으로 교환 (브라우저 없이, 서버끼리)
   │    http://d2e-caddy:8080/oidc/token
   │ ⑥ 토큰 안의 권한 확인 → 통과하면 그 사람 전용 노트북 컨테이너 생성
   ▼
 jupyter-<유저이름> 컨테이너
```

**질문 나올 것: "왜 주소가 두 개예요?"**

| 단계 | 누가 접속 | 주소 |
| --- | --- | --- |
| ② 인가 | 사용자 **브라우저** | `https://localhost/oidc/auth` — 밖에서 닿아야 함 |
| ⑤ 토큰 교환 | **JupyterHub 컨테이너** | `http://d2e-caddy:8080/oidc/token` — 내부망이면 충분 |

⑤에 내부 주소를 쓰면 JupyterHub 컨테이너에 D2E 인증서를 심을 필요가 없습니다.
**이건 새로 만든 방식이 아니라 D2E의 WebAPI가 이미 쓰는 방식과 같습니다.**

---

## 2. 권한이 전달되는 경로 (제일 중요)

```
① Logto에서 유저에게 role.jupyteruser 역할 부여
        │  Logto가 역할을 같은 이름의 scope로 바꿔줌 (LOGTO__ROLES_SCOPES 설정)
        ▼
② scope "role.jupyteruser"
        │  JupyterHub가 로그인 요청에 "이 scope 달라"고 적어 보냄
        ▼
③ 토큰 응답: {"scope": "role.jupyteruser"}
        │  jupyterhub_config.py 의 granted_scopes() 함수가 읽어서 그룹으로 변환
        ▼
④ JupyterHub 그룹 "role.jupyteruser"
        │  allowed_groups = 이 그룹만 허용
        ▼
⑤ 통과 / 403 거부
```

**핵심 두 가지**

1. **`resource=https://alp-default` 를 같이 보내야 합니다.** Logto는 scope를 "API
   리소스"에 묶어 관리하는데, 요청에 어느 리소스인지 안 적으면 scope를 토큰에 안
   넣어줍니다. 그러면 그룹이 비어서 **권한 있는 사람도 전부 거부**됩니다. 증상이
   원인을 안 가리켜서 찾기 어렵습니다.

2. **`allow_existing_users = False`** — 매 로그인마다 Logto의 현재 역할을 다시
   읽습니다. 그래서 역할을 회수하면 **다음 로그인부터 바로 막힙니다.** JupyterHub
   내부 DB에 그 유저와 그룹이 남아 있어도 거부됩니다. (데모에서 보여줄 부분)

---

## 3. 바꾼 파일 — 전체 목록

| 파일 | 상태 | 한 줄 요약 |
| --- | --- | --- |
| `docker-compose.yml` | 수정 | D2E 쪽 유일한 변경. 역할 1개 + 앱 1개 추가 |
| `env-vars.md` | 수정 | 새 환경변수 2개 문서화 |
| `docker-compose-jupyterhub.yml` | 신규 | JupyterHub + Docker API 프록시 정의 |
| `services/jupyterhub/Dockerfile` | 신규 | 이미지 정의 (11줄) |
| `services/jupyterhub/jupyterhub_config.py` | 신규 | 설정 전체 (129줄) — 설명의 핵심 |
| `services/jupyterhub/jupyterhub.env.example` | 신규 | 선택적 튜닝 템플릿 |
| `services/jupyterhub/logto-role.py` | 신규 | 역할 부여/회수 도구 |
| `role.sh` | 신규 | 위 도구를 짧은 명령으로 실행하는 래퍼 |

---

## 4. `docker-compose.yml` — D2E 쪽 유일한 변경

### 4.1 실제로 바뀐 것은 4줄

`+13 / −4`. 그중 7줄은 주석입니다. **크게 보이는 이유는 그 4줄이 각각
500~2,400자짜리 한 줄이라서**입니다 (diff가 줄 전체를 삭제+추가로 표시).

| 줄 | 추가된 내용 |
| --- | --- |
| `LOGTO__ROLES` | `{"name":"role.jupyteruser","description":"JupyterHub user","type":"User"}` |
| `LOGTO__SCOPES` | `{"name":"role.jupyteruser",...}` |
| `LOGTO__ROLES_SCOPES` | `{"roleName":"role.jupyteruser","scopeNames":["role.jupyteruser"]}` |
| `LOGTO__CLIENT_APPS` | JupyterHub 앱 1개 (조건부) |

앞 3개가 **2장의 ①→②** 를 만드는 설정입니다. 역할을 만들고, 같은 이름의 scope를
만들고, 둘을 연결합니다.

### 4.2 네 번째 줄 — 조건부 앱 등록

```yaml
LOGTO__CLIENT_APPS: >-
  [
  ${LOGTO__JUPYTERHUB__CLIENT_SECRET:+{"name":"jupyterhub", ... },}
  {"name":"alp-svc", ...기존 그대로... }
  ]
```

`${변수:+내용}` 은 **변수가 있을 때만 "내용"을 넣고, 없으면 아무것도 안 넣는다**는
뜻입니다. 그래서:

| `LOGTO__JUPYTERHUB__CLIENT_SECRET` | 결과 |
| --- | --- |
| 설정 안 함 | `['alp-svc','alp-data','alp-app']` — **develop과 완전히 동일**, 앱 생성 안 됨 |
| 설정함 | `['jupyterhub','alp-svc','alp-data','alp-app']` — 나머지 3개는 그대로 |

**→ JupyterHub를 안 쓰는 배포는 영향이 0입니다.** `docker compose config` 로
양방향 확인했습니다. 이게 리뷰에서 제일 중요한 포인트입니다.

비밀키는 `.env` 에만 있고 이 파일에는 안 들어갑니다. 기존 앱들이
`${LOGTO__D2E_APP__CLIENT_SECRET}` 을 쓰는 것과 같은 방식입니다.

### 4.3 별도 커밋: 긴 줄을 여러 줄로 나눔

그 4줄이 사람이 못 읽는 길이(최대 2,389자)여서 YAML 여러 줄 문자열로 폈습니다.
**포맷만 바꿨고 값은 동일합니다.** 검증 방법: develop 버전과 새 버전을 각각
`docker compose config` 로 렌더링해서 **파싱된 JSON을 비교** → 전부 동일.

> 주의해서 한 부분: `${...}` 를 줄로 분리하면 안 됩니다. YAML이 앞뒤에 공백을
> 넣어서 `"id": " SVCID "` 처럼 **문자열 안에 공백이 들어가 값이 망가집니다.**
> 첫 시도에서 실제로 그렇게 됐고, 검증에서 잡아서 고쳤습니다.

---

## 5. `docker-compose-jupyterhub.yml` — 배포 정의

### 5.1 이건 단독 파일이 아니라 "오버레이"입니다

```sh
docker compose -f docker-compose.yml -f docker-compose-jupyterhub.yml up -d --build
```

두 파일을 **합쳐서** 씁니다. 그래야 `alp` 네트워크와 `PROJECT_NAME` 을 기존
compose에서 가져옵니다. (Docker 공식 문서의 multiple compose files 방식)

> 함정: Compose는 `./services/jupyterhub` 같은 상대경로를 **첫 번째 `-f` 파일이
> 있는 디렉터리 기준**으로 해석합니다. 베이스 파일이 다른 곳에 있으면
> `--project-directory .` 를 붙여야 합니다.

### 5.2 서비스 2개

**(1) `docker-socket-proxy`** — 보안 때문에 넣었습니다.

JupyterHub가 유저별 컨테이너를 만들려면 Docker를 조작해야 합니다. 가장 쉬운 방법은
`/var/run/docker.sock` 을 허브에 넣는 것인데, **그건 허브에 호스트 root 권한을 주는
것과 같습니다.** 허브가 뚫리면 VM 전체가 뚫립니다. (리뷰 지적사항 5번)

그래서 소켓을 허브가 아니라 이 프록시에만 넣고, 프록시가 **JupyterHub가 실제로
쓰는 기능만** 열어줍니다:

```yaml
CONTAINERS: 1   IMAGES: 1   NETWORKS: 1   VOLUMES: 1   POST: 1   ← 허용
EXEC: 0   SECRETS: 0   NODES: 0   SWARM: 0  ...             ← 거부
```

`EXEC` 이 특히 중요합니다 — 열려 있으면 **호스트의 아무 컨테이너에서나 명령
실행**이 가능합니다.

측정 결과: 필요한 엔드포인트는 200, `/info` `/secrets` `/nodes` 는 403.

> **과장하면 안 되는 부분**: 이걸로 DockerSpawner가 안전해지는 건 아닙니다.
> 프록시에 닿을 수 있으면 여전히 컨테이너를 만들 수 있고, 컨테이너 생성은 호스트
> 경로 마운트로 악용될 수 있습니다. 피해 범위를 **"호스트 root" → "컨테이너 생성
> 가능"** 으로 줄인 것입니다. 이건 승인이 필요한 사항이지 리뷰로 끝날 문제가
> 아닙니다.

**(2) `jupyterhub`** — 허브 본체.

`environment:` 블록이 핵심입니다. 허브가 **없으면 못 뜨는 값 6개를 전부 여기서
파생**시킵니다:

| 넘기는 값 | 어디서 오나 | 왜 |
| --- | --- | --- |
| `LOGTO_JUPYTERHUB_CLIENT_ID` | `${LOGTO__JUPYTERHUB__CLIENT_ID:-jupyterhub}` | 앱 등록과 같은 변수 |
| `LOGTO_JUPYTERHUB_CLIENT_SECRET` | `${LOGTO__JUPYTERHUB__CLIENT_SECRET:?...}` | **없으면 즉시 실패** (`:?`) |
| `JUPYTERHUB_OAUTH_CALLBACK_URL` | `${JUPYTERHUB__PUBLIC_URL}/hub/oauth_callback` | 등록된 redirect URI와 **같은 변수** |
| `LOGTO_AUTHORIZE_URL` | `${CADDY__D2E__PUBLIC_FQDN}` | 브라우저용 |
| `LOGTO_TOKEN_URL` | `${PROJECT_NAME}-caddy:8080` | 서버간 |
| `JUPYTERHUB_HUB_CONNECT_URL` | `${PROJECT_NAME}-jupyterhub:8081` | 노트북→허브 |

**왜 이렇게 했나**: 원래는 `.env` 에 긴 JSON을 손으로 붙여넣고 비밀키를 두 군데
적어야 했습니다. 지금은 **비밀키 하나만** 설정하면 됩니다. 그리고 콜백 URL과
등록된 redirect URI가 같은 변수에서 나오므로 **불일치가 구조적으로 불가능**합니다
(이 불일치가 `redirect_uri mismatch` 의 가장 흔한 원인입니다).

`services/jupyterhub/.env` 는 `required: false` 라서 **없어도 뜹니다.** 튜닝용일
뿐입니다.

### 5.3 네트워크 3개 — 리뷰 지적사항 4번의 답

```yaml
networks:
  alp:                      # 허브만. 토큰 교환하러 caddy에 닿기 위해서
  jupyterhub-notebooks:     # 노트북이 사는 곳
  jupyterhub-dockerproxy:   # 허브 ↔ 프록시 전용, internal: true (포트 노출 없음)
```

**원래는 노트북이 D2E 네트워크에 붙어 있었습니다.** 노트북은 유저가 원하는 코드를
그대로 실행하는 환경인데, 측정해보니:

```
REACHABLE  d2e-minerva-postgres-1:5432   D2E 전체 DB
REACHABLE  d2e-logto-1:3002              Logto 관리 API
REACHABLE  d2e-minerva-redis-1:6379      Redis
REACHABLE  d2e-trex:33001, d2e-demodb:5432, d2e-caddy:8080
```

즉 **JupyterHub 쓸 수 있는 사람은 누구나 D2E 내부망에 접근**할 수 있었습니다.

고친 뒤 실제 노트북에서 재측정:
```
blocked    d2e-minerva-postgres-1:5432   (이름 해석조차 안 됨)
blocked    d2e-logto-1:3002
blocked    docker-socket-proxy:2375
REACHABLE  d2e-jupyterhub:8081           허브. 노트북이 반드시 필요한 곳
```

---

## 6. `services/jupyterhub/Dockerfile` — 11줄 전부

```dockerfile
FROM quay.io/jupyterhub/jupyterhub:5.4.2      # ① 공식 이미지, 버전 고정

RUN python3 -m pip install --no-cache-dir \   # ② 확장 2개
    "dockerspawner==14.0.0" \                 #    유저별 컨테이너 생성
    "oauthenticator==17.4.0"                  #    OIDC 로그인

COPY jupyterhub_config.py /srv/jupyterhub/jupyterhub_config.py   # ③ 설정 복사

WORKDIR /srv/jupyterhub
CMD ["jupyterhub", "--config", "/srv/jupyterhub/jupyterhub_config.py"]
```

**"JupyterHub에 OIDC 인증 기능이 있냐"** 는 질문의 답이 ②입니다. `oauthenticator`
는 공식 확장이고 그 안의 `GenericOAuthenticator` 가 업스트림이 제공하는 OIDC
경로입니다. 별도 개발이 없습니다. 다만 **17.4에는 `.well-known` 자동 탐색이
없어서** 주소를 직접 적어줘야 합니다 — 그래서 설정에 URL이 두 개 박혀 있습니다.

---

## 7. `jupyterhub_config.py` — 129줄, 블록별 설명

### 7.1 헬퍼 함수 2개 (5~19행)

```python
def required_env(name):        # 5~9행
    value = os.getenv(name)
    if not value:
        raise RuntimeError(...)   # 없으면 뜨다가 죽음 (조용히 잘못 뜨는 것보다 나음)
    return value
```

```python
def granted_scopes(auth_state):   # 12~19행
    token_response = auth_state.get("token_response") or {}
    scopes = token_response.get("scope") or auth_state.get("scope") or []
    if isinstance(scopes, str):
        scopes = scopes.split()
    return [s for s in scopes if isinstance(s, str)]
```

**이 함수가 2장의 ③→④ 입니다.** Logto가 실제로 승인한 scope 목록을 JupyterHub
그룹 목록으로 바꿉니다. 79행에서 `auth_state_groups_key` 로 연결됩니다.

### 7.2 기본 주소·저장소 (24~30행)

```python
c.JupyterHub.bind_url      = "http://0.0.0.0:8000"   # 웹 UI
c.JupyterHub.hub_bind_url  = "http://0.0.0.0:8081"   # 노트북이 허브에 보고하는 포트
c.JupyterHub.hub_connect_url = os.getenv("JUPYTERHUB_HUB_CONNECT_URL", ...)
c.JupyterHub.cookie_secret_file = "/srv/jupyterhub/data/..."   # 볼륨에 보관
c.JupyterHub.db_url = "sqlite:////srv/jupyterhub/data/jupyterhub.sqlite"
```

허브 상태(유저·그룹·서버)는 SQLite에 있고 볼륨에 저장됩니다. 볼륨을 지우면
다음 로그인 때 Logto로부터 다시 만들어집니다.

### 7.3 auth_state 보관 (33~37행)

```python
if os.getenv("JUPYTERHUB_CRYPT_KEY"):
    c.Authenticator.enable_auth_state = True
```

Logto 토큰을 암호화해서 보관합니다. 나중에 노트북이 D2E를 호출해야 할 때 필요한
값입니다. 키가 없으면 그냥 안 켭니다.

### 7.4 주기적 재검증 끄기 (39~48행) — **설명 요구될 만한 부분**

```python
c.Authenticator.auth_refresh_age = 0
```

**왜 껐나**: `oauthenticator` 의 `refresh_user` 가 **저장된** 토큰 응답을 다시
검사하는데, `userdata_from_id_token` 과 같이 쓰면 저장된 id 토큰을 만료 검사까지
해서 디코딩합니다. 로그인 후 약 1시간이 지나면 예외가 나는데, 감싸는 코드가 다른
종류의 예외만 잡아서 **500으로 빠져나가고 모든 요청이 "Missing or invalid
credentials" 로 거부**됩니다. refresh token은 시도조차 안 됩니다.

재현 → 수정 → 재검증했습니다:
```
수정 전: {'status': 403, 'message': 'Missing or invalid credentials.'}
수정 후: user: admin | groups: ['role.jupyteruser']
```

**인가는 이것에 의존하지 않습니다** — 82행의 `allow_existing_users = False` 가
매 로그인마다 역할을 다시 읽으니까요.

### 7.5 OIDC 설정 (50~82행) — 핵심 블록

```python
c.JupyterHub.authenticator_class = "generic-oauth"        # 50 OIDC 인증기 사용

c.GenericOAuthenticator.client_id      = required_env(...)  # 51 Logto 앱 ID
c.GenericOAuthenticator.client_secret  = required_env(...)  # 52 앱 비밀키
c.GenericOAuthenticator.oauth_callback_url = required_env(...) # 55 ④가 돌아올 주소
c.GenericOAuthenticator.authorize_url  = required_env(...)  # 58 ② 브라우저가 갈 곳
c.GenericOAuthenticator.token_url      = required_env(...)  # 59 ⑤ 서버가 갈 곳

c.GenericOAuthenticator.userdata_from_id_token = True       # 60 별도 조회 없이
                                                            #    id 토큰에서 유저 정보
c.GenericOAuthenticator.username_claim = "username"         # 61 ← 함정, 아래 참고
c.GenericOAuthenticator.login_service  = "Data2Evidence"    # 64 버튼 문구
```

**60행 관련 질문 나올 것**: 토큰의 발급자(`iss`)가 `http://d2e-caddy:8080/oidc` 라
브라우저가 접속한 주소와 다릅니다. 보통 검증 실패를 일으키는데, 여기서는
oauthenticator가 **토큰을 Logto에서 직접 받아왔기 때문에** 서명 검증을 건너뛰고
`aud`(수신자)와 `exp`(만료)만 봅니다. OIDC 표준이 허용하는 동작입니다
(Core 3.1.3.7.6).

**61행 — 실제로 걸렸던 함정**: 처음엔 `preferred_username` 으로 했는데 로그인이
실패했습니다. Logto 1.23은 그 claim을 **광고만 하고 채우지 않습니다.** 실제 토큰:
```json
{"sub":"pjot55s095gl","username":"admin","email":null,"name":null}
```
`email` 과 `name` 도 null이라 대안이 없습니다. **`username` 이어야 합니다.**

```python
c.GenericOAuthenticator.scope = [                          # 65~71
    "openid", "profile", "email", "offline_access",
    required_env("LOGTO_ALLOWED_ROLE"),                    # ← role.jupyteruser
]
c.GenericOAuthenticator.extra_authorize_params = {"resource": "https://alp-default"}  # 72
c.GenericOAuthenticator.token_params           = {"resource": "https://alp-default"}  # 75
```

**72·75행이 2장의 "핵심 1"** 입니다. 이거 없으면 scope가 토큰에 안 실려서 전원
거부됩니다.

```python
c.GenericOAuthenticator.manage_groups         = True             # 78 그룹 관리 위임
c.GenericOAuthenticator.auth_state_groups_key = granted_scopes   # 79 ← 7.1 함수 연결
c.GenericOAuthenticator.allowed_groups        = {required_env("LOGTO_ALLOWED_ROLE")}  # 80
c.GenericOAuthenticator.allow_all             = False            # 81 기본 거부
c.GenericOAuthenticator.allow_existing_users  = False            # 82 매번 재확인
```

**80~82행이 게이트 그 자체입니다.** 81번이 없으면 인증만 되면 다 들어옵니다.

### 7.6 로그아웃 (85~102행)

```python
_end_session = os.getenv("LOGTO_END_SESSION_URL")
if _end_session:
    c.GenericOAuthenticator.logout_redirect_url = f"{_end_session}?client_id=...&post_logout_redirect_uri=..."
c.JupyterHub.shutdown_on_logout = ...   # 로그아웃 시 노트북 컨테이너 정지
```

**정직하게 말해야 하는 부분**: `/hub/logout` 은 **JupyterHub 세션만** 끊습니다.
`LOGTO_END_SESSION_URL` 을 설정하면 이 앱의 승인까지 해제되어 다음 로그인에 동의
화면이 다시 나오지만, **Logto 계정 세션은 안 끊깁니다.** 다시 Login을 누르면
비밀번호 없이 들어옵니다.

원인: 계정 세션을 끊으려면 `id_token_hint` 가 필요한데, 설정에 넣는 고정 주소로는
유저별 토큰을 실어 보낼 수 없습니다. 완전한 단일 로그아웃은 커스텀 핸들러가
필요하고 **미구현**입니다. 공용 PC 환경이면 배포 전 결정이 필요합니다.

`shutdown_on_logout` 은 정상 동작합니다 (검증함).

### 7.7 거부 메시지 (104~106행)

```python
c.GenericOAuthenticator.custom_403_message = (
    "Your D2E account is valid, but it does not have the JupyterHub access role."
)
```

권한 없는 유저가 보는 문구입니다. "로그인은 됐는데 권한이 없다"를 구분해서
알려줍니다.

### 7.8 노트북 생성 (108~127행)

```python
c.JupyterHub.spawner_class = "dockerspawner.DockerSpawner"   # 108 컨테이너로 생성
c.DockerSpawner.image        = "quay.io/jupyterhub/singleuser:5.4.2"  # 109
c.DockerSpawner.network_name = "jupyterhub-notebooks"        # 115 ← 5.3 격리
c.DockerSpawner.use_internal_ip = True                       # 118 내부 IP로 통신
c.DockerSpawner.remove       = True                          # 119 정지 시 컨테이너 삭제
c.DockerSpawner.notebook_dir = "/home/jovyan/work"           # 120
c.DockerSpawner.volumes      = {"jupyterhub-user-{username}": "/home/jovyan/work"}  # 121
c.DockerSpawner.mem_limit    = "1G"                          # 124 유저당 메모리
c.DockerSpawner.cpu_limit    = 1                             # 125 유저당 CPU
c.Spawner.default_url        = "/lab"                        # 126 JupyterLab으로
c.Spawner.start_timeout      = 120                           # 127
```

**121행** — 유저별 볼륨이라 노트북을 지워도 작업물은 남습니다.
**115행** — 여기를 D2E 네트워크로 바꾸면 5.3의 문제가 그대로 돌아옵니다.

---

## 8. 명령어 — 무엇을 왜

### 8.1 띄우기

```sh
# ① 비밀키 하나 생성해서 .env 에 추가 = JupyterHub 켜는 스위치
echo "LOGTO__JUPYTERHUB__CLIENT_SECRET=$(openssl rand -hex 32)" >> .env
```
이 변수가 있으면 Logto에 앱이 등록되고 허브가 뜹니다. 없으면 아무 일도 안 일어납니다.

```sh
# ② 노트북 이미지 미리 받기 (안 하면 첫 spawn에서 1.5GB 다운로드하며 대기)
docker pull quay.io/jupyterhub/singleuser:5.4.2

# ③ 두 compose 파일을 합쳐서 기동
docker compose -f docker-compose.yml -f docker-compose-jupyterhub.yml up -d --build
```

```sh
# ④ 이미 떠 있는 스택이면 앱 등록만 따로 (한 번 실행되고 끝나는 컨테이너, 멱등)
docker compose up alp-logto-post-init
```

### 8.2 역할 부여 도구

```sh
cd ~/data4life/Data2Evidence
./role.sh list
./role.sh grant <username>
./role.sh revoke <username>
```

`role.sh` 는 얇은 래퍼입니다. 하는 일:

| 줄 | 이유 |
| --- | --- |
| `DIR=$(cd "$(dirname "$0")" && pwd)` | **스크립트 위치 기준**으로 경로를 잡습니다. `$PWD` 에 의존하지 않아서 어느 디렉터리에서 실행해도 동작하고, 잘못된 체크아웃에서 실행하면 빈 디렉터리를 마운트하는 대신 **명확한 메시지로 중단**합니다 |
| `docker exec d2e-logto-1 printenv ...` | Logto 관리 API 자격증명을 **실행 중인 컨테이너에서** 읽습니다. 미리 `export` 할 필요가 없고 파일에도 안 적습니다 |
| `docker run --rm` | 일회용 컨테이너. 끝나면 삭제 |
| `--network d2e_alp` | Logto는 **도커 네트워크 안에서만** 닿습니다 |
| `-v "$DIR/services/jupyterhub:/s:ro"` | 스크립트를 **읽기 전용**으로 마운트. 실행 중인 컨테이너에 `docker cp` 로 복사하지 않습니다 |
| `python:3.12-alpine` | 전용 이미지가 필요 없습니다 |

`LOGTO_CONTAINER`, `NETWORK` 환경변수로 다른 배포를 가리킬 수 있습니다.

**왜 이 도구가 필요한가**: 이 스택은 Caddy 설정에서 **Logto 관리 화면을 주석
처리해 막아놨습니다.** 그래서 "누가 JupyterHub를 쓸 수 있나" 를 정하는 그 하나의
작업을 할 UI가 없습니다.

> 미팅 2번대로 D2E가 역할을 부여하게 되면 이 도구는 필요 없어집니다.

### 8.3 `logto-role.py` 내부 (함수 단위)

| 함수 | 하는 일 |
| --- | --- |
| `management_token()` | M2M 자격증명으로 Logto 관리 API 토큰 획득 (`client_credentials`) |
| `find_role(auth)` | `role.jupyteruser` 의 내부 ID 조회. 없으면 에러 |
| `find_user(auth, username)` | 유저명으로 Logto 유저 ID 조회 |
| `decode(raw)` | Logto가 201/204에 빈 본문이나 비-JSON을 주는 경우 처리 |
| `main()` | `list` / `grant` / `revoke` 분기 |

`list` 는 `GET /api/roles/{id}/users`, `grant` 는 `POST /api/users/{id}/roles`,
`revoke` 는 `DELETE /api/users/{id}/roles/{roleId}` 입니다.

---

## 9. 데모 — 이 순서로 보여주면 됩니다

실제로 돌려서 나온 출력입니다.

```
### 0. 시작 상태
$ ./role.sh list
users holding role.jupyteruser:
  admin  (pjot55s095gl)

### 1. 권한 없는 유저로 로그인
RESULT: DENIED   (Logto 로그인은 성공, 허브가 403 + 커스텀 메시지)

### 2. 권한 부여
$ ./role.sh grant jupyter_denied
grant role.jupyteruser to jupyter_denied: 201 ok

### 3. 다시 로그인
RESULT: ALLOWED  (허브 수락 → /hub/spawn)

### 4. 보유자 확인
$ ./role.sh list
users holding role.jupyteruser:
  jupyter_denied  (qrnn20csq3gz)
  admin  (pjot55s095gl)

### 5. 권한 회수
$ ./role.sh revoke jupyter_denied
revoke role.jupyteruser from jupyter_denied: 204 ok

### 6. 다시 로그인
RESULT: DENIED

### 7. 원복 확인
$ ./role.sh list
users holding role.jupyteruser:
  admin  (pjot55s095gl)
```

**6번을 강조하세요.** 이 시점에 JupyterHub 내부 DB에는 그 유저와 그룹이 **이미
있습니다.** 그런데도 거부됩니다 — `allow_existing_users = False` 덕분에 매
로그인마다 Logto를 다시 보기 때문입니다. "권한 회수가 실시간으로 반영된다"는
증거입니다.

**브라우저 데모 시 주의**: 거부 테스트는 **시크릿 창**에서 하세요. 안 그러면 기존
세션이 재사용됩니다. 그리고 **D2E 포털에 먼저 로그인**해 두세요 (아래 10.2).

---

## 10. 알려진 한계 — 먼저 말하는 게 낫습니다

### 10.1 DB 접근은 이번 범위가 아닙니다

노트북에서 D2E 데이터를 읽는 기능을 만들었다가 **검증에서 떨어져서 뺐습니다.**

`jupyter_denied`(역할 0개, WebAPI가 `permissions=0` 으로 인식)로 시험한 결과:
```
/WebAPI/cdmresults/<demo>/person   200  Source name=EUNOMIA | Number of persons=2694
```
**권한 0인 유저가 데이터셋 데이터를 읽었습니다.**

원인은 WebAPI에 그 엔드포인트들의 권한 정의가 없어서입니다:
```sql
select value from webapi.sec_permission where value ilike '%cdmresults%';
 (해당 없음)   -- vocabulary:*:info:get 하나만 존재
```
Atlas는 `sec_permission` 에 등록된 엔드포인트만 검사합니다. **demo만의 문제가
아니라 그 계열 전체가 검사 대상이 아닙니다 — MIMIC을 붙여도 같습니다.**

JupyterHub가 만든 문제는 아닙니다 (게이트웨이로도 토큰 없이 똑같이 읽힙니다).
하지만 노트북에 경로를 열면 임의 코드가 조직적으로 긁을 수 있으므로 뺐습니다.

**미팅 결정대로 앞으로는 tech user 방식**(전용 Postgres 계정에 데이터셋별 스키마
권한 부여)으로 갑니다. Postgres는 스키마 권한을 진짜로 강제하므로 이 구멍이
없습니다. 전제도 이미 갖춰져 있습니다 — demodb에 `demo_cdm`, `demo_cdm_results`
스키마가 분리돼 있고, DB 롤은 현재 `postgres` 하나뿐입니다.

### 10.2 로그인 화면이 빈 화면으로 보일 수 있습니다

이 배포에서는 **D2E 포털이 로그인 UI** 입니다. Logto의 `/sign-in` 은 진행 중인
로그인 세션이 없으면 `/d2e/portal` 로 돌려보냅니다 (시딩이
`unknownSessionRedirectUrl` 을 그렇게 설정).

서버 쪽은 정상임을 확인했습니다 — `/sign-in` 200(15KB), 필요한 파일 23개 전부 200.
**포털에 먼저 로그인해 두면** 허브 로그인이 `/sign-in` 을 아예 건너뜁니다.

### 10.3 기타

- **토큰 수명 1시간, 갱신 없음** (7.4 참고)
- **완전한 로그아웃 미구현** (7.6 참고)
- **`d2e init` 부터의 신규 설치는 미검증** — 기존 스택을 깨야 해서 못 했습니다

---

## 11. 예상 질문

**"기존 배포에 영향 없나요?"**
→ 변수를 설정 안 하면 `LOGTO__CLIENT_APPS` 가 develop과 **완전히 동일하게**
렌더됩니다. `docker compose config` 로 양방향 확인했습니다. 앱도 안 만들어집니다.

**"왜 파일이 이렇게 많이 바뀌었나요?"**
→ 기능 변경은 `docker-compose.yml` **4줄**입니다. 나머지 138줄은 그 4줄이 사람이
못 읽는 길이라 포맷만 바꾼 **별도 커밋**이고, 파싱 결과가 동일함을 검증했습니다.

**"보안은요?"**
→ 두 가지를 compose가 강제합니다: 노트북 네트워크 격리, Docker 소켓을 허브에서
분리. 다만 **DockerSpawner가 안전해진 건 아니고** 피해 범위를 줄인 것입니다.
소켓 노출 수준은 승인이 필요한 사항입니다.

**"유저 관리는 어떻게 하나요?"**
→ 지금은 `logto-role.py` 로 수동입니다. 미팅 결정대로 D2E가 부여하게 하거나,
Azure AD 그룹 매핑(`LOGTO_ROLES_AZ_GROUPS_MAPPING`)을 쓰면 개별 관리가 0이 됩니다.
매핑에 한 줄 추가하면 AD 그룹 추가/제거로 접근이 자동 부여/회수됩니다.

**"얼마나 걸리나요?"**
→ 설정은 끝났습니다. VM이 준비되면 런북대로 반나절 수준. 실제 변수는 TLS·리버스
프록시 구성과 Docker 소켓 보안 결정입니다.

**"테스트는 어디까지 했나요?"**
→ 로그인, 권한 추출, 권한 없는 유저 거부, 권한 회수 즉시 반영, 노트북 생성·셀
실행, 노트북 네트워크 격리, 소켓 프록시 허용/거부를 실제 컨테이너로 확인했습니다.
자동화 테스트는 없고, 신규 설치(`d2e init`부터)는 미검증입니다.
