package com.sobi.support.entity;


import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SuggestSupportProgramId implements Serializable {

    private Long supportProgramId;

    private Long businessId;
}