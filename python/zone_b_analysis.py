"""
Magnesio-Core: 단천 CMEZ 입지 타당성 분석
Python 분석 스니펫

분석 목적:
    NASA SRTM 30m DEM + JRC Global Surface Water 기반
    단천 CMEZ Zone B (정련·가공 클러스터) 유효 면적 산출

확정 수치:
    최종 유효 Zone B: 2.19 km²
    홍수 고위험 구역: 5.86 km²
    CMEZ 고도 중앙값: 1,163.5 m

참고:
    전체 분석은 GEE JavaScript API로 수행
    (01~05_*.js 파일 참조)
    본 파일은 핵심 로직의 Python 구현 버전

요건:
    pip install earthengine-api
    ee.Authenticate() 최초 1회 실행 필요
"""

import ee
import math

# ─────────────────────────────────────────
# 1. GEE 초기화
# ─────────────────────────────────────────
ee.Initialize()

# ─────────────────────────────────────────
# 2. 핵심 지점 좌표 (문헌 확인 완료)
# ─────────────────────────────────────────

# 용양광산 (Ryongyang Mine)
# 출처: CSIS Beyond Parallel (2019)
RYONGYANG = [128.804703, 40.901815]

# 대흥청년영웅광산 (Taehung Youth Hero Mine)
# 출처: OpenStreetMap
TAEHUNG = [128.84944, 41.07636]

# 단천항 (Danchen Port)
# 출처: NK Econ Watch (2013)
PORT = [128.917731, 40.412522]

# ─────────────────────────────────────────
# 3. CMEZ 분석 영역 정의
#    (용양·대흥광산·단천항 전체 포함)
# ─────────────────────────────────────────

cmez_roi = ee.Geometry.Polygon([[
    [128.50, 40.30],
    [129.20, 40.30],
    [129.20, 41.20],
    [128.50, 41.20]
]])

# ─────────────────────────────────────────
# 4. NASA SRTM 30m DEM 로드 및 지형 분석
# ─────────────────────────────────────────

srtm_dem = ee.Image('USGS/SRTMGL1_003').clip(cmez_roi)
slope     = ee.Terrain.slope(srtm_dem)
hillshade = ee.Terrain.hillshade(srtm_dem)

# Zone B 적합 구역: 경사도 5도 이하 평탄면
# 기준: 일반 제련소·공장 건축 기준 준용
suitable_slope = slope.lte(5)

# ─────────────────────────────────────────
# 5. JRC Global Surface Water 기반
#    홍수 고위험 구역 마스크 생성
#    하천 인접 500m 버퍼 적용
# ─────────────────────────────────────────

jrc_water = (
    ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
    .select('occurrence')
    .clip(cmez_roi)
)

# 발생 빈도 50% 이상 = 상시 수계(하천)
permanent_water = jrc_water.gt(50)

# 하천 인접 500m → 홍수 고위험 구역
flood_hazard = permanent_water.focal_max(
    radius=500,
    units='meters'
)

# ─────────────────────────────────────────
# 6. 최종 유효 Zone B 산출
#    조건: 경사도 5도 이하 AND 홍수 위험 제외
# ─────────────────────────────────────────

final_zone_b = suitable_slope.And(flood_hazard.Not())

# ─────────────────────────────────────────
# 7. 면적 계산 (km²)
# ─────────────────────────────────────────

def calc_area_km2(image, geometry, label):
    """이진 마스크 이미지의 면적을 km²로 산출"""
    area_m2 = (
        image.multiply(ee.Image.pixelArea())
        .rename('area')
        .reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=30,
            maxPixels=1e9
        )
    )
    area_km2 = area_m2.getInfo()['area'] / 1e6
    print(f"{label}: {area_km2:.2f} km²")
    return area_km2

# 결과 출력
print("=== 단천 CMEZ GEE 분석 결과 ===")
calc_area_km2(suitable_slope, cmez_roi, "전체 Zone B (경사도 5도 이하)")
calc_area_km2(flood_hazard,   cmez_roi, "홍수 고위험 구역 (500m)")
calc_area_km2(final_zone_b,   cmez_roi, "★ 최종 유효 Zone B")

# ─────────────────────────────────────────
# 8. 고도 통계
# ─────────────────────────────────────────

elev_stats = srtm_dem.reduceRegion(
    reducer=ee.Reducer.percentile([10, 25, 50]),
    geometry=cmez_roi,
    scale=30,
    maxPixels=1e9
).getInfo()

print(f"\n[고도 분포]")
print(f"  하위 10%: {elev_stats['elevation_p10']:.1f} m")
print(f"  하위 25%: {elev_stats['elevation_p25']:.1f} m")
print(f"  중앙값:   {elev_stats['elevation_p50']:.1f} m")

# ─────────────────────────────────────────
# 9. 광산 간 거리 계산 (Haversine 공식)
#    WGS84 기준 직선거리
# ─────────────────────────────────────────

def haversine(lon1, lat1, lon2, lat2):
    """
    WGS84 기준 두 좌표 간 직선거리 계산 (km)
    입력: 경도, 위도 (도 단위)
    """
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

print(f"\n[물류 네트워크 직선거리 — Haversine 산출]")
print(f"  용양광산 → 단천항:  {haversine(*RYONGYANG, *PORT):.1f} km")
print(f"  대흥광산 → 단천항:  {haversine(*TAEHUNG,   *PORT):.1f} km")
print(f"  용양 ↔ 대흥 광산:  {haversine(*RYONGYANG, *TAEHUNG):.1f} km")
print(f"  ※ 평라선 실제 경로: 직선거리 × 1.2~1.5배 추정")

# ─────────────────────────────────────────
# 10. GeoTIFF Export (Google Drive)
#     Float32 타입 통일 (Byte/Float32 혼재 오류 방지)
# ─────────────────────────────────────────

export_task = ee.batch.Export.image.toDrive(
    image=ee.Image([
        hillshade.toFloat().rename('hillshade'),
        slope.toFloat().rename('slope'),
        final_zone_b.toFloat().rename('valid_zoneB'),
        flood_hazard.toFloat().rename('flood_risk'),
        permanent_water.toFloat().rename('water')
    ]),
    description='Danchen_CMEZ_ZoneB_Analysis',
    folder='GEE_Danchen',
    fileNamePrefix='danchen_cmez_final',
    region=cmez_roi,
    scale=30,
    crs='EPSG:4326',
    maxPixels=int(1e9),
    fileFormat='GeoTIFF'
)

export_task.start()
print("\nExport 시작 완료 → Google Drive > GEE_Danchen 폴더 확인")
print("5밴드: hillshade / slope / valid_zoneB / flood_risk / water")
