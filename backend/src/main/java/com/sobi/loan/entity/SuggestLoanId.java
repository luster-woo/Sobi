package com.sobi.loan.entity;



import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SuggestLoanId implements Serializable {

    private Long businessId;

    private Long loanId;
}