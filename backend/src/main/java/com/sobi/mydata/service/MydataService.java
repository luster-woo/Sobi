package com.sobi.mydata.service;

import com.sobi.mydata.dto.MydataLinkResponse;

public interface MydataService {

    /**
     * 마이데이터를 수집하고 지원사업 자격을 판정한다.
     * 외부 호출 때문에 15~40초 걸린다. 회원가입 직후 한 번 부른다.
     */
    MydataLinkResponse link(Long userId);

    /**
     * 마이데이터를 다시 불러와 자격을 재판정한다.
     * 판정 1회에 GMS 크레딧이 약 100 나가므로 쿨다운이 걸려 있다.
     */
    MydataLinkResponse refresh(Long userId);
}