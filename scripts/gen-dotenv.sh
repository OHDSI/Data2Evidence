#!/usr/bin/env bash
# generate dotenv file
set -o nounset
set -o errexit

# constants
ghuser=${GH_USERNAME}
ghtoken=${GH_TOKEN}
CADDY__ALP__PUBLIC_FQDN=${CADDY__ALP__PUBLIC_FQDN}
TLS__CADDY_DIRECTIVE=${TLS__CADDY_DIRECTIVE}

if [ -z "${ENVFILE:-}" ]; then
    env_file=.env.${ENV_TYPE:-local}
else
    env_file=$ENVFILE
fi

echo env_file=$env_file

example_file=${ENV_EXAMPLE:-env.example}
tmp_file=.env.tmp

default_password_length=30
x509_subject="/C=SG/O=ALP Dev"

# action
echo '' > $tmp_file

# passwords
echo set-passwords ...
function set-password {
    export password_name=$1
    export password_length=$2
    echo INFO set password:$password_name ...
    export password_value=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c $password_length)
    echo ${password_name}=${password_value} >> $tmp_file
}

password_keys=($(cat $example_file | grep password$ | awk -F= '{print $1}')) # echo ${password_keys[@]};
password_name=${password_keys[1]}
for password_name in ${password_keys[@]}; do
    length=$default_password_length
    if [[ $password_name =~ ^(LOGTO_API_M2M_CLIENT_ID|LOGTO__ALP_APP__CLIENT_ID|LOGTO__ALP_SVC__CLIENT_ID|LOGTO__ALP_DATA__CLIENT_ID)$ ]]; then
        length=21
    fi
    set-password $password_name $length
done
echo

echo set-openssl ...
function set-openssl {
    echo INFO set DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY DB_CREDENTIALS__INTERNAL__PUBLIC_KEY ...
    export PRIVATE_KEY=$(openssl genpkey  -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -quiet)
    export PUBLIC_KEY=$(echo "${PRIVATE_KEY}" | openssl rsa -pubout)

    echo DB_CREDENTIALS__INTERNAL__DECRYPT_PRIVATE_KEY=\'"${PRIVATE_KEY}"\' >> $tmp_file
    echo DB_CREDENTIALS__INTERNAL__PUBLIC_KEY=\'"${PUBLIC_KEY}"\' >> $tmp_file
}
set-openssl
echo

echo encode-basic-auth ...
encode-basic-auth() {
    echo INFO set LOGTO__CLIENTID_PASSWORD__BASIC_AUTH ...
    client_id=$(grep '^LOGTO_API_M2M_CLIENT_ID=' "$tmp_file" | cut -d"=" -f2)
    client_secret=$(grep '^LOGTO_API_M2M_CLIENT_SECRET=' "$tmp_file" | cut -d"=" -f2)
    encoded_basic_auth=$(echo -n "${client_id}:${client_secret}" | base64)
    echo LOGTO__CLIENTID_PASSWORD__BASIC_AUTH=${encoded_basic_auth} >> $tmp_file
}
encode-basic-auth
echo

bash -c "set -a; source $tmp_file; cat $example_file | envsubst > $env_file"
if [ ${ENV_TYPE:-local} = local ]; then
    echo DOCKER_TAG_NAME=local >> $env_file
fi
echo >> $env_file

echo ENV_TYPE=$ENV_TYPE >> $env_file
echo GH_TOKEN=$ghtoken >> $env_file
echo GH_USERNAME=$ghuser >> $env_file
[ -z "${TLS__CADDY_DIRECTIVE-}" ] || echo TLS__CADDY_DIRECTIVE=$TLS__CADDY_DIRECTIVE >> $env_file
[ -z "${CADDY__ALP__PUBLIC_FQDN-}" ] || echo CADDY__ALP__PUBLIC_FQDN=$CADDY__ALP__PUBLIC_FQDN >> $env_file

# finish
wc -l $env_file