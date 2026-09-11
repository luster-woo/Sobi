package com.sobi.auth.service;

import com.sobi.auth.dto.*;
import com.sobi.auth.jwt.JwtProperties;
import com.sobi.auth.jwt.JwtProvider;
import com.sobi.auth.repository.EmailCodeRepository;
import com.sobi.auth.repository.RefreshTokenRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ssafy.client.member.SsafyMemberClient;
import com.sobi.user.entity.Provider;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailCodeRepository emailCodeRepository;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;
    private final SsafyMemberClient ssafyMemberClient;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final RefreshTokenRepository refreshTokenRepository;

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

    @Override
    @Transactional
    public void signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        if (!emailCodeRepository.isVerified(request.getEmail())) {
            throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        String userKey = ssafyMemberClient.getOrCreateUserKey(request.getEmail());

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .provider(Provider.LOCAL)
                .userKey(userKey)
                .build();

        userRepository.save(user);

        emailCodeRepository.deleteVerified(request.getEmail());
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOGIN_FAILED));

        // 소셜 전용 계정(password null)·탈퇴 계정도 동일 에러로 처리 → 계정 존재 여부 노출 방지
        if (user.getPassword() == null
                || user.getDeletedAt() != null
                || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.LOGIN_FAILED);
        }

        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = jwtProvider.createRefreshToken(user);
        refreshTokenRepository.save(user.getId(), refreshToken, Duration.ofMillis(jwtProperties.getRefreshExp()));

        return LoginResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(jwtProvider.getAccessExpSeconds())
                .user(LoginResponse.UserInfo.from(user))
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public RefreshResponse refresh(String refreshToken) {

        if (refreshToken == null) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        Long userId = jwtProvider.getUserId(refreshToken);

        String saved = refreshTokenRepository.find(userId);
        if (saved == null || !saved.equals(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }


        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        return new RefreshResponse(jwtProvider.createAccessToken(user));
    }

    @Override
    public void logout(Long userId) {
        refreshTokenRepository.delete(userId);
    }
}
