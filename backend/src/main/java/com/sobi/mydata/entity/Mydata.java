package com.sobi.mydata.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 마이데이터 목(mock). 사업자등록번호로 외부 기관 데이터를 흉내낸다.
 */
@Entity
@Getter
@Table(name = "mydata")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Mydata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String brn;
}