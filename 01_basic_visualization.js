/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 01: 기본 위성 이미지 시각화 + 광산·항만 포인트
 *
 * 대상 지역: 함경남도 단천시
 * 분석 목적: 용양·대흥 광산 및 단천항 위치 확인
 *
 * 데이터 소스:
 *   - Landsat 9 Collection 2 Level-2 (USGS)
 *
 * 참고 문헌:
 *   - CSIS Beyond Parallel (2019): 용양광산 좌표 확인
 *   - NK Econ Watch (2013): 단천항 좌표 확인
 *   - OpenStreetMap: 대흥광산 좌표 확인
 */

// ─────────────────────────────────────────
// 1. 핵심 지점 좌표 설정
// ─────────────────────────────────────────

// 용양광산 (Ryongyang Mine)
// 출처: CSIS Beyond Parallel (2019)
var ryongyang = ee.Geometry.Point([128.804703, 40.901815]);

// 대흥청년영웅광산 (Taehung Youth Hero Mine)
// 출처: OpenStreetMap
var taehung = ee.Geometry.Point([128.84944, 41.07636]);

// 단천항 (Danchen Port)
// 출처: NK Econ Watch (2013)
var port = ee.Geometry.Point([128.917731, 40.412522]);

// ─────────────────────────────────────────
// 2. 관심 지역 (CMEZ 전체 구역) 설정
// ─────────────────────────────────────────

var cmezRegion = ee.Geometry.Polygon([[
  [128.75, 40.85],
  [128.95, 40.85],
  [128.95, 41.13],
  [128.75, 41.13]
]]);

// 두 광산 중심점 기준 버퍼 (20km)
var center = ee.Geometry.Point([128.827, 40.987]);
var buffer = center.buffer(20000);

// ─────────────────────────────────────────
// 3. Landsat 9 위성 이미지 로드
// ─────────────────────────────────────────

var landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(cmezRegion)
  .filterDate('2022-01-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .median()
  .multiply(0.0000275).add(-0.2); // 반사율 보정

// ─────────────────────────────────────────
// 4. 시각화
// ─────────────────────────────────────────

Map.centerObject(center, 11);

// 자연색 (True Color)
Map.addLayer(landsat, {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.3
}, '단천 자연색 (Landsat 9)');

// 포인트 레이어
Map.addLayer(ryongyang, {color: 'FF0000'}, '용양광산 (Ryongyang)');
Map.addLayer(taehung,   {color: 'FF6600'}, '대흥광산 (Taehung)');
Map.addLayer(port,      {color: '0000FF'}, '단천항 (Danchen Port)');

// ─────────────────────────────────────────
// 5. 두 광산 간 거리 계산
// ─────────────────────────────────────────

var distance = ryongyang.distance(taehung);
distance.evaluate(function(d) {
  print('=== 핵심 지점 정보 ===');
  print('용양광산:  40.901815°N, 128.804703°E (CSIS 2019)');
  print('대흥광산:  41.07636°N,  128.84944°E  (OSM)');
  print('단천항:    40.412522°N, 128.917731°E (NK Econ Watch 2013)');
  print('');
  print('용양-대흥 광산 간 거리: ' + (d/1000).toFixed(1) + ' km');
});
