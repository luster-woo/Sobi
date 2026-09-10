package com.sobi.auth.service;

import com.sobi.auth.dto.EmailCheckResponse;

public interface AuthService {

    EmailCheckResponse checkEmail(String email);

    void sendEmail(String email);
}
