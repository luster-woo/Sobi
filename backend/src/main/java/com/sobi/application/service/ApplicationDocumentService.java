package com.sobi.application.service;

import com.sobi.application.dto.ApplicationDocumentUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ApplicationDocumentService {

    ApplicationDocumentUploadResponse upload(Long userId, Long applicationDocumentId, MultipartFile file);
}
