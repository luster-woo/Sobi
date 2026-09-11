package com.sobi.account.entity;


import com.sobi.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "account",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_account_no",
                        columnNames = "account_no"
                )
        },
        indexes = {
                @Index(
                        name = "idx_account_user",
                        columnList = "user_id"
                )
        }
)
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "user_id",
            nullable = false
    )
    private User user;

//    // 임시 userid
//    @Column(name = "user_id", nullable = false)
//    private Long userId;

    @Column(name = "bank_name", nullable = false, length = 20)
    private String bankName;

    @Column(name = "account_no", nullable = false, length = 16, unique = true)
    private String accountNo;

    @Column(name = "type", nullable = false, length = 10)
    private String type;

    @Column(name = "transfer_account", length = 16)
    private String transferAccount;

    @Builder
    private Account(
            User user,
            String bankName,
            String accountNo,
            String type,
            String transferAccount
    ) {
        this.user = user;
        this.bankName = bankName;
        this.accountNo = accountNo;
        this.type = type;
        this.transferAccount = transferAccount;
    }
}