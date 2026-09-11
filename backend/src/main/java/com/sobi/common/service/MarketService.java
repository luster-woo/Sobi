package com.sobi.common.service;

import com.sobi.common.dto.MarketAnalysisResponse;
import com.sobi.common.dto.MarketBusinessResponse;
import com.sobi.common.dto.MarketRegionResponse;

public interface MarketService {

    MarketAnalysisResponse getMarketAnalysis(
            String dongCode,
            String businessCode,
            Integer compareLimit,
            Integer mixLimit
    );

    MarketRegionResponse getRegions();

    MarketBusinessResponse getBusinesses();
}
