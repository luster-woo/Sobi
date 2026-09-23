package com.sobi.document.download.controller;

import com.sobi.auth.jwt.JwtAuthenticationEntryPoint;
import com.sobi.auth.jwt.JwtAuthenticationFilter;
import com.sobi.auth.jwt.JwtProvider;
import com.sobi.document.download.dto.DocumentDownload;
import com.sobi.document.download.service.ProgramDocumentDownloadService;
import com.sobi.global.config.SecurityConfig;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProgramDocumentDownloadController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class ProgramDocumentDownloadControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ProgramDocumentDownloadService service;
    @MockitoBean JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        when(jwtProvider.parseClaims("token")).thenReturn(Jwts.claims().subject("1")
                .add("role", "ENTREPRENEUR").build());
    }

    @Test
    void returnsBinaryAndUtf8Filename() throws Exception {
        byte[] bytes = {80, 75, 3, 4};
        when(service.download(12L)).thenReturn(new DocumentDownload(new ByteArrayResource(bytes),
                "사업계획서.hwpx", MediaType.parseMediaType("application/vnd.hancom.hwpx"), bytes.length));
        var result = mvc.perform(get("/api/v1/program-documents/12/download").contextPath("/api")
                        .header("Authorization", "Bearer token").header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(content().bytes(bytes))
                .andExpect(content().contentType("application/vnd.hancom.hwpx"))
                .andExpect(header().longValue("Content-Length", 4))
                .andExpect(header().stringValues("Access-Control-Expose-Headers", "Authorization", "Content-Disposition"))
                .andReturn();
        String header = result.getResponse().getHeader("Content-Disposition");
        assertThat(header).startsWith("attachment;").contains("filename*=UTF-8''");
        assertThat(ContentDisposition.parse(header).getFilename()).isEqualTo("사업계획서.hwpx");
    }

    @ParameterizedTest
    @EnumSource(value = ErrorCode.class, names = {"PROGRAM_DOCUMENT_NOT_FOUND", "DOCUMENT_FILE_NOT_FOUND",
            "INVALID_DOCUMENT_PATH", "DOCUMENT_FILE_READ_FAILED"})
    void errorsUseExistingJsonHandler(ErrorCode code) throws Exception {
        when(service.download(12L)).thenThrow(new BusinessException(code));
        mvc.perform(get("/api/v1/program-documents/12/download").contextPath("/api")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().is(code.getStatus().value()))
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.error.code").value(code.getCode()))
                .andExpect(header().doesNotExist("Content-Disposition"));
    }

    @Test
    void existingAuthenticationIsRequired() throws Exception {
        mvc.perform(get("/api/v1/program-documents/12/download").contextPath("/api"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void invalidIdIsBadRequest() throws Exception {
        mvc.perform(get("/api/v1/program-documents/0/download").contextPath("/api")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
