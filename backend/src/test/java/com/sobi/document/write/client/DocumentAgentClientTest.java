package com.sobi.document.write.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.document.write.clientDto.DraftCreateRequest;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class DocumentAgentClientTest {
    private static final String ID = "31eec32b-2569-409d-9f06-ce57365c9383";
    private static final String CREATE = "http://agent/api/v1/document-agent/drafts";
    private static final String DOWNLOAD = CREATE + "/" + ID + "/file";
    private MockRestServiceServer server;
    private DocumentAgentClient client;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder().baseUrl("http://agent");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new DocumentAgentClient(builder.build(), new ObjectMapper());
    }

    static String response() {
        return """
                {"draftId":"31eec32b-2569-409d-9f06-ce57365c9383","templateId":99,
                 "programDocumentId":680,"status":"COMPLETED",
                 "fileName":"draft-31eec32b-2569-409d-9f06-ce57365c9383.hwpx",
                 "writtenFieldCount":4,"leftBlankFieldCount":5,"unsupportedFieldCount":0}
                """;
    }

    @Test
    void create201UsesCamelCaseAndParsesMetadata() {
        server.expect(requestTo(CREATE)).andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("{\"templateId\":99,\"userId\":1}"))
                .andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON).body(response()));
        var result = client.createDraft(new DraftCreateRequest(99L, 1L));
        assertThat(result.getDraftId()).isEqualTo(ID);
        assertThat(result.getFileName()).isEqualTo("draft-" + ID + ".hwpx");
        assertThat(result.getTemplateId()).isEqualTo(99L);
        assertThat(result.getProgramDocumentId()).isEqualTo(680L);
        assertThat(result.getWrittenFieldCount()).isEqualTo(4);
        assertThat(result.getLeftBlankFieldCount()).isEqualTo(5);
        server.verify();
    }

    @Test
    void downloadReceivesBinary() {
        byte[] bytes = {80, 75, 3, 4, 0, (byte) 255};
        server.expect(requestTo(DOWNLOAD)).andExpect(method(HttpMethod.GET))
                .andExpect(header("Accept", "application/hwp+zip"))
                .andRespond(withSuccess(bytes, MediaType.parseMediaType("application/hwp+zip")));
        assertThat(client.downloadDraft(ID)).isEqualTo(bytes);
        server.verify();
    }

    @Test
    void emptyDownloadIsRejected() {
        server.expect(requestTo(DOWNLOAD)).andRespond(withSuccess(new byte[0], MediaType.parseMediaType("application/hwp+zip")));
        assertError(() -> client.downloadDraft(ID), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void wrongDownloadTypeIsRejected() {
        server.expect(requestTo(DOWNLOAD)).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertError(() -> client.downloadDraft(ID), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void notReadyErrorDoesNotLeakValues() {
        server.expect(requestTo(CREATE)).andRespond(withStatus(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON)
                .body("{\"detail\":{\"code\":\"DRAFT_NOT_READY\",\"message\":\"private@email.test /server/path\"}}"));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_DRAFT_NOT_READY);
    }

    @Test
    void create404MapsTemplateError() {
        server.expect(requestTo(CREATE)).andRespond(withResourceNotFound());
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_TEMPLATE_NOT_FOUND);
    }

    @Test
    void download404MapsFileError() {
        server.expect(requestTo(DOWNLOAD)).andRespond(withResourceNotFound());
        assertError(() -> client.downloadDraft(ID), ErrorCode.DOCUMENT_DRAFT_FILE_NOT_FOUND);
    }

    @ParameterizedTest
    @ValueSource(ints = {422, 500, 503})
    void unexpectedStatusesMapSafeExternalError(int status) {
        server.expect(requestTo(CREATE)).andRespond(withStatus(HttpStatus.valueOf(status))
                .body("private@email.test /server/path"));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void connectionOrTimeoutMapsSafeError() {
        server.expect(requestTo(CREATE)).andRespond(withException(new IOException("private@email.test")));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void downloadConnectionFailureMapsSafeError() {
        server.expect(requestTo(DOWNLOAD)).andRespond(withException(new IOException("/secret/path")));
        assertError(() -> client.downloadDraft(ID), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void malformed409BodyIsSafe() {
        server.expect(requestTo(CREATE)).andRespond(withStatus(HttpStatus.CONFLICT).body("not-json"));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "{}", "not-json"})
    void invalidCreationBodyIsSafe(String body) {
        server.expect(requestTo(CREATE)).andRespond(withStatus(HttpStatus.CREATED).contentType(MediaType.APPLICATION_JSON).body(body));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void filenameInjectionRejected() {
        String body = response().replace("draft-" + ID + ".hwpx", "x.hwpx\\r\\nX-Injected: yes");
        server.expect(requestTo(CREATE)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void mismatchedTemplateRejected() {
        server.expect(requestTo(CREATE)).andRespond(withSuccess(response().replace("\"templateId\":99", "\"templateId\":98"), MediaType.APPLICATION_JSON));
        assertError(() -> client.createDraft(new DraftCreateRequest(99L, 1L)), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
    }

    @Test
    void invalidDraftIdCannotChangeDownloadPath() {
        assertError(() -> client.downloadDraft("../../secret"), ErrorCode.DOCUMENT_AGENT_REQUEST_FAILED);
        server.verify();
    }

    private void assertError(Runnable action, ErrorCode expected) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(BusinessException.class, error -> {
            assertThat(error.getErrorCode()).isEqualTo(expected);
            assertThat(error.getCause()).isNull();
            assertThat(error.getMessage()).doesNotContain("private@email.test", "/server/path", "/secret/path");
        });
        server.verify();
    }
}
