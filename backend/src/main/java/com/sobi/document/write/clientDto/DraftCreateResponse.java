package com.sobi.document.write.clientDto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DraftCreateResponse {
    private String draftId;
    private Long templateId;
    private Long programDocumentId;
    private String status;
    private String fileName;
    private int writtenFieldCount;
    private int leftBlankFieldCount;
    private int unsupportedFieldCount;
}
