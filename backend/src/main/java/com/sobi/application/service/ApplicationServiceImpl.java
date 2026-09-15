package com.sobi.application.service;

import com.sobi.application.dto.ApplicationCreateResponse;
import com.sobi.application.dto.ApplicationDetailResponse;
import com.sobi.application.entity.Application;
import com.sobi.application.entity.ApplicationDocument;
import com.sobi.application.entity.ApplicationStatus;
import com.sobi.application.entity.ApplicationType;
import com.sobi.application.repository.ApplicationDocumentRepository;
import com.sobi.application.repository.ApplicationRepository;
import com.sobi.global.exception.BusinessException;
import com.sobi.global.exception.ErrorCode;
import com.sobi.loan.entity.Loan;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApplicationServiceImpl implements ApplicationService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final LoanRepository loanRepository;
    private final LoanDocumentRepository loanDocumentRepository;
    private final SupportProgramRepository supportProgramRepository;
    private final ProgramDocumentRepository programDocumentRepository;
    private final UserRepository userRepository;

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
     * 대출 신청 생성. 모집 기간 개념이 없어 기간 검증은 하지 않음
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
