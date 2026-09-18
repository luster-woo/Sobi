package com.sobi.document.write.repository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class CompletedDocumentTemplateQuery {
    private final EntityManager entityManager;

    public Optional<Long> findLatestId(Long programDocumentId) {
        // AI 내부 Entity를 복제하지 않고 필요한 scalar ID만 읽는다.
        List<?> ids = entityManager.createNativeQuery("""
                SELECT dt.id
                FROM document_template dt
                JOIN program_document pd ON pd.id = dt.program_document_id
                WHERE dt.program_document_id = :programDocumentId
                  AND dt.parse_status = 'COMPLETED'
                  AND pd.type = '작성용'
                ORDER BY dt.schema_version DESC, dt.id DESC
                """)
                .setParameter("programDocumentId", programDocumentId)
                .setMaxResults(1)
                .getResultList();
        return ids.isEmpty() ? Optional.empty() : Optional.of(((Number) ids.getFirst()).longValue());
    }
}
