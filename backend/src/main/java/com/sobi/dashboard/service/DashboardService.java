package com.sobi.dashboard.service;

import com.sobi.dashboard.dto.DashboardResponse;

public interface DashboardService {
    DashboardResponse getDashboard(Long userId);
}
