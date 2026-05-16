/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 03: DEM 기반 지형·경사도 분석 + Zone B 면적 산출
 *
 * 분석 목적:
 *   Zone B(정련·가공 클러스터) 입지를 위한
 *   경사도 5도 이하 평탄지 면적 산출
 *
 * 데이터:
 *   NASA SRTM 30m DEM (USGS/SRTMGL1_003)
 *
 * 핵심 결과:
 *   - CMEZ 전체 Zone B: 31.88 km²
 *   - 용양광산 반경 5km Zone B: 2.45 km²
 *   - 대흥광산 반경 5km Zone B: 2.45 km²
 *   - CMEZ 고도 중앙값: 1,163.5 m
 *   - 용양광산 평균 경사도: 24.2도
 *   - 대흥광산 평균 경사도: 22.3도
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

var ryongyangBuf = ryongyang.buffer(5000); // 반경 5km
var taehungBuf   = taehung.buffer(5000);

// ─────────────────────────────────────────
// 2. DEM 로드 및 지형 분석
// ─────────────────────────────────────────

var dem       = ee.Image('USGS/SRTMGL1_003').clip(cmezRegion);
var slope     = ee.Terrain.slope(dem);
var hillshade = ee.Terrain.hillshade(dem);

// ─────────────────────────────────────────
// 3. 시각화
// ─────────────────────────────────────────

var center = ee.Geometry.Point([128.827, 40.987]);
Map.centerObject(center, 10);

Map.addLayer(hillshade, {min: 0, max: 255}, '음영기복');

Map.addLayer(slope, {
  min: 0, max: 45,
  palette: ['00CC00', 'FFFF00', 'FF6600', 'FF0000']
}, '경사도 (초록=완만, 빨강=급경사)');

// Zone B 적합 구역 (경사도 5도 이하)
var zoneB = slope.lt(5);
Map.addLayer(zoneB.selfMask(), {
  palette: ['00FF00']
}, 'Zone B 적합 구역 (경사도 5도 이하)');

// 포인트
Map.addLayer(ryongyang, {color: 'FF0000'}, '용양광산');
Map.addLayer(taehung,   {color: 'FF6600'}, '대흥광산');
Map.addLayer(port,      {color: '0000FF'}, '단천항');

// ─────────────────────────────────────────
// 4. 수치 계산
// ─────────────────────────────────────────

// CMEZ 전체 Zone B 면적
var totalZoneB = zoneB.multiply(ee.Image.pixelArea())
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: cmezRegion,
    scale: 30,
    maxPixels: 1e9
  });

// 용양광산 반경 5km Zone B 면적
var areaRyong = zoneB.multiply(ee.Image.pixelArea())
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: ryongyangBuf,
    scale: 30,
    maxPixels: 1e9
  });

// 대흥광산 반경 5km Zone B 면적
var areaTaehung = zoneB.multiply(ee.Image.pixelArea())
  .rename('area')
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: taehungBuf,
    scale: 30,
    maxPixels: 1e9
  });

// 고도 통계
var elevStats = dem.reduceRegion({
  reducer: ee.Reducer.percentile([10, 25, 50]),
  geometry: cmezRegion,
  scale: 30,
  maxPixels: 1e9
});

// 각 광산 평균 경사도
var meanSlopeR = slope.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: ryongyangBuf,
  scale: 30,
  maxPixels: 1e9
});

var meanSlopeT = slope.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: taehungBuf,
  scale: 30,
  maxPixels: 1e9
});

// ─────────────────────────────────────────
// 5. 결과 출력
// ─────────────────────────────────────────

print('=== Step 03: 지형 분석 결과 ===');
print('데이터: NASA SRTM 30m DEM (USGS/SRTMGL1_003)');
print('');

elevStats.evaluate(function(s) {
  print('[고도 분포]');
  print('  하위 10%: ' + s.elevation_p10.toFixed(1) + ' m');
  print('  하위 25%: ' + s.elevation_p25.toFixed(1) + ' m');
  print('  중앙값:   ' + s.elevation_p50.toFixed(1) + ' m');
  print('');
});

totalZoneB.evaluate(function(r) {
  print('[Zone B 적합 면적 (경사도 5도 이하)]');
  print('  CMEZ 전체: ' + (r.area/1e6).toFixed(2) + ' km²');
});

areaRyong.evaluate(function(r) {
  print('  용양광산 반경 5km: ' + (r.area/1e6).toFixed(2) + ' km²');
});

areaTaehung.evaluate(function(r) {
  print('  대흥광산 반경 5km: ' + (r.area/1e6).toFixed(2) + ' km²');
  print('');
});

meanSlopeR.evaluate(function(r) {
  print('[평균 경사도]');
  print('  용양광산 반경 5km: ' + r.slope.toFixed(1) + '도');
});

meanSlopeT.evaluate(function(r) {
  print('  대흥광산 반경 5km: ' + r.slope.toFixed(1) + '도');
});
