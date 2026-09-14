package com.sobi.bookmark.controller;


import com.sobi.bookmark.entity.Bookmark;
import com.sobi.bookmark.service.BookmarkService;
import com.sobi.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/bookmark")
@RequiredArgsConstructor
public class BookmarkController {
    private final BookmarkService bookmarkService;

    @PostMapping("/{programId}")
    public ResponseEntity<ApiResponse<Void>> addBookmark(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long programId,
            @RequestParam String type,
            HttpServletRequest request
    ) {

        bookmarkService.addBookmark(userId, programId, type);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "관심목록 등록에 성공했습니다.",
                        request
                ));


    }


}
