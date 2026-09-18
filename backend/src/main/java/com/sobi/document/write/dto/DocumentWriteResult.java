package com.sobi.document.write.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DocumentWriteResult {
    private final byte[] content;
    private final String fileName;
    private final String contentType;
}
