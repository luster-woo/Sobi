package com.sobi.auth.service;

import com.sobi.auth.dto.EmailCheckResponse;
import com.sobi.auth.repository.EmailCodeRepository;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailCodeRepository emailCodeRepository;
    private final MailService mailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public EmailCheckResponse checkEmail(String email) {
        boolean check = userRepository.existsByEmail(email);

        return new EmailCheckResponse(check);
    }

    @Override
    public void sendEmail(String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        emailCodeRepository.save(email, code);
        mailService.sendVerificationMail(email, code);
    }
}
