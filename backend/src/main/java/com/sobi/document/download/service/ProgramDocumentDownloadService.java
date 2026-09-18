package com.sobi.document.download.service;

import com.sobi.document.download.dto.DocumentDownload;

public interface ProgramDocumentDownloadService {
    DocumentDownload download(Long programDocumentId);
}
