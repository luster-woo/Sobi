package com.sobi.application.service;

/**
 * 제출 서류가 업로드되어 AI 검증을 시작해야 함을 알린다.
 * 트랜잭션 커밋 후에 DocumentValidationProcessor 가 비동기로 받는다.
 *
 * @param storedPath 업로드 시점의 파일 경로. 검증 도중 재업로드되면 DB 값과 달라져 결과를 버리는 기준이 된다
 */
public record DocumentUploadedEvent(Long applicationDocumentId, String storedPath, String extension) {
}
