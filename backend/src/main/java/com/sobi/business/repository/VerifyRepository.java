package com.sobi.business.repository;

import com.sobi.business.entity.Verify;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerifyRepository extends JpaRepository<Verify, Long> {

    Optional<Verify> findByBrn(String brn);


}
