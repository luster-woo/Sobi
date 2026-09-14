package com.sobi.insurance.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "insurance")
public class Insurance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 30)
    private String name;

    @Column(name = "info", nullable = false, length = 255)
    private String info;

    @Column(name = "condition", nullable = false, columnDefinition = "TEXT")
    private String condition;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private InsuranceCategory category;
}
