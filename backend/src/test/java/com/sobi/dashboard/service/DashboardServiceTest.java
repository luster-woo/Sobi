package com.sobi.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.business.entity.BusinessInfo;
import com.sobi.business.entity.BusinessTax;
import com.sobi.business.repository.*;
import com.sobi.dashboard.dto.DashboardResponse.*;
import com.sobi.global.exception.BusinessException;
import com.sobi.insurance.repository.InsuranceChecklistRepository;
import com.sobi.loan.repository.*;
import com.sobi.support.entity.SupportProgram;
import com.sobi.support.entity.SuggestSupportProgram;
import com.sobi.support.repository.*;
import com.sobi.user.entity.Role;
import com.sobi.user.entity.User;
import com.sobi.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {
    @Mock UserRepository users;
    @Mock BusinessReporitory businesses;
    @Mock BusinessTaxRepository taxes;
    @Mock InsuranceChecklistRepository insurances;
    @Mock LoanRepository loans;
    @Mock SuggestLoanRepository suggestedLoans;
    @Mock SupportProgramRepository programs;
    @Mock SuggestSupportProgramRepository suggestedPrograms;
    @Mock DashboardRepaymentService repayments;
    @InjectMocks DashboardServiceImpl service;

    @Test
    void preEntrepreneurWithoutBusinessGetsCatalogAndOnlyPreEntrepreneurFields() {
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().role(Role.PREENTREPRENEUR).build()));
        when(loans.findAll(Sort.by("id"))).thenReturn(List.of());
        when(programs.findAll(Sort.by("id"))).thenReturn(List.of());
        var response = service.getDashboard(1L);
        assertThat(response).isInstanceOf(PreEntrepreneur.class);
        var json = new ObjectMapper().valueToTree(response);
        assertThat(json.has("Loans")).isTrue();
        assertThat(json.has("supportProgram")).isTrue();
        assertThat(json.get("insurances").isEmpty()).isTrue();
        assertThat(json.has("totalLoanBalance")).isFalse();
        verifyNoInteractions(repayments, taxes, suggestedLoans, suggestedPrograms, insurances);
    }

    @Test
    void entrepreneurAggregatesSalesAndInclusiveUpcomingDeadlineCounts() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().role(Role.ENTREPRENEUR).userKey("key").build()));
        BusinessInfo business = mock(BusinessInfo.class);
        when(business.getId()).thenReturn(10L);
        when(businesses.findByUserId(1L)).thenReturn(business);
        when(taxes.findTop6ByBusinessIdOrderByPeriodDesc(10L)).thenReturn(List.of(
                BusinessTax.of(business, LocalDate.of(2026, 8, 1), 200L, 0L),
                BusinessTax.of(business, LocalDate.of(2026, 7, 1), 100L, 0L)));
        var suggestions = List.of(
                suggestion(1L, today.minusDays(1)), suggestion(2L, today),
                suggestion(3L, today.plusDays(7)), suggestion(4L, today.plusDays(8)), suggestion(5L, null));
        when(suggestedPrograms.findAllWithSupportProgramByBusinessId(10L)).thenReturn(suggestions);
        when(programs.count()).thenReturn(8L);
        when(repayments.getSummary("key", today)).thenReturn(new RepaymentManagement(null, 30L, 500L));

        var response = (Entrepreneur) service.getDashboard(1L);
        assertThat(response.recentSalesHistory()).extracting(Sales::period).containsExactly("2026-07", "2026-08");
        assertThat(response.latestMonthlySales()).isEqualTo(200);
        assertThat(response.totalLoanBalance()).isEqualTo(500);
        assertThat(response.supportProgramSummary()).isEqualTo(new SupportSummary(5, 2, 3, 8));
        var json = new ObjectMapper().findAndRegisterModules().valueToTree(response);
        assertThat(json.has("suggestsupportProgram")).isTrue();
        assertThat(json.has("Loans")).isFalse();
        assertThat(json.get("suggestsupportProgram").get(0).has("min_balance")).isTrue();
    }

    @Test
    void missingAuthenticationOrUserIsRejectedBeforeDataQueries() {
        assertThatThrownBy(() -> service.getDashboard(null)).isInstanceOf(BusinessException.class);
        when(users.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getDashboard(1L)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(businesses, repayments);
    }

    @Test
    void entrepreneurRequiresBusiness() {
        when(users.findById(1L)).thenReturn(Optional.of(User.builder().role(Role.ENTREPRENEUR).build()));
        assertThatThrownBy(() -> service.getDashboard(1L)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(repayments);
    }

    private SuggestSupportProgram suggestion(Long id, LocalDate endDate) {
        var program = mock(SupportProgram.class);
        when(program.getId()).thenReturn(id);
        when(program.getEndDate()).thenReturn(endDate);
        var suggestion = mock(SuggestSupportProgram.class);
        when(suggestion.getSupportProgram()).thenReturn(program);
        return suggestion;
    }
}
