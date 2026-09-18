#!/bin/bash
NET=app_backend
API=http://backend:8080/api/v1

run() { docker run --rm --network "$NET" curlimages/curl:latest "$@"; }

for P in p1 p2 p3 p4 p5 p6; do
  EMAIL="$P@sobi.test"
  echo "== $EMAIL =="

  TOKEN=$(run -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"sobi1234\"}" \
    | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$TOKEN" ]; then echo "  로그인 실패"; continue; fi

  START=$(date +%s)
  RES=$(run -s -m 300 -X POST "$API/mydata/link" -H "Authorization: Bearer $TOKEN")
  echo "  $(( $(date +%s) - START ))초  $RES"
  echo
done