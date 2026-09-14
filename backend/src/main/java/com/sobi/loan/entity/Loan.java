package com.sobi.loan.entity;



import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "loan")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "account_name",
            nullable = false,
            length = 30
    )
    private String accountName;

    @Column(
            name = "account_type_unique_no",
            length = 20
    )
    private String accountTypeUniqueNo;

    @Column(
            name = "bank_name",
            nullable = false,
            length = 255
    )
    private String bankName;

    @Column(
            name = "bank_code",
            nullable = false,
            length = 3
    )
    private String bankCode;

    @Column(length = 255)
    private String description;

    @Column(
            name = "interest_rate",
            nullable = false
    )
    private Double interestRate;

    @Column(
            name = "min_loan_balance",
            nullable = false
    )
    private Long minLoanBalance;

    @Column(
            name = "max_loan_balance",
            nullable = false
    )
    private Long maxLoanBalance;

    @Column(nullable = false)
    private Integer period;

    @Column(
            name = "rating_name",
            nullable = false,
            length = 3
    )
    private String ratingName;

    @Column(
            name = "is_start",
            nullable = false
    )
    private Boolean isStart;

    @Column(
            name = "employee_num",
            nullable = false
    )
    private Boolean employeeNum;

    @Column(
            name = "firm_age",
            nullable = false
    )
    private Integer firmAge;

    // 금융망에 등록된 상품 고유번호 연결 (LoanProductSyncService 에서만 호출)
    public void registerFinanceProduct(String accountTypeUniqueNo) {
        this.accountTypeUniqueNo = accountTypeUniqueNo;
    }
}