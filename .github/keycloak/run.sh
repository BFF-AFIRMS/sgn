#!/bin/bash

network=$1

docker run \
  -d \
  --network $network \
  --name keycloak \
  --hostname keycloak \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://keycloak_db:5432/keycloak \
  -e KC_DB_USERNAME=postgres \
  -e KC_DB_PASSWORD=postgres \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
  -e KC_HTTP_ENABLED=true \
  -e KC_HTTP_PORT=9080 \
  -e KC_HOSTNAME=http://keycloak:9080/auth \
  -e KC_HTTP_RELATIVE_PATH=/auth \
  -e KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true \
  -e KC_PROXY_HEADERS=xforwarded \
  -v $(pwd)/.github/keycloak/themes:/opt/keycloak/themes \
  -v $(pwd)/.github/keycloak/import:/opt/keycloak/data/import \
  quay.io/keycloak/keycloak:26.5.1-0 \
  start-dev --import-realm
