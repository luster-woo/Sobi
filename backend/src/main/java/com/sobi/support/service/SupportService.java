package com.sobi.support.service;

import com.sobi.support.dto.SupportProgramListResponse;
import com.sobi.support.dto.SupportSearchCondition;

public interface SupportService {

    SupportProgramListResponse getPrograms(Long userId, SupportSearchCondition condition);
}