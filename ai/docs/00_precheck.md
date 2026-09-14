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

## 임베딩 모델 선정 (2026-09-14)
KURE-v1과 동일 조건 비교(사업개요 222건 코퍼스, 골든셋 12프로필, 전국 사업 제외).
KoE5 Recall@10 0.368 / @30 0.579, KURE-v1 0.316 / 0.526. 속도·메모리 동일.
격차가 1건(19개 중)으로 유의하지 않아 기존 KoE5 유지. scripts/compare_embed.py로 재현 가능.

## 공고문 포맷 (기업마당 소상공인 222건)
- pdf 104 / hwp 86 / hwpx 25 / 이미지 6 / docx 1
- hwpx: zip 내 Contents/section*.xml 직접 파싱 → 5/5 성공, 표는 <hp:tbl> 태그로 존재
- hwp: pyhwp(+six) hwp5txt 5/5 성공, 단 표 내용 유실 → 적재는 hwp5html(표 보존 확인)로
- 이미지 6건은 OCR 경로 필요 (MinerU 내장 OCR 또는 OCR 파트 모델 활용)
- 결론: 215/222(97%)가 파이썬 라이브러리만으로 텍스트 추출 가능, 외부 바이너리 불필요

## 결론
- 실시간 질의 지연 충분 → ONNX int8 양자화 보류
- 배치 임베딩은 EC2 밖에서 실행 (청크 3,000개 기준 약 25분)
- uvicorn worker 1개 고정 (worker당 2.6GB)