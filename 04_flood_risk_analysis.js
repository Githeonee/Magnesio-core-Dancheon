/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 04: 홍수 리스크 분석 + 최종 유효 Zone B 산출
 *
 * 분석 목적:
 *   JRC 글로벌 수면 데이터를 활용하여 하천 인접
 *   홍수 위험 구역을 제외한 실제 개발 가능 Zone B 산출
 *
 *   ※ 배경: 2012년 태풍 볼라벤으로 단천 지역
 *     대규모 침수·산사태 피해 발생 (CSIS 2019)
 *     → 홍수 리스크 관리가 입지 선정의 핵심 조건
 *
 * 데이터:
 *   - NASA SRTM 30m DEM
 *   - JRC Global Surface Water v1.4
 *
 * 핵심 결과:
 *   - 홍수 고위험 구역 (500m): 5.86 km²
 *   - 홍수 주의 구역 (1km):   17.29 km²
 *   - Zone B 중 홍수 위험:     0.53 km²
 *   - ★ 최종 유효 Zone B:      2.19 km²
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

// ─────────────────────────────────────────
// 2. DEM + 경사도
// ─────────────────────────────────────────

var dem       = ee.Image('USGS/SRTMGL1_003').clip(cmezRegion);
var slope     = ee.Terrain.slope(dem);
var hillshade = ee.Terrain.hillshade(dem);
var zoneB     = slope.lt(5);

// ─────────────────────────────────────────
// 3. JRC 수면 데이터 로드
// ─────────────────────────────────────────

var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence')
  .clip(cmezRegion);

// 상시 수계 (발생 빈도 50% 이상 = 하천)
var permanentWater = water.gt(50);

// 홍수 위험 구역 설정
var floodZone500  = permanentWater.focal_max({radius: 500,  units: 'meters'});
var floodZone1000 = permanentWater.focal_max({radius: 1000, units: 'meters'});

// 최종 유효 Zone B (홍수 위험 제외)
var validZoneB = zoneB.and(floodZone500.not());

// ─────────────────────────────────────────
// 4. 시각화
// ─────────────────────────────────────────

var center = ee.Geometry.Point([128.827, 40.987]);
Map.centerObject(center, 10);

Map.addLayer(hillshade, {min: 0, max: 255}, '음영기복');

Map.addLayer(permanentWater.selfMask(), {
  palette: ['0000FF']
}, '상시 수계 (하천)');

Map.addLayer(floodZone1000.selfMask(), {
  palette: ['FFFF00'],
  opacity: 0.4
}, '홍수 주의 구역 (1km)');

Map.addLayer(floodZone500.selfMask(), {
  palette: ['FF6600'],
  opacity: 0.6
}, '홍수 고위험 구역 (500m)');

Map.addLayer(validZoneB.selfMask(), {
  palette: ['00FF00']
}, '★ 최종 유효 Zone B');

Map.addLayer(ryongyang, {color: 'FF0000'}, '용양광산');
Map.addLayer(taehung,   {color: 'FF6600'}, '대흥광산');
Map.addLayer(port,      {color: '0000FF'}, '단천항');

// ─────────────────────────────────────────
// 5. 면적 계산
// ─────────────────────────────────────────

var pixelArea = ee.Image.pixelArea();

var floodArea500 = floodZone500.multiply(pixelArea)
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: cmezRegion,
    scale: 30,
    maxPixels: 1e9
  });

var floodArea1000 = floodZone1000.multiply(pixelArea)
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: cmezRegion,
    scale: 30,
    maxPixels: 1e9
  });

var excludeArea = zoneB.and(floodZone500).multiply(pixelArea)
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: cmezRegion,
    scale: 30,
    maxPixels: 1e9
  });

var validArea = validZoneB.multiply(pixelArea)
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: cmezRegion,
    scale: 30,
    maxPixels: 1e9
  });

// 고도 분포 (홍수 기준선)
var elevStats = dem.reduceRegion({
  reducer: ee.Reducer.percentile([10, 25, 50]),
  geometry: cmezRegion,
  scale: 30,
  maxPixels: 1e9
});

// ─────────────────────────────────────────
// 6. 결과 출력
// ─────────────────────────────────────────

print('=== Step 04: 홍수 리스크 분석 결과 ===');
print('데이터: JRC Global Surface Water v1.4');
print('');

elevStats.evaluate(function(s) {
  print('[고도 분포]');
  print('  하위 10% (홍수 기준선): ' + s.elevation_p10.toFixed(1) + ' m');
  print('  하위 25%:               ' + s.elevation_p25.toFixed(1) + ' m');
  print('  중앙값:                 ' + s.elevation_p50.toFixed(1) + ' m');
  print('');
});

floodArea500.evaluate(function(r) {
  print('[홍수 위험 구역]');
  print('  고위험 (하천 인접 500m): ' + (r.area/1e6).toFixed(2) + ' km²');
});

floodArea1000.evaluate(function(r) {
  print('  주의   (하천 인접 1km):  ' + (r.area/1e6).toFixed(2) + ' km²');
  print('');
});

excludeArea.evaluate(function(r) {
  print('[Zone B 보정]');
  print('  Zone B 중 홍수 위험 제외: ' + (r.area/1e6).toFixed(2) + ' km²');
});

validArea.evaluate(function(r) {
  print('  ★ 최종 유효 Zone B:       ' + (r.area/1e6).toFixed(2) + ' km²');
  print('');
  print('[비교]');
  print('  고려아연 온산제련소: 약 1.42 km²');
  print('  여의도 (국토부 공식): 2.9 km²');
  print('  → 최종 유효 Zone B는 온산제련소 대비 약 1.5배');
});
