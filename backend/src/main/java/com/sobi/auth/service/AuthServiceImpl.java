package com.sobi.auth.service;

import com.sobi.auth.dto.EmailCheckResponse;
import com.sobi.auth.dto.EmailVerifyResponse;
import com.sobi.auth.repository.EmailCodeRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
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

        // 이메일 전송 남발 금지를 위한 최소한 장치 (1분의 쿨다운으로 대기 강제)
        if (emailCodeRepository.isCoolingDown(email)) {
            throw new BusinessException(ErrorCode.EMAIL_SEND_COOLDOWN);
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        emailCodeRepository.save(email, code);
        mailService.sendVerificationMail(email, code);
        emailCodeRepository.startCoolDown(email);
    }

    @Override
    public EmailVerifyResponse verifyEmail(String email, String verificationCode) {

        String savedCode = emailCodeRepository.find(email);

        if (savedCode == null) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_EXPIRED);
        }

        if (!savedCode.equals(verificationCode)) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_MISMATCH);
        }


        // 인증 코드 삭제, 재사용 방지
        emailCodeRepository.delete(email);
        // 회원가입 시 확인하고 진행
        emailCodeRepository.saveVerifed(email);

        return new EmailVerifyResponse(true);
    }
}
