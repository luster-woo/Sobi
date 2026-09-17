package com.sobi.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SupportSearchTextRequest {

    @NotBlank
    @Size(max = 200)
    private String query;
}