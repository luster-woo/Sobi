package com.sobi.support.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SupportProgramListResponse {

    private final List<SupportProgramSummaryResponse> programs;
    private final PageMeta page;
}