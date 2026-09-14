package com.sobi.bookmark.service;


import com.sobi.bookmark.dto.BookmarkListResponse;

public interface BookmarkService {

    void addBookmark(Long userId, Long programId, String type);

    void removeBookmark(Long userId, Long programId, String type);

    BookmarkListResponse getBookmarks(Long userId);

}
