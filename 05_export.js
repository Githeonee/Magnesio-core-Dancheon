/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 05: GeoTIFF Export (Google Drive)
 *
 * 출력 파일:
 *   Google Drive > GEE_Danchen > danchen_analysis.tif
 *
 * 포함 밴드:
 *   Band 1: hillshade   — 음영기복 (QGIS 배경용)
 *   Band 2: slope       — 경사도
 *   Band 3: valid_zoneB — 최종 유효 Zone B (0/1)
 *   Band 4: flood_risk  — 홍수 고위험 구역 (0/1)
 *   Band 5: water       — 상시 수계 (0/1)
 *
 * QGIS 활용:
 *   Export된 GeoTIFF → QGIS에서 밴드별 스타일 설정
 *   → OSM 철도·도로 레이어 추가
 *   → 포인트 레이어 추가
 *   → 패널용 PNG 200dpi 출력
 *
 * ※ GEE Community 등급: GeoTIFF·TFRecord만 지원
 *    PNG Export 불가 → QGIS에서 변환
 */

// ─────────────────────────────────────────
// 1. 설정
// ─────────────────────────────────────────

var ryongyang = ee.Geometry.Point([128.804703, 40.901815]);
var taehung   = ee.Geometry.Point([128.84944,  41.07636]);
var port      = ee.Geometry.Point([128.917731, 40.412522]);

var cmezRegion = ee.Geometry.Polygon([[
  [128.75, 40.85],
  [128.95, 40.85],
  [128.95, 41.13],
  [128.75, 41.13]
]]);

var center = ee.Geometry.Point([128.827, 40.987]);

// ─────────────────────────────────────────
// 2. 레이어 생성
// ─────────────────────────────────────────

var dem       = ee.Image('USGS/SRTMGL1_003').clip(cmezRegion);
var slope     = ee.Terrain.slope(dem);
var hillshade = ee.Terrain.hillshade(dem);

var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence').clip(cmezRegion);
var permanentWater = water.gt(50);
var floodZone500   = permanentWater.focal_max({radius: 500, units: 'meters'});
var zoneB          = slope.lt(5);
var validZoneB     = zoneB.and(floodZone500.not());

var landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(cmezRegion)
  .filterDate('2022-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .median()
  .multiply(0.0000275).add(-0.2);

// ─────────────────────────────────────────
// 3. 지도 미리보기
// ─────────────────────────────────────────

Map.centerObject(center, 10);
Map.addLayer(landsat, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0, max: 0.3
}, '자연색');
Map.addLayer(hillshade, {min: 0, max: 255}, '음영기복');
Map.addLayer(validZoneB.selfMask(), {palette: ['00FF00']}, '★ 유효 Zone B');
Map.addLayer(floodZone500.selfMask(), {palette: ['FF6600']}, '홍수 고위험');
Map.addLayer(permanentWater.selfMask(), {palette: ['0000FF']}, '하천');
Map.addLayer(ryongyang, {color: 'FF0000'}, '용양광산');
Map.addLayer(taehung,   {color: 'FF6600'}, '대흥광산');
Map.addLayer(port,      {color: '0000FF'}, '단천항');

// ─────────────────────────────────────────
// 4. 분석 레이어 Export (전체 Float32 통일)
// ─────────────────────────────────────────

Export.image.toDrive({
  image: ee.Image([
    hillshade.toFloat().rename('hillshade'),
    slope.toFloat().rename('slope'),
    validZoneB.toFloat().rename('valid_zoneB'),
    floodZone500.toFloat().rename('flood_risk'),
    permanentWater.toFloat().rename('water')
  ]),
  description: 'Danchen_CMEZ_Analysis',
  folder: 'GEE_Danchen',
  fileNamePrefix: 'danchen_analysis',
  region: cmezRegion,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// ─────────────────────────────────────────
// 5. Landsat 자연색 Export
// ─────────────────────────────────────────

Export.image.toDrive({
  image: landsat.select(['SR_B4','SR_B3','SR_B2'])
    .multiply(255).toFloat(),
  description: 'Danchen_Landsat_RGB',
  folder: 'GEE_Danchen',
  fileNamePrefix: 'danchen_landsat_rgb',
  region: cmezRegion,
  scale: 30,
  crs: 'EPSG:4326',
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// ─────────────────────────────────────────
// 6. 안내
// ─────────────────────────────────────────

print('=== Step 05: Export 안내 ===');
print('Tasks 탭에서 두 개 Export 모두 Run 클릭');
print('');
print('출력 파일:');
print('  GEE_Danchen/danchen_analysis.tif     ← 분석 레이어');
print('  GEE_Danchen/danchen_landsat_rgb.tif  ← 자연색 배경');
print('');
print('QGIS 활용 순서:');
print('  1. GeoTIFF 불러오기');
print('  2. 밴드별 스타일 설정');
print('  3. QuickOSM → 철도·도로 레이어 추가');
print('  4. 포인트 레이어 (광산·항만) 추가');
print('  5. PNG 200dpi 출력 → Figma 패널 삽입');
print('');
print('=== 최종 확정 수치 ===');
print('용양-대흥 거리:       19.7 km');
print('CMEZ 전체 Zone B:     31.88 km²');
print('홍수 고위험 구역:      5.86 km²');
print('★ 최종 유효 Zone B:   2.19 km²');
print('CMEZ 고도 중앙값:     1163.5 m');
print('용양 평균 경사도:     24.2도');
print('대흥 평균 경사도:     22.3도');
