package com.sobi.user.service;

import com.sobi.user.dto.NotificationResponse;

public interface UserService {

    NotificationResponse toggleNotification(Long userId);
}