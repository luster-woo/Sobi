package com.sobi.bookmark.service;

import com.sobi.bookmark.entity.Bookmark;
import com.sobi.bookmark.repository.BookmarkRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.repository.LoanRepository;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.SupportProgramRepository;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.print.Book;

@Service
@RequiredArgsConstructor

public class BookmarkServiceImpl implements BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final SupportProgramRepository supportProgramRepository;
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;


    @Override
    public void addBookmark(Long userId, Long programId,  String type) {

        // 타입이랑 프로그램아이디로 일단 객체를 가져오고
        if(type.equals("LOAN")) {
            Loan loan = loanRepository.findById(programId).orElseThrow(
                    () -> new BusinessException(ErrorCode.LOAN_NOT_FOUND)
            );
            addLoan(loan, userId, programId);

        }else if(type.equals("SUPPORT")) {
            SupportProgram supportProgram = supportProgramRepository.findById(programId).orElseThrow(
                    () -> new BusinessException(ErrorCode.SUPPROT_NOT_FOUND)
            );
            addSupportProgram(supportProgram,  userId, programId);
        }else{
            throw new BusinessException(ErrorCode.TYPE_BAD_REQUEST);
        }


    }

    private void addLoan(Loan loan, Long userId, Long programId) {

        // userid, programid기반 검색 -> 이미 등록되어 있는지 검증
        if(bookmarkRepository.existsByUser_IdAndLoan_Id(userId, programId)) {
            throw new BusinessException(ErrorCode.BOOKMARK_ALREADY_EXISTS);
        }


        // 없으면 등록
        User user = userRepository.findById(userId).orElseThrow(
                () -> new BusinessException(ErrorCode.NO_USER)
        );

        Bookmark bookmark = Bookmark.ofLoan(user, loan);

        bookmarkRepository.save(bookmark);

    }

    private void addSupportProgram(SupportProgram supportProgram, Long userId, Long programId) {


        // userid, programid기반 검색 -> 이미 등록되어 있는지 검증
        if(bookmarkRepository.existsByUser_IdAndSupportProgram_Id(userId, programId)) {
            throw new BusinessException(ErrorCode.BOOKMARK_ALREADY_EXISTS);
        }
        // 없으면 등록
        User user = userRepository.findById(userId).orElseThrow(
                () -> new BusinessException(ErrorCode.NO_USER)
        );

        Bookmark bookmark = Bookmark.ofSupportProgram(user, supportProgram);

        bookmarkRepository.save(bookmark);
    }


}
