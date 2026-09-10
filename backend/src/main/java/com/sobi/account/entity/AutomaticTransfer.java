package com.sobi.account.entity;



import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "automatic_transfer",
        indexes = {
                @Index(
                        name = "idx_automatic_transfer_account",
                        columnList = "account_id"
                )
        }
)
public class AutomaticTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "bank_name", nullable = false, length = 20)
    private String bankName;

    @Column(name = "account_no", nullable = false, length = 16)
    private String accountNo;

    @Builder
    private AutomaticTransfer(
            Account account,
            String bankName,
            String accountNo
    ) {
        this.account = account;
        this.bankName = bankName;
        this.accountNo = accountNo;
    }
}