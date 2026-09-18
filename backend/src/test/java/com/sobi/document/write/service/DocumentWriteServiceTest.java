package com.sobi.document.write.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.document.write.client.DocumentAgentClient;
import com.sobi.document.write.clientDto.DraftCreateRequest;
import com.sobi.document.write.clientDto.DraftCreateResponse;
import com.sobi.document.write.repository.CompletedDocumentTemplateQuery;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.support.entity.ProgramDocument;
import com.sobi.support.repository.ProgramDocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocumentWriteServiceTest {
    ProgramDocumentRepository documents = mock(ProgramDocumentRepository.class);
    CompletedDocumentTemplateQuery templates = mock(CompletedDocumentTemplateQuery.class);
    DocumentAgentClient client = mock(DocumentAgentClient.class);
    DocumentWriteService service = new DocumentWriteServiceImpl(documents, templates, client);
    ProgramDocument document = mock(ProgramDocument.class);
    DraftCreateResponse draft;

    @BeforeEach
    void setUp() throws Exception {
        when(documents.findById(680L)).thenReturn(Optional.of(document));
        when(document.getType()).thenReturn("작성용");
        when(templates.findLatestId(680L)).thenReturn(Optional.of(99L));
        draft = new ObjectMapper().readValue("""
                {"draftId":"31eec32b-2569-409d-9f06-ce57365c9383","templateId":99,
                 "programDocumentId":680,"status":"COMPLETED","fileName":"draft-example.hwpx"}
                """, DraftCreateResponse.class);
        when(client.createDraft(any())).thenReturn(draft);
        when(client.downloadDraft(draft.getDraftId())).thenReturn(new byte[]{80,75,3,4});
    }

    @Test
    void looksUpTemplateThenCreatesAndDownloadsWithAuthenticatedId() {
        var result = service.writeDocument(1L,680L);
        var order = inOrder(documents,templates,client);
        order.verify(documents).findById(680L);
        order.verify(templates).findLatestId(680L);
        var request = org.mockito.ArgumentCaptor.forClass(DraftCreateRequest.class);
        order.verify(client).createDraft(request.capture());
        order.verify(client).downloadDraft(draft.getDraftId());
        assertThat(request.getValue().getTemplateId()).isEqualTo(99L);
        assertThat(request.getValue().getUserId()).isEqualTo(1L);
        assertThat(result.getContent()).isEqualTo(new byte[]{80,75,3,4});
        assertThat(result.getFileName()).isEqualTo(draft.getFileName());
        assertThat(result.getContentType()).isEqualTo("application/hwp+zip");
    }

    @Test
    void missingProgramDocument() {
        when(documents.findById(680L)).thenReturn(Optional.empty());
        assertFailure(ErrorCode.PROGRAM_DOCUMENT_NOT_FOUND);
        verifyNoInteractions(templates,client);
    }

    @Test
    void submissionDocumentRejected() {
        when(document.getType()).thenReturn("제출용");
        assertFailure(ErrorCode.DOCUMENT_NOT_WRITABLE);
        verifyNoInteractions(templates,client);
    }

    @Test
    void noCompletedTemplateIncludingFailedOnlyRejected() {
        when(templates.findLatestId(680L)).thenReturn(Optional.empty());
        assertFailure(ErrorCode.DOCUMENT_TEMPLATE_NOT_FOUND);
        verifyNoInteractions(client);
    }

    @Test
    void createFailureStopsDownload() {
        when(client.createDraft(any())).thenThrow(new BusinessException(ErrorCode.DOCUMENT_DRAFT_NOT_READY));
        assertFailure(ErrorCode.DOCUMENT_DRAFT_NOT_READY);
        verify(client,never()).downloadDraft(any());
    }

    @Test
    void otherProgramDocumentResponseRejected() throws Exception {
        when(client.createDraft(any())).thenReturn(new ObjectMapper().readValue(
                "{\"programDocumentId\":681}",DraftCreateResponse.class));
        assertFailure(ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
        verify(client,never()).downloadDraft(any());
    }

    @Test
    void authenticationRequiredBeforeLookup() {
        assertThatThrownBy(() -> service.writeDocument(null,680L)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
        verifyNoInteractions(documents,templates,client);
    }

    private void assertFailure(ErrorCode code) {
        assertThatThrownBy(() -> service.writeDocument(1L,680L)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(code));
    }
}
