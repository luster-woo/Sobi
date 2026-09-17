package com.sobi.user.service;

import com.sobi.user.dto.*;

public interface UserService {

    NotificationResponse toggleNotification(Long userId);

    void changePassword(Long userId, PasswordChangeReqeust request);

    void withdraw(Long userId);

    BirthDateResponse updateBirthDate(Long userId, BirthDateRequest request);

    UserMeResponse getMe(Long userId);
}