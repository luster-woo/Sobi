package com.sobi.dashboard.controller;

import com.sobi.auth.jwt.JwtAuthenticationEntryPoint;
import com.sobi.auth.jwt.JwtAuthenticationFilter;
import com.sobi.auth.jwt.JwtProvider;
import com.sobi.dashboard.dto.DashboardResponse.PreEntrepreneur;
import com.sobi.dashboard.service.DashboardService;
import com.sobi.global.config.SecurityConfig;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class DashboardControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean DashboardService service;
    @MockitoBean JwtProvider jwtProvider;

    @Test
    void bearerTokenSubjectIsPassedToServiceAndResponseUses200() throws Exception {
        when(jwtProvider.parseClaims("token")).thenReturn(Jwts.claims().subject("42")
                .add("role", "ENTREPRENEUR").build());
        // 토큰의 과거 role과 달라도 서비스가 DB 기준으로 만든 응답을 그대로 내린다.
        when(service.getDashboard(42L)).thenReturn(new PreEntrepreneur(List.of(), List.of(), List.of()));
        mvc.perform(get("/api/v1/dashboard").contextPath("/api").header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.path").value("/api/v1/dashboard"))
                .andExpect(jsonPath("$.message").value("대시보드 조회에 성공하였습니다."))
                .andExpect(jsonPath("$.data.Loans").isArray())
                .andExpect(jsonPath("$.data.recentSalesHistory").doesNotExist());
        verify(service).getDashboard(42L);
    }

    @Test
    void missingTokenReturns401() throws Exception {
        mvc.perform(get("/api/v1/dashboard").contextPath("/api"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
}
