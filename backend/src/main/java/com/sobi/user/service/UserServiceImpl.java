package com.sobi.user.service;

import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.user.dto.NotificationResponse;
import com.sobi.user.dto.PasswordChangeReqeust;
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
}