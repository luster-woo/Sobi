package com.sobi.mydata.service;

import com.sobi.mydata.dto.MydataLinkResponse;

public interface MydataService {

    /**
     * 마이데이터를 수집하고 지원사업 자격을 판정한다.
     * 외부 호출 때문에 15~40초 걸린다. 회원가입 직후 한 번 부른다.
     */
    MydataLinkResponse link(Long userId);
}