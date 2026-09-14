package com.sobi.bookmark.service;

import com.sobi.application.entity.Application;
import com.sobi.application.repository.ApplicationRepository;
import com.sobi.bookmark.dto.BookmarkListResponse;
import com.sobi.bookmark.dto.LoanList;
import com.sobi.bookmark.dto.SupportProgramList;
import com.sobi.bookmark.entity.Bookmark;
import com.sobi.bookmark.repository.BookmarkRepository;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.entity.SuggestLoan;
import com.sobi.loan.repository.LoanRepository;
import com.sobi.loan.repository.SuggestLoanRepository;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.support.repository.SupportProgramRepository;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.print.Book;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor

public class BookmarkServiceImpl implements BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final SupportProgramRepository supportProgramRepository;
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final SuggestSupportProgramRepository suggestSupportProgramRepository;
    private final SuggestLoanRepository suggestloanRepository;
    private final BusinessReporitory businessReporitory;


    @Override
    public BookmarkListResponse getBookmarks(Long userId) {

        // 북마크 리스트 가져오고
        List<Bookmark> bookmarkList = bookmarkRepository.findByUser_Id(userId);


        // 돌리면서 리스트 만들고
        List<LoanList> loanLists = new ArrayList<>();
        List<SupportProgramList>  supportProgramLists = new ArrayList<>();

        for (Bookmark bookmark : bookmarkList) {
            if (bookmark.getSupportProgram() == null) {
                LoanList loanlist = LoanList.from(bookmark.getLoan());
                // status 조회
                // application 목록에 있는지 조회해보고
                Application application = applicationRepository.findByUser_IdAndLoan_Id(userId, loanlist.getLoanId());
                // 있으면 status 삽입 후 리스트에 추가
                if (application != null) {
                    loanlist.setStatus(application.getStatus());
                    loanLists.add(loanlist);
                    continue;
                }
                // 없으면 suggest 목록 조회
                BusinessInfo businessInfo = businessReporitory.findByUserId(userId);
                SuggestLoan suggestloan = suggestloanRepository.findByBusinessIdAndLoan_Id(businessInfo.getId(), bookmark.getLoan().getId());

                // 있으면 가능
                if (suggestloan != null) {
                    loanlist.setStatus("POSSIBLE");
                    loanLists.add(loanlist);
                    continue;
                }

                // 없으면 불가능
                loanlist.setStatus("IMPOSSIBLE");
                loanLists.add(loanlist);

            }else{
                SupportProgramList supportProgramList = SupportProgramList.from(bookmark.getSupportProgram());

                Application application = applicationRepository.findByUser_IdAndSupportProgram_Id(userId, supportProgramList.getSupportProgramId());


                if (application != null) {
                    supportProgramList.setStatus(application.getStatus());
                    supportProgramLists.add(supportProgramList);
                    continue;
                }

                BusinessInfo businessInfo = businessReporitory.findByUserId(userId);
                SuggestSupportProgram suggestSupportProgram = suggestSupportProgramRepository.findByBusinessIdAndSupportProgram_Id(businessInfo.getId(), supportProgramList.getSupportProgramId());

                if (suggestSupportProgram != null) {
                    supportProgramList.setStatus("POSSIBLE");
                    supportProgramLists.add(supportProgramList);
                    continue;
                }

                // 없으면 불가능
                supportProgramList.setStatus("IMPOSSIBLE");
                supportProgramLists.add(supportProgramList);

            }

        }


        // 리턴

        BookmarkListResponse bookmarkListResponse = BookmarkListResponse.builder()
                .loanList(loanLists)
                .supportProgramList(supportProgramLists)
                .build();

        return bookmarkListResponse;
    }

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

    @Override
    @Transactional
    public void removeBookmark(Long userId, Long programId, String type) {
        if(type.equals("LOAN")) {
            removeLoan(userId, programId);

        }else if(type.equals("SUPPORT")) {
            removeSupportProgram(userId, programId);
        }else{
            throw new BusinessException(ErrorCode.TYPE_BAD_REQUEST);
        }

    }
    private void removeLoan(Long userId, Long programId) {
        // 존재하는지 검사 + 삭제
        long deletedCount = bookmarkRepository.deleteByUser_IdAndLoan_Id(userId, programId);

        if (deletedCount == 0) {
            throw new BusinessException(ErrorCode.BOOKMARK_NOT_FOUND);
        }

    }

    private void removeSupportProgram(Long userId, Long programId) {
        long deletedCount = bookmarkRepository.deleteByUser_IdAndSupportProgram_Id(userId, programId);

        if (deletedCount == 0) {
            throw new BusinessException(ErrorCode.BOOKMARK_NOT_FOUND);
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
