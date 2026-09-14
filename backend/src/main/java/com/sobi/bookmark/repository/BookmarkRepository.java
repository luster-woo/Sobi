package com.sobi.bookmark.repository;

import com.sobi.bookmark.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {


    boolean existsByUser_IdAndLoan_Id(Long userId, Long loanId);

    boolean existsByUser_IdAndSupportProgram_Id(Long userId, Long supportProgramId);
}
