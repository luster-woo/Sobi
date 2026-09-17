package com.sobi.support.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PageMeta {

    private final int number;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean first;
    private final boolean last;

    public static PageMeta of(int page, int size, long totalElements) {
        int totalPages = (int) Math.ceil((double) totalElements / size);

        return PageMeta.builder()
                .number(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .first(page == 0)
                .last(page >= totalPages - 1)
                .build();
    }
}