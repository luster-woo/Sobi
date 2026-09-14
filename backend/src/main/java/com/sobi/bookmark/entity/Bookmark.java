package com.sobi.bookmark.entity;



import com.sobi.loan.entity.Loan;
import com.sobi.support.entity.SupportProgram;
import com.sobi.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookmark")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id")
    private Loan loan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_program_id")
    private SupportProgram supportProgram;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private Bookmark(
            User user,
            Loan loan,
            SupportProgram supportProgram
    ) {
        this.user = user;
        this.loan = loan;
        this.supportProgram = supportProgram;
    }

    public static Bookmark ofLoan(
            User user,
            Loan loan
    ) {
        return new Bookmark(
                user,
                loan,
                null
        );
    }

    public static Bookmark ofSupportProgram(
            User user,
            SupportProgram supportProgram
    ) {
        return new Bookmark(
                user,
                null,
                supportProgram
        );
    }
}