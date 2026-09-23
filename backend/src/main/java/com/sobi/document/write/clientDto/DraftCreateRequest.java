package com.sobi.document.write.clientDto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DraftCreateRequest {
    private final Long templateId;
    private final Long userId;
}
