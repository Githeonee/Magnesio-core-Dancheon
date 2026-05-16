/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 02: SWIR 분광 분석 (Mg-OH 흡수대 탐지)
 *
 * 분석 목적:
 *   Landsat 9 SWIR 밴드를 활용하여 마그네사이트
 *   광물 분포 가능 구역을 간접 탐지
 *
 * 방법론:
 *   - Band 6 (SWIR1, 1.6μm): 점토·탄산염 반응
 *   - Band 7 (SWIR2, 2.2μm): Mg-OH 흡수대 반응
 *   - SWIR2/SWIR1 비율: 탄산염 광물 강조
 *
 * 한계:
 *   위성 분광 분석은 지표 ~30m 깊이까지만 가능.
 *   지하 광맥 직접 탐지 불가. 지표 분광 특성을
 *   기반으로 한 간접 추정 결과임.
 *
 * 참고:
 *   KIGAM은 유사 방법론으로 국내 리튬 탐사에 적용한
 *   실적 보유 (한국지질자원연구원, 2022)
 */

// ─────────────────────────────────────────
// 1. 설정
// ─────────────────────────────────────────

var cmezRegion = ee.Geometry.Polygon([[
  [128.75, 40.85],
  [128.95, 40.85],
  [128.95, 41.13],
  [128.75, 41.13]
]]);

var center = ee.Geometry.Point([128.827, 40.987]);

// ─────────────────────────────────────────
// 2. Landsat 9 로드
// ─────────────────────────────────────────

var landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(cmezRegion)
  .filterDate('2022-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .median()
  .multiply(0.0000275).add(-0.2);

// ─────────────────────────────────────────
// 3. SWIR 밴드 조합 시각화
// ─────────────────────────────────────────

Map.centerObject(center, 11);

// 자연색 (비교 기준)
Map.addLayer(landsat, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0, max: 0.3
}, '자연색 (참고용)', false);

// SWIR 조합 (지질 탐사용)
// Band 7(SWIR2) + Band 5(NIR) + Band 4(Red)
Map.addLayer(landsat, {
  bands: ['SR_B7', 'SR_B5', 'SR_B4'],
  min: 0, max: 0.3
}, 'SWIR 조합 (지질 탐사용)');

// ─────────────────────────────────────────
// 4. SWIR2/SWIR1 비율 계산
// (탄산염·Mg-OH 광물 강조)
// ─────────────────────────────────────────

var swirRatio = landsat.select('SR_B7')
  .divide(landsat.select('SR_B6'))
  .clip(cmezRegion);

Map.addLayer(swirRatio, {
  min: 0.5,
  max: 2.0,
  palette: ['0000FF', 'FFFFFF', 'FF0000']
}, 'SWIR 비율 (파랑=낮음, 빨강=높음)');

// ─────────────────────────────────────────
// 5. 고비율 구역 추출 (후보 광구)
// ─────────────────────────────────────────

// SWIR 비율 상위 25% → 탄산염 광물 반응 높은 구역
var stats = swirRatio.reduceRegion({
  reducer: ee.Reducer.percentile([75]),
  geometry: cmezRegion,
  scale: 30,
  maxPixels: 1e9
});

stats.evaluate(function(s) {
  var threshold = s['SR_B7'];
  print('SWIR 비율 상위 25% 기준값: ' + threshold.toFixed(3));

  var highRatio = swirRatio.gt(threshold);
  Map.addLayer(highRatio.selfMask(), {
    palette: ['FF0000']
  }, '탄산염 광물 반응 고강도 구역 (상위 25%)');

  // 면적 계산
  var area = highRatio.multiply(ee.Image.pixelArea())
    .rename('area')
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: cmezRegion,
      scale: 30,
      maxPixels: 1e9
    });

  area.evaluate(function(r) {
    print('탄산염 광물 고반응 구역 면적: '
      + (r.area/1e6).toFixed(2) + ' km²');
    print('');
    print('※ 주의: 지표 분광 분석 기반 간접 추정값');
    print('※ 확정적 광물 탐지는 현장 시추 조사 필요');
  });
});
