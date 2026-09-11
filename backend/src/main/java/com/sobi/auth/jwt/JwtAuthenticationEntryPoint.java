package com.sobi.auth.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.response.ApiResponse;
import com.sobi.global.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 인증 필요한 경로에 인증 없이 접근 시 401 응답.
 * 필터가 담아둔 토큰 오류(만료/위조)가 있으면 그 코드로, 없으면 AUTH_010.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        Object attribute = request.getAttribute(JwtAuthenticationFilter.EXCEPTION_ATTRIBUTE);
        ErrorCode errorCode = attribute instanceof BusinessException e
                ? e.getErrorCode()
                : ErrorCode.UNAUTHORIZED;

        ApiResponse<Void> body = ApiResponse.fail(
                errorCode.getStatus(),
                errorCode.getMessage(),
                ErrorResponse.of(errorCode.getCode()),
                request
        );

        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), body);
    }
}