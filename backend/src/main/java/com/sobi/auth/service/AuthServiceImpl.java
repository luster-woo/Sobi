package com.sobi.auth.service;

import com.sobi.auth.dto.EmailCheckResponse;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;

    @Override
    public EmailCheckResponse checkEmail(String email) {
        boolean check = userRepository.existsByEmail(email);

        return new EmailCheckResponse(check);
    }
}
