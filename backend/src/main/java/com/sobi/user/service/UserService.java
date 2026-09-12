package com.sobi.user.service;

import com.sobi.user.dto.NotificationResponse;
import com.sobi.user.dto.PasswordChangeReqeust;

public interface UserService {

    NotificationResponse toggleNotification(Long userId);

    void changePassword(Long userId, PasswordChangeReqeust request);
}