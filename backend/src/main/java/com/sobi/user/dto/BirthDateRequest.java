package com.sobi.user.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class BirthDateRequest {

    @NotNull
    @Past
    private LocalDate birthDate;

    @NotBlank
    @Size(max = 100)
    private String name;
}