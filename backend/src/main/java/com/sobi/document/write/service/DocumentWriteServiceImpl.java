package com.sobi.document.write.service;

import com.sobi.document.write.client.DocumentAgentClient;
import com.sobi.document.write.clientDto.DraftCreateRequest;
import com.sobi.document.write.dto.DocumentWriteResult;
import com.sobi.document.write.repository.CompletedDocumentTemplateQuery;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.support.repository.ProgramDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DocumentWriteServiceImpl implements DocumentWriteService {
    private final ProgramDocumentRepository programDocuments;
    private final CompletedDocumentTemplateQuery templates;
    private final DocumentAgentClient client;

    // 외부 HTTP 호출 동안 DB transaction을 유지하지 않는다. DB 수정/파일 저장도 없다.
    @Override
    public DocumentWriteResult writeDocument(Long userId, Long programDocumentId) {
        if (userId == null || userId <= 0) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        if (programDocumentId == null || programDocumentId <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
        var document = programDocuments.findById(programDocumentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROGRAM_DOCUMENT_NOT_FOUND));
        if (!"작성용".equals(document.getType())) {
            throw new BusinessException(ErrorCode.DOCUMENT_NOT_WRITABLE);
        }
        Long templateId = templates.findLatestId(programDocumentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_TEMPLATE_NOT_FOUND));
        var draft = client.createDraft(new DraftCreateRequest(templateId, userId));
        if (!programDocumentId.equals(draft.getProgramDocumentId())) {
            throw new BusinessException(ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
        }
        byte[] content = client.downloadDraft(draft.getDraftId());
        return new DocumentWriteResult(content, draft.getFileName(), DocumentAgentClient.HWPX_CONTENT_TYPE);
    }
}
