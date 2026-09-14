package com.sobi.bookmark.dto;

import lombok.*;

import java.util.List;


@Getter
@Setter
@NoArgsConstructor

@AllArgsConstructor
@Builder
public class BookmarkListResponse {

    private List<LoanList> loanList;

    private List<SupportProgramList> supportProgramList;

}
