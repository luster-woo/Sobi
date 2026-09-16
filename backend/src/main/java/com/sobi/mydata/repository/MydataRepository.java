package com.sobi.mydata.repository;

import com.sobi.mydata.entity.Mydata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MydataRepository extends JpaRepository<Mydata, Long> {

    Optional<Mydata> findByBrn(String brn);
}