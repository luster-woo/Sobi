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
import com.sobi.loan.dto.LoanEligibility;
import com.sobi.loan.dto.LoanStatus;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.entity.SuggestLoan;
import com.sobi.loan.repository.LoanRepository;
import com.sobi.loan.repository.SuggestLoanRepository;
import com.sobi.support.dto.SupportStatus;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.SuggestSupportProgramRepository;
import com.sobi.support.repository.SupportProgramRepository;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        List<Bookmark> bookmarkList = bookmarkRepository.findByUser_Id(userId);

        // 예비창업자는 사업자 정보가 없다. 판정이 불가능하므로 null 을 그대로 흘린다
        BusinessInfo business = businessReporitory.findByUserId(userId);
        Long businessId = business == null ? null : business.getId();

        List<LoanList> loanLists = new ArrayList<>();
        List<SupportProgramList> supportProgramLists = new ArrayList<>();

        for (Bookmark bookmark : bookmarkList) {
            if (bookmark.getSupportProgram() == null) {
                loanLists.add(toLoanList(bookmark, userId, businessId));
            } else {
                supportProgramLists.add(toSupportProgramList(bookmark, userId, businessId));
            }
        }

        return BookmarkListResponse.builder()
                .loanList(loanLists)
                .supportProgramList(supportProgramLists)
                .build();
    }

    private LoanList toLoanList(Bookmark bookmark, Long userId, Long businessId) {

        LoanList loanList = LoanList.from(bookmark.getLoan());

        Application application =
                applicationRepository.findByUser_IdAndLoan_Id(userId, loanList.getLoanId());

        // suggest_loan 은 자격이 되는 상품만 담는다. 행이 없으면 불가
        boolean suggested = businessId != null
                && suggestloanRepository
                .findByBusinessIdAndLoan_Id(businessId, loanList.getLoanId()) != null;

        LoanStatus status = LoanStatus.of(
                suggested ? LoanEligibility.ELIGIBLE : LoanEligibility.INELIGIBLE,
                application == null ? null : application.getStatus()
        );

        loanList.setStatus(status.name());
        return loanList;
    }

    private SupportProgramList toSupportProgramList(Bookmark bookmark, Long userId, Long businessId) {

        SupportProgramList supportProgramList = SupportProgramList.from(bookmark.getSupportProgram());

        Application application = applicationRepository.findByUser_IdAndSupportProgram_Id(
                userId, supportProgramList.getSupportProgramId());

        // 마이데이터 미연동이면 판정 행이 없다
        SuggestSupportProgram suggest = businessId == null
                ? null
                : suggestSupportProgramRepository.findByBusinessIdAndSupportProgram_Id(
                businessId, supportProgramList.getSupportProgramId());

        SupportStatus status = SupportStatus.of(
                suggest == null ? null : suggest.getStatus(),
                application == null ? null : application.getStatus()
        );

        supportProgramList.setStatus(status.name());
        return supportProgramList;
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
