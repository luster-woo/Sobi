package com.sobi.application.service;

import com.sobi.application.dto.ApplicationCreateResponse;
import com.sobi.application.dto.ApplicationDetailResponse;
import com.sobi.application.dto.ApplicationListResponse;
import com.sobi.application.dto.ApplicationSummaryResponse;
import com.sobi.application.dto.ApplicationSubmitRequest;
import com.sobi.application.dto.ApplicationSubmitResponse;
import com.sobi.application.entity.Application;
import com.sobi.application.entity.ApplicationDocument;
import com.sobi.application.entity.ApplicationStatus;
import com.sobi.application.entity.ApplicationStatusFilter;
import com.sobi.application.entity.ApplicationType;
import com.sobi.application.entity.ValidationStatus;
import com.sobi.account.entity.Account;
import com.sobi.account.repository.AccountRepository;
import com.sobi.business.repository.BusinessReporitory;
import com.sobi.application.repository.ApplicationDocumentRepository;
import com.sobi.application.repository.ApplicationRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.global.storage.LocalFileStorage;
import com.sobi.loan.client.SsafyLoanClient;
import com.sobi.loan.clientDto.SsafyLoanAccount;
import com.sobi.loan.dto.EligibilityResult;
import com.sobi.loan.dto.LoanEligibility;
import com.sobi.loan.entity.Loan;
import com.sobi.loan.service.LoanEligibilityChecker;
import com.sobi.loan.repository.LoanDocumentRepository;
import com.sobi.loan.repository.LoanRepository;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.repository.ProgramDocumentRepository;
import com.sobi.support.repository.SupportProgramRepository;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationServiceImpl implements ApplicationService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    private static final String APPROVED_DECISION = "승인";            // 금융망 심사 결과
    private static final String COMMON_ACCOUNT_TYPE = "COMMON";       // 수시입출금 계좌
    private static final String LOAN_ACCOUNT_TYPE = "LOAN";           // 대출 계좌
    private static final String REJECT_REASON_CREDIT_RATING = "금융망 심사 거절 (신용등급 기준 미달)";

    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final LoanRepository loanRepository;
    private final LoanDocumentRepository loanDocumentRepository;
    private final SupportProgramRepository supportProgramRepository;
    private final ProgramDocumentRepository programDocumentRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final BusinessReporitory businessReporitory;
    private final LoanEligibilityChecker eligibilityChecker;
    private final SsafyLoanClient loanClient;
    private final LocalFileStorage fileStorage;

    /**
     * [신청] 클릭 시 호출. 작성 중(PREPARING) 신청이 있으면 새로 만들지 않고 그 신청을 반환
     * 진행 중이거나 지급 완료된 상품은 새 신청을 막고, 반려된 상품은 다시 신청가능
     */
    @Override
    @Transactional
    public ApplicationCreateResponse create(Long userId, String type, Long programId) {

        ApplicationType applicationType = ApplicationType.from(type);
        User user = findUser(userId);

        // 신청 종류마다 상품 조회·최근 신청 조회·필수 서류 테이블이 달라 분기
        return switch (applicationType) {
            case LOAN -> createLoanApplication(userId, user, programId);
            case SUPPORT -> createSupportApplication(userId, user, programId);
        };
    }

    /**
     * 서류 제출 페이지. 남의 신청이면 존재 여부를 드러내지 않도록 없는 신청으로 응답한다.
     */
    @Override
    public ApplicationDetailResponse getDetail(Long userId, Long applicationId) {

        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // id 와 사용자를 함께 조건으로 걸어 내 신청만 조회
        Application application = applicationRepository.findByIdAndUser_Id(applicationId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_NOT_FOUND));

        // 서류 이름을 위해 대출·지원사업 필수 서류를 함께 조회
        List<ApplicationDocument> documents =
                applicationDocumentRepository.findAllWithRequiredDocumentByApplicationId(application.getId());

        return ApplicationDetailResponse.of(application, documents);
    }

    /**
     * 신청 현황 목록. 개수는 필터와 상관없이 전체 기준이라 진행 중 / 완료 탭 숫자로 바로 쓸 수 있다
     */
    @Override
    public ApplicationListResponse getApplications(Long userId, String status) {

        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // 잘못된 값이면 여기서 400 (컨트롤러에서 enum 으로 받으면 500 이 나간다). 값이 없으면 null = 전체
        ApplicationStatusFilter filter = ApplicationStatusFilter.from(status);

        // 상품명을 함께 쓰므로 대출 상품·지원사업까지 한 번에 조회 (최신순)
        List<Application> applications = applicationRepository.findAllWithProgramByUserId(userId);

        // 탭 숫자는 필터와 상관없이 전체 기준이라 필터 전 목록에서 센다
        int inProgressCount = (int) applications.stream()
                .filter(application -> ApplicationStatusFilter.IN_PROGRESS.contains(
                        ApplicationStatus.valueOf(application.getStatus())))
                .count();

        // 신청 건수가 적어 DB 대신 메모리에서 필터링 (페이지네이션 없음)
        List<ApplicationSummaryResponse> filtered = applications.stream()
                .filter(application -> filter == null
                        || filter.contains(ApplicationStatus.valueOf(application.getStatus())))
                .map(ApplicationSummaryResponse::from)
                .toList();

        return ApplicationListResponse.of(applications.size(), inProgressCount, filtered);
    }

    /**
     * 신청 취소. 서류 제출 페이지의 [취소] 버튼
     * 작성 중일 때만 허용한다. 제출 이후에는 금융망 심사·가입이 진행돼 지우면 기록이 어긋난다
     */
    @Override
    @Transactional
    public void cancel(Long userId, Long applicationId) {

        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        Application application = applicationRepository.findByIdAndUser_Id(applicationId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_NOT_FOUND));

        // 제출(SUBMITTED) 이후에는 금융망 심사·가입 기록이 있어 삭제하면 어긋난다
        if (ApplicationStatus.valueOf(application.getStatus()) != ApplicationStatus.PREPARING) {
            throw new BusinessException(ErrorCode.APPLICATION_CANCEL_NOT_ALLOWED);
        }

        // 서류 행은 application_document 의 ON DELETE CASCADE 로 함께 삭제
        applicationRepository.delete(application);

        // 업로드된 실제 파일은 신청 폴더째 지운다. 삭제가 롤백되면 파일이 남아 있어야 하므로 커밋 후에
        runAfterCommit(() -> fileStorage.deleteApplicationQuietly(applicationId));
    }

    // 트랜잭션 커밋 후 실행한다. 트랜잭션 밖(단위 테스트 등)에서는 바로 실행한다
    private void runAfterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    /**
     * [신청하기]. 
     * 대출: 조건 재판정 → 금융망 심사(2.7.5) → 승인 시 가입(2.7.7) → 대출 계좌 저장 → PAID
     * 지원사업: 금융망 호출 없이 금액·계좌 없이 바로 PAID
     */
    @Override
    @Transactional
    public ApplicationSubmitResponse submit(Long userId, Long applicationId, ApplicationSubmitRequest request) {

        User user = findUser(userId);

        Application application = applicationRepository.findByIdAndUser_Id(applicationId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_NOT_FOUND));

        if (ApplicationStatus.valueOf(application.getStatus()) != ApplicationStatus.PREPARING) {
            throw new BusinessException(ErrorCode.APPLICATION_SUBMIT_NOT_ALLOWED);
        }

        // 프론트 버튼만으로는 우회할 수 있으므로 서버에서 다시 검사
        validateDocumentsPassed(applicationId);

        if (application.getLoan() != null) {
            return submitLoan(userId, user, application, request);
        }
        if (application.getSupportProgram() != null) {
            return submitSupport(application);
        }
        // 상품·사업이 삭제된 신청(ON DELETE SET NULL)은 제출할 수 없다
        throw new BusinessException(ErrorCode.APPLICATION_SUBMIT_NOT_ALLOWED);
    }

    // 대출 신청(싸피 금융망 API)
    private ApplicationSubmitResponse submitLoan(
            Long userId,
            User user,
            Application application,
            ApplicationSubmitRequest request
    ) {

        Loan loan = application.getLoan();

        // 작성 중에 신용등급·사업자 정보가 바뀌었을 수 있어 제출 시점에 다시 판정
        EligibilityResult eligibility = eligibilityChecker.check(
                loan, user.getCreditRating(), businessReporitory.findByUserId(userId));

        if (eligibility.getEligibility() != LoanEligibility.ELIGIBLE) {
            throw new BusinessException(ErrorCode.APPLICATION_NOT_ELIGIBLE);
        }

        // 금융망에 보내기 전에 검증해 A1037(가입 불가 금액)·A1003(계좌 오류)을 미리 막는다
        Long amount = requireAmount(request, loan.getMinLoanBalance(), loan.getMaxLoanBalance());
        Account account = findMyDepositAccount(userId, request.getAccountId());

        // 심사는 신청 즉시 결과가 나온다. 거절도 정상 응답이라 신청을 반려로 남긴다
        String decision = callFinance(() ->
                loanClient.createLoanApplication(user.getUserKey(), loan.getAccountTypeUniqueNo())
        ).getApplication().getStatus();

        if (!APPROVED_DECISION.equals(decision)) {
            application.reject(REJECT_REASON_CREDIT_RATING, LocalDateTime.now(KOREA_ZONE));
            return ApplicationSubmitResponse.of(application, null);
        }

        // 가입하면 대출금이 선택한 계좌로 입금되고, 다음날부터 같은 계좌에서 자동 상환된다
        SsafyLoanAccount loanAccount = callFinance(() ->
                loanClient.createLoanAccount(
                        user.getUserKey(), loan.getAccountTypeUniqueNo(), amount, account.getAccountNo())
        ).getAccount();

        // 개설된 대출 계좌를 우리 DB 에도 남긴다 (상환 관리에서 사용)
        accountRepository.save(
                Account.builder()
                        .user(user)
                        .bankName(loan.getBankName())
                        .accountNo(loanAccount.getAccountNo())
                        .type(LOAN_ACCOUNT_TYPE)
                        .transferAccount(account.getAccountNo())
                        .build()
        );

        application.pay(amount, account, LocalDateTime.now(KOREA_ZONE));

        return ApplicationSubmitResponse.of(application, loanAccount.getAccountNo());
    }

    // 지원 사업 신청
    private ApplicationSubmitResponse submitSupport(Application application) {

        SupportProgram program = application.getSupportProgram();

        // 작성 중에 마감됐을 수 있으므로 제출 시점에도 모집 기간을 확인한다
        validateApplicationPeriod(program);

        // 지원사업은 지원 형태(지원금·대출·기타)와 상관없이 우리가 돈을 옮기지 않아 금액·계좌를 받지 않는다
        // 금융망 상품이 아니라 심사 없이 바로 지급 처리
        application.pay(null, null, LocalDateTime.now(KOREA_ZONE));

        return ApplicationSubmitResponse.of(application, null);
    }

    // 서류가 하나라도 검증 통과가 아니면 제출할 수 없다 (서류가 없는 지원사업은 바로 통과)
    private void validateDocumentsPassed(Long applicationId) {

        boolean allPassed = applicationDocumentRepository
                .findAllWithRequiredDocumentByApplicationId(applicationId).stream()
                .allMatch(document -> ValidationStatus.PASSED.name().equals(document.getValidationStatus()));

        if (!allPassed) {
            throw new BusinessException(ErrorCode.APPLICATION_DOCUMENT_NOT_COMPLETED);
        }
    }

    // 상품의 최소·최대 금액 범위 검사
    private Long requireAmount(ApplicationSubmitRequest request, Long minBalance, Long maxBalance) {

        Long amount = request.getAmount();

        if (amount == null || amount <= 0
                || (minBalance != null && amount < minBalance)
                || (maxBalance != null && amount > maxBalance)) {
            throw new BusinessException(ErrorCode.APPLICATION_AMOUNT_INVALID);
        }
        return amount;
    }

    // 본인 명의의 수시입출금(COMMON) 계좌만 허용. 계좌번호 문자열로 받으면 남의 계좌도 막을 수 없다
    private Account findMyDepositAccount(Long userId, Long accountId) {

        if (accountId == null) {
            throw new BusinessException(ErrorCode.APPLICATION_ACCOUNT_INVALID);
        }

        Account account = accountRepository.findByIdAndUser_Id(accountId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_ACCOUNT_INVALID));

        if (!COMMON_ACCOUNT_TYPE.equals(account.getType())) {
            throw new BusinessException(ErrorCode.APPLICATION_ACCOUNT_INVALID);
        }
        return account;
    }

    // 금융망 오류(A1084 이미 승인, A1014 잔액 부족 등)는 모두 500 으로 내보낸다
    private <T> T callFinance(Supplier<T> financeCall) {
        try {
            return financeCall.get();
        } catch (RuntimeException e) {
            throw new BusinessException(ErrorCode.FINANCE_API_ERROR);
        }
    }

    /**
     * 대출 신청 생성. 
     * 1. 금융망에 등록된 상품인지 확인 → 2. 최근 신청 확인 → 3. 신청 생성 → 4. 필수 서류 행 생성
     */
    private ApplicationCreateResponse createLoanApplication(Long userId, User user, Long loanId) {

        Loan loan = findRegisteredLoan(loanId);

        // 작성 중인 신청이 있으면 새로 만들지 않고 이어서 작성
        Optional<Long> preparingId = checkLatestApplication(
                applicationRepository.findFirstByUser_IdAndLoan_IdOrderByIdDesc(userId, loan.getId())
        );
        if (preparingId.isPresent()) {
            return ApplicationCreateResponse.from(preparingId.get());
        }

        Application application = saveNewApplication(Application.builder().user(user).loan(loan));

        // 상품의 필수 서류마다 미제출 행을 미리 만든다
        List<ApplicationDocument> documents = loanDocumentRepository.findAllByLoan_IdOrderByIdAsc(loan.getId())
                .stream()
                .map(loanDocument -> ApplicationDocument.notSubmitted(application, loanDocument))
                .toList();

        applicationDocumentRepository.saveAll(documents);

        return ApplicationCreateResponse.from(application.getId());
    }

    /**
     * 지원사업 신청 생성. 지원 형태(지원금 / 대출 / 기타)와 무관하게 같은 흐름
     * 1. 지원사업 확인 → 2. 모집 기간 확인 → 3. 최근 신청 확인 → 4. 신청 생성 → 5. 필수 서류 행 생성
     */
    private ApplicationCreateResponse createSupportApplication(Long userId, User user, Long supportProgramId) {

        SupportProgram program = supportProgramRepository.findById(supportProgramId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUPPROT_NOT_FOUND));

        // 이어서 작성하려는 경우에도 기간이 지났으면 막기 위해 최근 신청 확인보다 먼저 검사
        validateApplicationPeriod(program);

        // 작성 중인 신청이 있으면 새로 만들지 않고 이어서 작성
        Optional<Long> preparingId = checkLatestApplication(
                applicationRepository.findFirstByUser_IdAndSupportProgram_IdOrderByIdDesc(userId, program.getId())
        );
        if (preparingId.isPresent()) {
            return ApplicationCreateResponse.from(preparingId.get());
        }

        Application application = saveNewApplication(Application.builder().user(user).supportProgram(program));

        // 필수 서류가 없는 지원사업은 서류 행 없이 생성된다 (바로 신청하기 가능)
        List<ApplicationDocument> documents =
                programDocumentRepository.findAllBySupportProgram_IdOrderByIdAsc(program.getId())
                        .stream()
                        .map(programDocument -> ApplicationDocument.notSubmitted(application, programDocument))
                        .toList();

        applicationDocumentRepository.saveAll(documents);

        return ApplicationCreateResponse.from(application.getId());
    }

    /**
     * 같은 상품의 최근 신청으로 새 신청 가능 여부를 판단한다.
     * 작성 중이면 그 신청 id 를 돌려주고(이어서 작성), 진행 중·지급 완료면 막고, 없거나 반려면 빈 값(새로 생성)
     */
    private Optional<Long> checkLatestApplication(Optional<Application> latest) {

        if (latest.isEmpty()) {
            return Optional.empty();
        }

        // DB 컬럼이 String 이라 enum 으로 변환해 비교
        ApplicationStatus latestStatus = ApplicationStatus.valueOf(latest.get().getStatus());

        if (latestStatus == ApplicationStatus.PREPARING) {
            return Optional.of(latest.get().getId());
        }
        if (latestStatus.blocksNewApplication()) {
            throw new BusinessException(ErrorCode.APPLICATION_ALREADY_IN_PROGRESS);
        }
        return Optional.empty();
    }

    // 모집 기간 밖이면 신청 불가. 시작·마감일이 모두 없으면 예산 소진 시 마감이라 허용
    private void validateApplicationPeriod(SupportProgram program) {

        LocalDate today = LocalDate.now(KOREA_ZONE);

        boolean notStarted = program.getStartDate() != null && today.isBefore(program.getStartDate());
        boolean ended = program.getEndDate() != null && today.isAfter(program.getEndDate());

        if (notStarted || ended) {
            throw new BusinessException(ErrorCode.APPLICATION_PERIOD_CLOSED);
        }
    }

    /**
     * 조회 후 생성 사이에 동시 요청이 들어오면 둘 다 검사를 통과하므로,
     * DB 부분 유니크 인덱스(uq_application_user_*_active)가 중복을 막고 여기서 409 로 바꾼다.
     * id 가 IDENTITY 라 save 시점에 INSERT 가 실행되어 이 위치에서 예외를 잡을 수 있다.
     */
    private Application saveNewApplication(Application.ApplicationBuilder builder) {
        try {
            return applicationRepository.save(
                    builder
                            .status(ApplicationStatus.PREPARING.name())
                            .subjectAt(LocalDateTime.now(KOREA_ZONE))
                            .build()
            );
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.APPLICATION_ALREADY_IN_PROGRESS);
        }
    }

    // 인증 없이 호출되면 401 로 응답
    private User findUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    // 금융망에 등록되지 않은 상품은 [신청하기] 시 심사·가입을 할 수 없으므로 없는 상품으로 취급
    private Loan findRegisteredLoan(Long loanId) {
        return loanRepository.findById(loanId)
                .filter(loan -> loan.getAccountTypeUniqueNo() != null)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
    }
}
