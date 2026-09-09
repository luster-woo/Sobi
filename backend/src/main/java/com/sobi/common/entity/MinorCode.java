package com.sobi.common.entity;


import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "minor_code")
public class MinorCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sub_id", nullable = false)
    private SubCode subCode;

    @Column(name = "code", nullable = false, unique = true, length = 8)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Builder
    private MinorCode(SubCode subCode, String code, String name) {
        this.subCode = subCode;
        this.code = code;
        this.name = name;
    }
}