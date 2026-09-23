package com.sobi.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "password", length = 255)
    private String password;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "credit_rating", length = 3)
    private CreditRating creditRating;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", length = 10, nullable = false)
    private Provider provider;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "notification", nullable = false)
    private boolean notification;

    @Column(name = "user_key", length = 60, nullable = false)
    private String userKey;

    // 가입 시 필요한 값들만 builder로 노출
    @Builder
    private User(String email, String password, String name, LocalDate birthDate, Role role,
                 Provider provider, String providerId, String userKey) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.birthDate = birthDate;
        this.role = role;
        this.provider = provider;
        this.providerId = providerId;
        this.userKey = userKey;
        this.notification = true;
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void updateProfile(String name, LocalDate birthDate) {
        this.name = name;
        this.birthDate = birthDate;
    }

    // 로컬 계정 → 소셜 계정 완전 전환. 이후 이메일+비밀번호 로그인 불가
    public void convertToSocial(Provider provider, String providerId) {
        this.provider = provider;
        this.providerId = providerId;
        this.password = null;
    }

    // 알림 수신 여부 토글
    public boolean toggleNotification() {
        this.notification = !this.notification;
        return this.notification;
    }

    // 회원 탈퇴
    public void withdraw() {
        this.deletedAt = LocalDateTime.now();
        this.email = "deleted_" + this.id + "_" + this.email;
    }

    // 롤 변경
    public void changeRole(Role newRole) {
        this.role = newRole;
    }

    // 마이데이터 연동 시 금융망에서 조회한 신용등급 반영
    public void changeCreditRating(CreditRating creditRating) {
        this.creditRating = creditRating;
    }

    // INSERT 직전 JPA가 자동 호출 -> 가입일 자동 기록
    @PrePersist
    private void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // UPDATE 직전 JPA가 자동 호출 -> 수정일 자동 기록
    @PreUpdate
    private void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}