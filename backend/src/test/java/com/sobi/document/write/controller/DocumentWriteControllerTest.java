package com.sobi.document.write.controller;

import com.sobi.auth.jwt.JwtAuthenticationEntryPoint;
import com.sobi.auth.jwt.JwtAuthenticationFilter;
import com.sobi.auth.jwt.JwtProvider;
import com.sobi.document.write.dto.DocumentWriteResult;
import com.sobi.document.write.service.DocumentWriteService;
import com.sobi.global.config.SecurityConfig;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DocumentWriteController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class DocumentWriteControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean DocumentWriteService service;
    @MockitoBean JwtProvider jwtProvider;
    private final byte[] bytes={80,75,3,4,0,(byte)255};

    @BeforeEach
    void setUp() {
        when(jwtProvider.parseClaims("token")).thenReturn(Jwts.claims().subject("1")
                .add("role","ENTREPRENEUR").build());
        when(service.writeDocument(1L,680L)).thenReturn(new DocumentWriteResult(bytes,
                "draft-31eec32b-2569-409d-9f06-ce57365c9383.hwpx","application/hwp+zip"));
    }

    @Test
    void authenticatedPostReturnsAttachmentBytesNotApiResponse() throws Exception {
        mvc.perform(post("/api/v1/document/write/680").contextPath("/api")
                        .header("Authorization","Bearer token").header("Origin","http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/hwp+zip"))
                .andExpect(content().bytes(bytes))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"draft-31eec32b-2569-409d-9f06-ce57365c9383.hwpx\""))
                .andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().stringValues("Access-Control-Expose-Headers","Authorization","Content-Disposition"));
        verify(service).writeDocument(1L,680L);
    }

    @Test
    void bodyAndQueryCannotOverrideAuthenticatedUser() throws Exception {
        mvc.perform(post("/api/v1/document/write/680").contextPath("/api")
                        .header("Authorization","Bearer token").queryParam("userId","2")
                        .contentType("application/json").content("{\"userId\":2}"))
                .andExpect(status().isOk());
        verify(service).writeDocument(1L,680L);
        verify(service,never()).writeDocument(2L,680L);
        var method=DocumentWriteController.class.getMethod("writeDocument",Long.class,Long.class);
        assertThat(method.getParameters()).noneMatch(p -> p.isAnnotationPresent(org.springframework.web.bind.annotation.RequestBody.class)
                || p.isAnnotationPresent(org.springframework.web.bind.annotation.RequestParam.class));
    }

    @Test
    void unauthenticatedRequestIs401() throws Exception {
        mvc.perform(post("/api/v1/document/write/680").contextPath("/api"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void notReadyUsesExistingJsonErrorHandler() throws Exception {
        when(service.writeDocument(1L,680L)).thenThrow(new BusinessException(ErrorCode.DOCUMENT_DRAFT_NOT_READY));
        mvc.perform(post("/api/v1/document/write/680").contextPath("/api")
                        .header("Authorization","Bearer token"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.statusCode").value(409))
                .andExpect(jsonPath("$.error.code").value("DOCUMENT_004"));
    }

    @Test
    void externalFailureUsesExistingJsonErrorHandler() throws Exception {
        when(service.writeDocument(1L,680L)).thenThrow(new BusinessException(ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED));
        mvc.perform(post("/api/v1/document/write/680").contextPath("/api")
                        .header("Authorization","Bearer token"))
                .andExpect(status().isBadGateway())
                .andExpect(content().contentTypeCompatibleWith("application/json"));
    }

    @Test
    void invalidProgramDocumentIdIs400() throws Exception {
        mvc.perform(post("/api/v1/document/write/0").contextPath("/api")
                        .header("Authorization","Bearer token"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
