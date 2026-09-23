package com.sobi.document.download.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

@Getter
@AllArgsConstructor
public class DocumentDownload {
    private final Resource resource;
    private final String fileName;
    private final MediaType mediaType;
    private final long contentLength;
}
