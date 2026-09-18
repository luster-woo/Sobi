package com.sobi.common.repository;

import com.sobi.common.dto.DongItem;
import com.sobi.common.entity.SeoulCommercialData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SeoulCommercialDataRepository extends JpaRepository<SeoulCommercialData, Long> {

    Optional<SeoulCommercialData> findByDongCodeAndBusinessCode(String dongCode, String businessCode);

    boolean existsByDongCode(String dongCode);

    boolean existsByBusinessCode(String businessCode);

    /** 서울 전체 벤치마크, 순위 모집단. */
    List<SeoulCommercialData> findByBusinessCode(String businessCode);

    /** 주변 상권 비교표 — 같은 자치구 내 동종업종을 점포 수 내림차순 */
    List<SeoulCommercialData> findByDistrictCodeAndBusinessCodeOrderByTotalCountDesc(
            String districtCode,
            String businessCode
    );

    /** 업종 구성 — 해당 동의 전체 업종을 점포 수 내림차순 */
    List<SeoulCommercialData> findByDongCodeOrderByTotalCountDesc(String dongCode);


    /** 자치구, 행정동 목록 불러오기  */
    @Query("""
            SELECT DISTINCT new com.sobi.common.dto.DongItem(
                d.districtCode, d.districtName, d.dongCode, d.dongName
            )
            FROM SeoulCommercialData d
            ORDER BY d.districtCode, d.dongCode
            """)
    List<DongItem> findAllDongs();
}
