package com.sobi.funding.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor

public class BatchRequest {


    private List<BatchItem> item;
}
