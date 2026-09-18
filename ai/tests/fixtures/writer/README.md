# card_blank.hwpx provenance

실제 2026 경상북도 소상공인 카드수수료 지원사업의 **미작성 서식**이다.
사용자가 지정한 manual/normalized 폴더의 normalized-u4uw8zks.hwpx를 2026-09-18 확인했다.
모든 신청인 입력 셀/동의 선택 셀이 빈 원본 상태임을 Parser로 확인했다.
ZIP에는 이미지/미리보기/사용자 입력 결과가 없으며, Contents/content.hpf의 creator와 lastsaveby 값만 제거했다.
section0.xml, header.xml 및 나머지 archive entry의 내용은 원본과 동일하다.

- 원본 SHA-256: 2848eefce9017b95524631680627ebf8ac8c6c0137ef94f31740c6a923b55cb9
- fixture SHA-256: 6aa3ad63599814c5052c4ef06d51ac1db7e120af2cdd1fb559ced40e0832954a
- 사용 테스트: tests/test_writer_policy.py의 RealCardFixtureTests
- 작성 데이터는 테스트용 가상 값이며 TemporaryDirectory에만 생성/삭제한다.

검증 범위: 16개 Candidate/StoredLocation 생성, fake SourceService 기반 실제 Runtime,
9개 필드 작성/7개 필드 보존, DATE helper 문단 XML 보존, 모든 비작성 셀 XML 보존,
원본 bytes 보존, ZIP/Parser round-trip. 한글 편집기의 실제 렌더링 검증은 별도다.
