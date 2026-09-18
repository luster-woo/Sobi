#!/bin/bash

API_KEY=3f631668726c48889e9eec99ad37cfc2
BASE=https://finopenapi.ssafy.io/ssafy/api/v1/edu
MEMBER=https://finopenapi.ssafy.io/ssafy/api/v1/member

LOAN_PRODUCT=020-4-fb852de4b36942   # 우리 창업초기 사업자대출 (E등급)

# email | 입금액 (-1 이면 계좌 자체를 안 만든다) | 대출액 (0 이면 대출 없음)
PERSONAS=(
  "p1@sobi.test|110000000|5000000"
  "p2@sobi.test|0|0"
  "p3@sobi.test|60000000|0"
  "p4@sobi.test|-1|0"
  "p5@sobi.test|85000000|0"
  "p6@sobi.test|110000000|0"
)

hdr() {
  local base
  base=$(printf '"apiName":"%s","transmissionDate":"%s","transmissionTime":"%s","institutionCode":"00100","fintechAppNo":"001","apiServiceCode":"%s","institutionTransactionUniqueNo":"%s%06d","apiKey":"%s"' \
    "$1" "$(date +%Y%m%d)" "$(date +%H%M%S)" "$1" "$(date +%Y%m%d%H%M%S)" "$((RANDOM%1000000))" "$API_KEY")
  if [ -n "$2" ]; then printf '%s,"userKey":"%s"' "$base" "$2"
  else printf '%s' "$base"; fi
}
call() { curl -s -X POST "$BASE/$1" -H "Content-Type: application/json" -d "$2"; }
pick() { grep -o "\"$1\" *: *\"[^\"]*\"" | head -1 | sed 's/.*: *"//; s/"//'; }

echo "== 수시입출금 상품 고유번호 =="
DD_PRODUCT=$(call demandDeposit/inquireDemandDepositList \
  "{\"Header\":{$(hdr inquireDemandDepositList)}}" | pick accountTypeUniqueNo)
echo "  $DD_PRODUCT"
echo

RESULT=""

for row in "${PERSONAS[@]}"; do
  IFS='|' read -r EMAIL DEPOSIT LOAN <<< "$row"
  echo "== $EMAIL =="

  # 1. 계정. 이미 있으면 search 로 가져온다
  RES=$(curl -s -X POST "$MEMBER/" -H "Content-Type: application/json" \
        -d "{\"apiKey\":\"$API_KEY\",\"userId\":\"$EMAIL\"}")
  USER_KEY=$(echo "$RES" | pick userKey)
  if [ -z "$USER_KEY" ]; then
    RES=$(curl -s -X POST "$MEMBER/search" -H "Content-Type: application/json" \
          -d "{\"apiKey\":\"$API_KEY\",\"userId\":\"$EMAIL\"}")
    USER_KEY=$(echo "$RES" | pick userKey)
  fi
  if [ -z "$USER_KEY" ]; then
    echo "  !! userKey 발급 실패: $RES"
    continue
  fi
  echo "  userKey  $USER_KEY"

  ACCOUNT_NO=""
  if [ "$DEPOSIT" != "-1" ]; then
    ACCOUNT_NO=$(call demandDeposit/createDemandDepositAccount \
      "{\"Header\":{$(hdr createDemandDepositAccount "$USER_KEY")},\"accountTypeUniqueNo\":\"$DD_PRODUCT\"}" \
      | pick accountNo)
    echo "  계좌     $ACCOUNT_NO"

    if [ "$DEPOSIT" -gt 0 ]; then
      call demandDeposit/updateDemandDepositAccountDeposit \
        "{\"Header\":{$(hdr updateDemandDepositAccountDeposit "$USER_KEY")},\"accountNo\":\"$ACCOUNT_NO\",\"transactionBalance\":\"$DEPOSIT\",\"transactionSummary\":\"seed\"}" > /dev/null
      echo "  입금     $DEPOSIT"
    fi
  else
    echo "  계좌     (미개설)"
  fi

  if [ "$LOAN" -gt 0 ]; then
    STATUS=$(call loan/createLoanApplication \
      "{\"Header\":{$(hdr createLoanApplication "$USER_KEY")},\"accountTypeUniqueNo\":\"$LOAN_PRODUCT\"}" \
      | pick status)
    echo "  대출심사 $STATUS"
    if [ "$STATUS" = "승인" ]; then
      LOAN_NO=$(call loan/createLoanAccount \
        "{\"Header\":{$(hdr createLoanAccount "$USER_KEY")},\"accountTypeUniqueNo\":\"$LOAN_PRODUCT\",\"loanBalance\":\"$LOAN\",\"withdrawalAccountNo\":\"$ACCOUNT_NO\"}" \
        | pick accountNo)
      echo "  대출계좌 $LOAN_NO"
    fi
  fi

  RATING=$(call loan/inquireMyCreditRating "{\"Header\":{$(hdr inquireMyCreditRating "$USER_KEY")}}" | pick ratingName)
  echo "  등급     $RATING"
  echo

  RESULT="$RESULT$EMAIL  $USER_KEY  $RATING\n"
done

echo "=============================="
echo "시드에 넣을 값"
echo "=============================="
printf "$RESULT"