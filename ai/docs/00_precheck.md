# 0단계 사전 검증 결과

## GMS
- `gpt-4o-mini` `gpt-4.1-mini` `gpt-4.1` `gpt-4o` 전부 호출 성공, 응답 0.6~1.7s
- `response_format={"type":"json_object"}` 통과 → 검증 응답 JSON 강제 가능
- `/gmsapi/key-info`는 httpx 기본 UA로 500 → `User-Agent: curl/8.0` 헤더 추가 시 정상
- 잔여 크레딧: (숫자 기입)

## KoE5 (CPU, 로컬)
- 로드 114s (다운로드 2.24GB 포함, 캐시 후 재로드는 수 초), 상주 메모리 +2.61GB
- max_seq 512 / dim 1024 확인
- 유사도: 정답 passage 0.616, 오답 0.26·0.21 → 프리픽스 정상 동작
- 질의 1개 61ms / passage 10개 4.7s / 50개 23.8s (약 0.5s/청크)

## 결론
- 실시간 질의 지연 충분 → ONNX int8 양자화 보류
- 배치 임베딩은 EC2 밖에서 실행 (청크 3,000개 기준 약 25분)
- uvicorn worker 1개 고정 (worker당 2.6GB)