package com.sobi.document.write.service;

import com.sobi.document.write.dto.DocumentWriteResult;

public interface DocumentWriteService {
    DocumentWriteResult writeDocument(Long userId, Long programDocumentId);
}
