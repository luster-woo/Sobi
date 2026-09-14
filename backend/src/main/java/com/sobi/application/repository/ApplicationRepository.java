package com.sobi.application.repository;

import com.sobi.application.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    Application findByUser_IdAndSupportProgram_Id(Long userId, Long supportProgramId);

    Application findByUser_IdAndLoan_Id(Long userId, Long loanId);
}
