package com.sobi.application.entity;

import com.sobi.account.entity.Account;
import com.sobi.loan.entity.Loan;
import com.sobi.support.entity.SupportProgram;
import com.sobi.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "application")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_program_id")
    private SupportProgram supportProgram;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id")
    private Loan loan;

    // 신청 금액. 제출(submit) 시 저장하며 그 전에는 NULL
    @Column(name = "amount")
    private Long amount;

    // 출금(대출) / 지급(지원금) 계좌. 제출(submit) 시 저장
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "subject_at", nullable = false)
    private LocalDateTime subjectAt;

    @Column(name = "complete_at")
    private LocalDateTime completeAt;

    // 제출 후 금융망 심사에서 거절된 경우
    public void reject(String rejectReason, LocalDateTime completeAt) {
        this.status = ApplicationStatus.REJECTED.name();
        this.rejectReason = rejectReason;
        this.completeAt = completeAt;
    }

    // 제출 완료 (대출은 실행금 입금, 지원사업은 지급까지 끝난 상태)
    public void pay(Long amount, Account account, LocalDateTime completeAt) {
        this.amount = amount;
        this.account = account;
        this.status = ApplicationStatus.PAID.name();
        this.completeAt = completeAt;
    }
}
