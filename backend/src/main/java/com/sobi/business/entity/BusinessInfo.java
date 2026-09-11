package com.sobi.business.entity;

import com.sobi.common.entity.MinorCode;
import com.sobi.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "business_info",
        indexes = {
                @Index(
                        name = "idx_business_info_user",
                        columnList = "user_id"
                )
        }
)
public class BusinessInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // 나중에 User, MinorCode 구현되면 연결
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;


//    // 임시 userid
//    @Column(name = "user_id", nullable = false)
//    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_code_id", nullable = false)
    private MinorCode businessCode;


    @Column(name = "brn", nullable = false, unique = true, length = 255)
    private String brn;

    @Column(name = "business_name", nullable = false, length = 100)
    private String businessName;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "region", nullable = false, length = 100)
    private String region;

    @Column(name = "employee_count", nullable = false)
    private int employeeCount;

    @Column(name = "open_date", nullable = false)
    private LocalDate openDate;

    // user id, businessCodeId 나중에 객체형으로 바꿔야함
    @Builder
    private BusinessInfo(
            User user,
            MinorCode businessCode,
            String brn,
            String businessName,
            String address,
            String region,
            int employeeCount,
            LocalDate openDate
    ) {
        this.user = user;
        this.businessCode = businessCode;
        this.brn = brn;
        this.businessName = businessName;
        this.address = address;
        this.region = region;
        this.employeeCount = employeeCount;
        this.openDate = openDate;
    }
}