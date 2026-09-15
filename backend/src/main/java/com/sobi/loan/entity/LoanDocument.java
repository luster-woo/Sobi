package com.sobi.loan.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 대출 상품의 필수 서류 목록. 데이터는 V20
@Entity
@Getter
@Table(name = "loan_document")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoanDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @Column(name = "doc_name", nullable = false, length = 100)
    private String docName;

    // SUBMIT(제출) / WRITE(작성)
    @Column(name = "type", nullable = false, length = 10)
    private String type;

    // 작성 서류 원본 양식 위치 (제출 서류는 NULL)
    @Column(name = "url", length = 500)
    private String url;
}
