package com.sobi.common.entity;


import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "sub_code")
public class SubCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "major_id", nullable = false)
    private MajorCode majorCode;

    @Column(name = "code", nullable = false, unique = true, length = 8)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @OneToMany(mappedBy = "subCode", fetch = FetchType.LAZY)
    private List<MinorCode> minorCodes = new ArrayList<>();

    @Builder
    private SubCode(MajorCode majorCode, String code, String name) {
        this.majorCode = majorCode;
        this.code = code;
        this.name = name;
    }
}