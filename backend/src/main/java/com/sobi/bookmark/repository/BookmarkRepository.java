package com.sobi.bookmark.repository;

import com.sobi.bookmark.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {


    boolean existsByUser_IdAndLoan_Id(Long userId, Long loanId);

    // 대출 상품 목록에서 즐겨찾기 여부를 한 번에 판단하기 위한 loanId 목록
    @Query("""
            SELECT b.loan.id
            FROM Bookmark b
            WHERE b.user.id = :userId
              AND b.loan IS NOT NULL
            """)
    List<Long> findLoanIdsByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT b.supportProgram.id FROM Bookmark b
            WHERE b.user.id = :userId AND b.supportProgram IS NOT NULL
            """)
    List<Long> findSupportProgramIdsByUserId(@Param("userId") Long userId);

    boolean existsByUser_IdAndSupportProgram_Id(Long userId, Long supportProgramId);

    long deleteByUser_IdAndLoan_Id(Long userId, Long loanId);

    long deleteByUser_IdAndSupportProgram_Id(Long userId, Long supportProgramId);

    List<Bookmark> findByUser_Id(Long userId);
}
