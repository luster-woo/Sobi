package com.sobi.support.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

// 지원사업의 필수 서류 목록. 신청 쪽에서는 읽기만 한다
@Entity
@Getter
@Table(name = "program_document")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProgramDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "support_program_id", nullable = false)
    private SupportProgram supportProgram;

    // 제출/작성 구분. 
    @Column(name = "type", nullable = false, length = 10)
    private String type;

    // 작성 서류 원본 양식 위치
    @Column(name = "url", length = 500)
    private String url;

    @Column(name = "doc_name", length = 200)
    private String docName;
}
