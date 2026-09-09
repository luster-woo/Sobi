package com.sobi.business.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "verify")
public class Verify {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brn", nullable = false, unique = true, length = 30)
    private String brn;

    @Column(name = "name", nullable = false, length = 30)
    private String name;

    @Column(name = "type", nullable = false, length = 30)
    private String type;

    @Column(name = "business_name", nullable = false, length = 100)
    private String businessName;

    @Column(name = "business_code_id")
    private Long businessCodeId;

    @Column(name = "business_code_name", nullable = false, length = 100)
    private String businessCodeName;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "open_date", nullable = false)
    private LocalDate openDate;

    @Column(name = "is_close", nullable = false)
    private boolean isClose;

    @Column(name = "employee_count", nullable = false)
    private int employeeCount;

    @Column(name = "region", nullable = false, length = 100)
    private String region;

    @Builder
    private Verify(
            String brn,
            String name,
            String type,
            String businessName,
            Long businessCodeId,
            String businessCodeName,
            String address,
            LocalDate openDate,
            boolean isClose,
            int employeeCount,
            String region
    ) {
        this.brn = brn;
        this.name = name;
        this.type = type;
        this.businessName = businessName;
        this.businessCodeId = businessCodeId;
        this.businessCodeName = businessCodeName;
        this.address = address;
        this.openDate = openDate;
        this.isClose = isClose;
        this.employeeCount = employeeCount;
        this.region = region;
    }
}