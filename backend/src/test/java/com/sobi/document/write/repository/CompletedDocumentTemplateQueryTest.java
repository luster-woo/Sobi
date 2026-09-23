package com.sobi.document.write.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompletedDocumentTemplateQueryTest {
    private final EntityManager entityManager = mock(EntityManager.class);
    private final Query query = mock(Query.class);
    private final CompletedDocumentTemplateQuery repository = new CompletedDocumentTemplateQuery(entityManager);

    @BeforeEach
    void setUp() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter("programDocumentId",680L)).thenReturn(query);
        when(query.setMaxResults(1)).thenReturn(query);
    }

    @Test
    void returnsScalarTemplateIdAndBindsProgramDocumentId() {
        when(query.getResultList()).thenReturn(List.of(99L));
        assertThat(repository.findLatestId(680L)).contains(99L);
        verify(query).setParameter("programDocumentId",680L);
    }

    @Test
    void completedOnlyAndLatestSchemaVersionAreDatabaseSelectionContract() {
        when(query.getResultList()).thenReturn(List.of(99L));
        repository.findLatestId(680L);
        var sql=ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(sql.capture());
        assertThat(sql.getValue()).contains("dt.program_document_id = :programDocumentId",
                "dt.parse_status = 'COMPLETED'", "pd.type = '작성용'",
                "JOIN program_document pd ON pd.id = dt.program_document_id",
                "ORDER BY dt.schema_version DESC, dt.id DESC");
        verify(query).setMaxResults(1);
        // FAILED/PARSING versions are excluded before sorting, including newer versions.
    }

    @Test
    void noCompletedRowsReturnsEmpty() {
        when(query.getResultList()).thenReturn(List.of());
        assertThat(repository.findLatestId(680L)).isEmpty();
    }
}
