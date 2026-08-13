/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 06: 단천항 5km 1단계 구역 산출 (신규)
 *
 * 입지논리:
 *   과거 단천 마그네샤연합기업소가 항만권에 입지하여
 *   마그네샤크링카를 생산·수출(러시아 등 10여국)한 선례 복원.
 *   광산 인근은 평균경사 22~24도 급경사지로 정련시설 부적합 →
 *   경사 1.2도·고도 2m의 단천항 배후 평탄지에 정련단지 배치.
 *
 * 필터: 경사<5° AND 홍수500m제외 AND 단천항 5km
 * 데이터: NASA SRTM 30m DEM / JRC Global Surface Water v1.4
 *
 * 산출 결과:
 *   - AOI 내 전체 가용지       : 121.83 km²
 *   - 단천항 5km 가용지(1단계)  :  11.44 km²
 *   - Zone B+C+E 실배치        :   1.85 km² (B 0.828 / C 0.613 / E 0.405)
 *   포함관계: 121.83 ⊃ 11.44 ⊃ 1.85 (단조감소·검산 일치)
 */

// 1. 설정 ──────────────────────────────────────────────
var p_region = ee.Geometry.Polygon([[
  [128.75, 40.30], [129.00, 40.30],
  [129.00, 41.13], [128.75, 41.13]
]]);
var p_port = ee.Geometry.Point([128.917731, 40.412522]);   // 단천항
var p_site = ee.Geometry.Point([128.9139, 40.4546]);   // Zone B 사이트 중심 (확정값, QGIS centroid EPSG:4326)
var p_portBuf = 5000;  // 항만 5km 배후권

// 2. 가용지 (v2 unmask 보정 로직) ──────────────────────
var p_dem   = ee.Image('USGS/SRTMGL1_003').clip(p_region);
var p_zoneB = ee.Terrain.slope(p_dem).lt(5);
var p_water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence').clip(p_region).unmask(0);
var p_flood = p_water.gt(50).focal_max({radius:500, units:'meters'}).unmask(0);
var p_avail = p_zoneB.and(p_flood.not());

// 3. 단천항 5km 1단계 구역 ─────────────────────────────
var p_portZone = ee.Image(0).paint(
  ee.FeatureCollection([ee.Feature(p_port.buffer(p_portBuf))]), 1
).clip(p_region);
var p_phase1 = p_avail.and(p_portZone);

// 4. 면적 ──────────────────────────────────────────────
var p_px = ee.Image.pixelArea();
function p_km2(m){
  return m.multiply(p_px).rename('a').reduceRegion({
    reducer: ee.Reducer.sum(), geometry: p_region,
    scale: 30, maxPixels: 1e9
  }).getNumber('a').divide(1e6);
}

// 5. 사이트 입지 검증 ──────────────────────────────────
ee.Terrain.slope(p_dem).reduceRegion({
  reducer: ee.Reducer.first(), geometry: p_site, scale: 30
}).evaluate(function(r){
  print('[사이트 입지 검증]');
  print('  Zone B 중심 경사도: ' + r.slope.toFixed(2) + '도 (5도 미만 = 평탄)');
});
p_site.distance(p_port).evaluate(function(d){
  print('  Zone B 중심–단천항: ' + (d/1000).toFixed(2) + ' km (항만 5km 배후권)');
  print('');
});

// 6. 결과 출력 ─────────────────────────────────────────
print('=== Step 06: 단천항 5km 1단계 구역 ===');
p_km2(p_avail).evaluate(function(a){   print('  AOI 전체 가용지        : ' + a.toFixed(2) + ' km²'); });
p_km2(p_phase1).evaluate(function(p){  print('  단천항 5km 가용지(1단계): ' + p.toFixed(2) + ' km²'); });
print('  Zone B+C+E 실배치      : 1.85 km² (B 0.828 / C 0.613 / E 0.405)');

// 7. 시각화 ────────────────────────────────────────────
Map.centerObject(p_site, 12);
Map.addLayer(p_avail.selfMask(),  {palette:['c8e6c9']}, 'AOI 가용지', false);
Map.addLayer(p_phase1.selfMask(), {palette:['059669']}, '단천항 5km 1단계구역');
Map.addLayer(p_port, {color:'0000FF'}, '단천항');
Map.addLayer(p_site, {color:'FF0000'}, 'Zone B 사이트');
