package com.sobi.business.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class VerifyRequest {

    @NotBlank
    private String brn;

    @NotBlank
    private String name;

    @NotNull
    private LocalDate openDate;


}
