package com.sobi.business.dto;


import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class BusinessInfoResponse2 {

    private List<BusinessInfoResponse> businessInfoList;



}
