package com.sobi.auth.service;

import com.sobi.auth.dto.*;
import com.sobi.auth.jwt.JwtProperties;
import com.sobi.auth.jwt.JwtProvider;
import com.sobi.auth.oauth.GoogleOAuthClient;
import com.sobi.auth.oauth.GoogleUserInfo;
import com.sobi.auth.repository.EmailCodeRepository;
import com.sobi.auth.repository.RefreshTokenRepository;
import com.sobi.auth.repository.ResetTokenRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.external.ssafy.client.member.SsafyMemberClient;
import com.sobi.user.entity.Provider;
import com.sobi.user.entity.Role;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailCodeRepository emailCodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ResetTokenRepository resetTokenRepository;

    private final MailService mailService;

    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;

    private final SsafyMemberClient ssafyMemberClient;
    private final GoogleOAuthClient googleOAuthClient;

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
                .birthDate(request.getBirthDate())      // ← 추가
                .provider(Provider.LOCAL)
                .role(Role.PREENTREPRENEUR)
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

        return issueTokens(user, null);
    }

    @Override
    @Transactional
    public LoginResponse oauthLogin(String provider, OAuthLoginRequest request) {
        if (!"google".equalsIgnoreCase(provider)) {
            throw new BusinessException(ErrorCode.OAUTH_PROVIDER_NOT_SUPPORTED);
        }

        GoogleUserInfo googleUser = googleOAuthClient.getUserInfo(request.getCode(), request.getRedirectUri());

        User user = userRepository.findByEmail(googleUser.getEmail()).orElse(null);

        if (user == null) {
            User newUser = User.builder()
                    .email(googleUser.getEmail())
                    .name(googleUser.getName())
                    .provider(Provider.GOOGLE)
                    .providerId(googleUser.getProviderId())
                    .role(Role.PREENTREPRENEUR)
                    .userKey(ssafyMemberClient.getOrCreateUserKey(googleUser.getEmail()))
                    .build();
            return issueTokens(userRepository.save(newUser), true);
        }

        // 이메일로 먼저 가입한 계정 → 소셜 계정 연결 API로 유도
        if (user.getProvider() != Provider.GOOGLE) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_REGISTERED);
        }
        if (user.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.NO_USER);
        }

        return issueTokens(user, null);
    }

    private LoginResponse issueTokens(User user, Boolean isNewUser) {
        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = jwtProvider.createRefreshToken(user);
        refreshTokenRepository.save(user.getId(), refreshToken, Duration.ofMillis(jwtProperties.getRefreshExp()));

        return LoginResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresIn(jwtProvider.getAccessExpSeconds())
                .user(LoginResponse.UserInfo.from(user))
                .refreshToken(refreshToken)
                .isNewUser(isNewUser)
                .build();
    }

    @Override
    @Transactional
    public SocialLinkResponse linkSocial(Long userId, String provider, OAuthLoginRequest request) {
        if (!"google".equalsIgnoreCase(provider)) {
            throw new BusinessException(ErrorCode.OAUTH_PROVIDER_NOT_SUPPORTED);
        }

        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        if (user.getProvider() == Provider.GOOGLE) {
            throw new BusinessException(ErrorCode.ALREADY_SOCIAL_ACCOUNT);
        }

        GoogleUserInfo googleUser = googleOAuthClient.getUserInfo(request.getCode(), request.getRedirectUri());

        // 다른 사람의 구글 계정을 붙이지 못하도록 이메일 일치 확인
        if (!user.getEmail().equalsIgnoreCase(googleUser.getEmail())) {
            throw new BusinessException(ErrorCode.SOCIAL_EMAIL_MISMATCH);
        }

        user.convertToSocial(Provider.GOOGLE, googleUser.getProviderId());

        return new SocialLinkResponse(user.getId(), user.getEmail(), user.getProvider().name());
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

    @Override
    public ResetVerifyResponse verifyEmailForReset(String email, String verificationCode) {

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null || user.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_EXPIRED);
        }
        if (user.getPassword() == null) {
            throw new BusinessException(ErrorCode.SOCIAL_LOGIN_RESET_NOT_ALLOWED);
        }

        String savedCode = emailCodeRepository.find(email);

        if (savedCode == null) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_EXPIRED);
        }
        if (!savedCode.equals(verificationCode)) {
            throw new BusinessException(ErrorCode.EMAIL_CODE_MISMATCH);
        }

        emailCodeRepository.delete(email);

        String resetToken = UUID.randomUUID().toString();
        resetTokenRepository.save(resetToken, email);

        return new ResetVerifyResponse(true, resetToken);
    }

    @Override
    @Transactional
    public void resetPassword(PasswordResetRequest request) {

        String email = resetTokenRepository.findEmail(request.getResetToken());

        if (email == null) {
            throw new BusinessException(ErrorCode.INVALID_RESET_TOKEN);
        }

        User user = userRepository.findByEmail(email)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));

        resetTokenRepository.delete(request.getResetToken());   // 1회용
        refreshTokenRepository.delete(user.getId());            // 기존 세션 무효화
    }

}
