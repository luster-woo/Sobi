package com.sobi.user.service;

import com.sobi.auth.repository.RefreshTokenRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.user.dto.*;
import com.sobi.user.entity.Provider;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    @Transactional
    public NotificationResponse toggleNotification(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        return new NotificationResponse(user.toggleNotification());
    }

    @Override
    @Transactional
    public void changePassword(Long userId, PasswordChangeReqeust request) {

        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        if (user.getProvider() != Provider.LOCAL) {
            throw new BusinessException(ErrorCode.LOCAL_LOGIN_ONLY);
        }

        user.updatePassword(passwordEncoder.encode(request.getPassword()));
    }

    @Override
    @Transactional
    public void withdraw(Long userId) {

        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        user.withdraw();
        refreshTokenRepository.delete(userId);      // 세션 무효화
    }

    @Override
    @Transactional
    public BirthDateResponse updateBirthDate(Long userId, BirthDateRequest request) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        user.updateBirthDate(request.getBirthDate());

        return new BirthDateResponse(user.getBirthDate());
    }

    @Override
    @Transactional(readOnly = true)
    public UserMeResponse getMe(Long userId) {

        User user = userRepository.findById(userId)
                .filter(found -> found.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        return UserMeResponse.from(user);
    }
}