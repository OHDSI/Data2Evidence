# sourced library functions used by:
# - internal/scripts/flatten-env.sh
# - internal/scripts/gen-env-internal.sh
# - internal/scripts/set-env.sh
# - scripts/gen-dotenv.sh

[ -z $DOTENV_FILE ] && echo . FATAL DOTENV_FILE is not set

# inputs
D2E_MEM_TO_SWAP_LIMIT_RATIO=${D2E_MEM_TO_SWAP_LIMIT_RATIO:-4}
D2E_RESOURCE_LIMIT=${D2E_RESOURCE_LIMIT:-0.7}
TLS__INTERNAL__DOMAIN_NAME=${TLS__INTERNAL__DOMAIN_NAME:-d2e.local}
TLS__X509__SUBJ_BASE=${TLS__X509__SUBJ_BASE:-/C=SG/O=D4L/OU=D2E}

# vars
DEFAULT_PASSWORD_LENGTH=30
OS="$(uname -s)"

# functions
function random-password {
    PASSWORD_LENGTH=${1}
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c ${PASSWORD_LENGTH}
}

function random-uuid {
    uuidgen | tr 'A-Z' 'a-z' | tr -d '\n'
}

function gen-tls-internal {
    echo ". INFO generate x509 certs - TLS__INTERNAL_*"
    PKEY_ALGORITHM=ec; PKEY_OPT=ec_paramgen_curve:P-256
    # root
    TLS__INTERNAL__CA_KEY="$(openssl genpkey -algorithm $PKEY_ALGORITHM -pkeyopt $PKEY_OPT)" # && echo "$TLS__INTERNAL__CA_KEY"
    TLS__INTERNAL__CA_CRT="$(openssl req -x509 -key <(echo "${TLS__INTERNAL__CA_KEY}") -sha256 -days 3650 -subj "/CN=D2E Internal CA" -addext 'keyUsage=critical,keyCertSign,cRLSign' -addext 'basicConstraints=critical,CA:TRUE,pathlen:1')" # && echo "${TLS__INTERNAL__CA_CRT}" | openssl x509 -text -noout
    # containers
    TLS__INTERNAL__KEY="$(openssl genpkey -algorithm $PKEY_ALGORITHM -pkeyopt $PKEY_OPT)" # && echo "$TLS__INTERNAL__KEY"
    TLS__INTERNAL__CSR="$(openssl req -new -sha256 -key <(echo "${TLS__INTERNAL__KEY}") -subj "/CN=$TLS__INTERNAL__DOMAIN_NAME" -addext "subjectAltName=DNS:*.d2e.local" -addext 'keyUsage=critical,digitalSignature' -addext 'extendedKeyUsage=serverAuth,clientAuth')" # && echo "$TLS__INTERNAL__CSR" | openssl req -text -noout
    TLS__INTERNAL__CRT="$(openssl x509 -req -in <(echo "${TLS__INTERNAL__CSR}") -CA <(echo "${TLS__INTERNAL__CA_CRT}") -CAkey <(echo "${TLS__INTERNAL__CA_KEY}") -days 3650 -sha256 -copy_extensions copyall)" # && echo "${TLS__INTERNAL__CRT}" | openssl x509 -text -noout
    sed -i.bak -e "/TLS__INTERNAL__CA_CRT/,/END CERTIFICATE-----'/d" $DOTENV_FILE
    sed -i.bak -e "/TLS__INTERNAL__CRT/,/END CERTIFICATE-----'/d" $DOTENV_FILE
    sed -i.bak -e "/TLS__INTERNAL__KEY/,/PRIVATE KEY-----'/d"  $DOTENV_FILE
    echo TLS__INTERNAL__CA_CRT=\'"$TLS__INTERNAL__CA_CRT"\' >> $DOTENV_FILE
    echo TLS__INTERNAL__CRT=\'"$TLS__INTERNAL__CRT"\' >> $DOTENV_FILE
    echo TLS__INTERNAL__KEY=\'"$TLS__INTERNAL__KEY"\' >> $DOTENV_FILE
}

function set-cpu-limit {
    echo . INFO set cpu limit
    if [ "$OS" = "Linux" ]; then
        NPROCS="$(nproc --all)"
    elif [ "$OS" = "Darwin" ] || \
            [ "$(echo "$OS" | grep -q BSD)" = "BSD" ]; then
        NPROCS="$(sysctl -n hw.ncpu)"
    else
        NPROCS="$(getconf _NPROCESSORS_ONLN)"  # glibc/coreutils fallback
    fi
    # bc no longer installed on GHA Agent
    D2E_CPU_LIMIT=$(awk -v x=$NPROCS -v y=$D2E_RESOURCE_LIMIT "BEGIN {print x*y}")
    # Strip decimal numbers
    D2E_CPU_LIMIT=${D2E_CPU_LIMIT%%.*}
    sed -i.bak -e '/D2E_CPU_LIMIT=/d' $DOTENV_FILE
    echo D2E_CPU_LIMIT=$D2E_CPU_LIMIT | tee -a $DOTENV_FILE
}

function set-memory-limit {
    echo . INFO set memory limit
    if [ "$OS" = "Darwin" ]; then
        # mem_size=$(sysctl -n hw.memsize)
        MEMORY=$(system_profiler SPHardwareDataType | grep "  Memory:" | awk '{print $2}')
    else
        MEMORY=$(free -g | grep Mem: | awk '{print $2}')
    fi
    # bc no longer installed on GHA Agent
    D2E_MEMORY_LIMIT=$(awk -v x=$MEMORY -v y=$D2E_RESOURCE_LIMIT "BEGIN {print x*y}")
    # Strip decimal numbers
    D2E_MEMORY_LIMIT=${D2E_MEMORY_LIMIT%%.*}

    # Calculate D2E_SWAP_LIMIT
    D2E_SWAP_LIMIT="$((D2E_MEMORY_LIMIT*D2E_MEM_TO_SWAP_LIMIT_RATIO))"

    # Add G suffix for gigabyte
    D2E_MEMORY_LIMIT=${D2E_MEMORY_LIMIT}G
    # echo D2E_MEMORY_LIMIT=$D2E_MEMORY_LIMIT
    D2E_SWAP_LIMIT=${D2E_SWAP_LIMIT}G
    # echo D2E_SWAP_LIMIT=$D2E_SWAP_LIMIT
    sed -i.bak -e '/D2E_MEMORY_LIMIT=/d' -e '/D2E_SWAP_LIMIT=/d' $DOTENV_FILE
    echo D2E_MEMORY_LIMIT=$D2E_MEMORY_LIMIT | tee -a $DOTENV_FILE
    echo D2E_SWAP_LIMIT=$D2E_SWAP_LIMIT | tee -a $DOTENV_FILE
}