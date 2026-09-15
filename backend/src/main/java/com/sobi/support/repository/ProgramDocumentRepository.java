package com.sobi.support.repository;

import com.sobi.support.entity.ProgramDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProgramDocumentRepository extends JpaRepository<ProgramDocument, Long> {

    List<ProgramDocument> findAllBySupportProgram_IdOrderByIdAsc(Long supportProgramId);
}
