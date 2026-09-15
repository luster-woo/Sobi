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
}