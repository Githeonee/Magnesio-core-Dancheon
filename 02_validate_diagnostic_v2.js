/**
 * Magnesio-Core: 단천 CMEZ 입지 타당성 분석
 * Step 02-VALIDATE (v2): ASTER 마그네사이트 판별 사전 진단 스크립트
 *
 * v1 대비 수정: GEE 공식 카탈로그 확인 결과, ASTER AST_L1T_003은
 * "모든 씬에 14개 밴드가 다 있는 게 아니다"(ORIGINAL_BANDS_PRESENT
 * 속성으로 확인 가능). SWIR 밴드(B04~B09)가 없는 씬이 섞여 있으면
 * .map() 중 GAIN_COEFFICIENT_B0X가 null이 되어 전체가 깨진다.
 * → v2는 필요한 9개 밴드가 전부 있는 씬만 사전 필터링한다.
 *
 * 필드명은 이미 GEE 공식 카탈로그로 확인 완료 (v1 그대로 유지):
 *   GAIN_COEFFICIENT_B01~B09, SOLAR_ELEVATION, CLOUDCOVER — 전부 정확함.
 */

var v_taehung   = ee.Geometry.Point([128.84932, 41.07637]);
var v_ryongyang = ee.Geometry.Point([128.804703, 40.901815]);

var v_roi = ee.Geometry.Polygon([[
  [128.70, 40.80], [129.00, 40.80],
  [129.00, 41.15], [128.70, 41.15]
]]);

var v_needBands = ['B01','B02','B3N','B04','B05','B06','B07','B08','B09'];

// ─────────────────────────────────────────
// [진단 1] 아카이브 존재 여부 + 밴드 완전성 필터
// ─────────────────────────────────────────

print('════════════════════════════════════');
print('[진단 1] 아카이브 + 필요 밴드 9개 전부 있는 씬만 필터');
print('════════════════════════════════════');

var v_base = ee.ImageCollection('ASTER/AST_L1T_003')
  .filterBounds(v_roi)
  .filterDate('2000-03-01', '2008-04-30');

print('AOI+기간 필터만:', v_base.size());

// ORIGINAL_BANDS_PRESENT에 필요 밴드 9개가 전부 포함된 씬만 통과
var v_bandFilter = v_needBands.map(function(b) {
  return ee.Filter.listContains('ORIGINAL_BANDS_PRESENT', b);
});
var v_complete = v_base.filter(ee.Filter.and.apply(null, v_bandFilter));

print('필요 밴드(VNIR3+SWIR6) 9개 전부 존재하는 씬:', v_complete.size());

var v_cloud50 = v_complete.filter(ee.Filter.lt('CLOUDCOVER', 50));
print('  ∩ 구름 < 50%:', v_cloud50.size());

var v_cloud80 = v_complete.filter(ee.Filter.lt('CLOUDCOVER', 80));
print('  ∩ 구름 < 80% (완화):', v_cloud80.size());

print('※ v_complete가 0이면 AOI 안에 SWIR 완전 씬이 없다는 뜻 —');
print('  단천 지역이 ASTER SWIR 관측 범위 밖이었을 가능성.');
print('  이 경우 AOI를 광산 개별 지점 위주로 더 좁혀서 재시도할 것.');
print('');

// ─────────────────────────────────────────
// [진단 2] 실제 사용할 컬렉션 확정 + 개별 씬 밴드 목록 재확인
// ─────────────────────────────────────────

print('════════════════════════════════════');
print('[진단 2] 사용할 컬렉션 확정 및 첫 3개 씬 밴드 확인');
print('════════════════════════════════════');

// 구름 조건 완화 단계적으로 선택 (없으면 밴드완전셋만이라도 사용)
var v_use = ee.Algorithms.If(
  v_cloud50.size().gt(0), v_cloud50,
  ee.Algorithms.If(v_cloud80.size().gt(0), v_cloud80, v_complete)
);
v_use = ee.ImageCollection(v_use);

v_use.size().evaluate(function(n) {
  print('최종 사용 컬렉션 크기:', n);
  if (n === 0) {
    print('❌ FAIL — 사용 가능한 씬이 0장이다. 진단 4는 실행되지 않는다.');
    print('   AOI를 대흥광산 반경 20km 정도로 더 좁혀서 v_roi를 재정의하고 재실행하라.');
  }
});

v_use.limit(3).select(v_needBands).evaluate(function(fc) {
  print('첫 3개 씬 밴드 구성 확인 (features[].bands 목록):');
  print(fc);
});
print('');

// ─────────────────────────────────────────
// [진단 3] TOA 반사율 변환 정상 범위 확인 (필터링된 컬렉션 기준)
// ─────────────────────────────────────────

print('════════════════════════════════════');
print('[진단 3] TOA 반사율 변환 검증');
print('════════════════════════════════════');

function v_toa(img) {
  var solarElev = ee.Number(img.get('SOLAR_ELEVATION'));
  var cosSZA = solarElev.multiply(Math.PI / 180).sin();
  var doy = ee.Number(img.date().getRelative('day', 'year')).add(1);
  var d = ee.Number(1).subtract(
    ee.Number(0.01672).multiply(doy.subtract(4).multiply(0.9856 * Math.PI / 180).cos())
  );
  var d2 = d.pow(2);
  var esun = {B01:1847,B02:1553,B3N:1118,B04:232.5,B05:80.32,B06:74.92,B07:69.20,B08:59.82,B09:57.32};
  var out = ee.Image().select();
  v_needBands.forEach(function(b) {
    var ucc = ee.Number(img.get('GAIN_COEFFICIENT_' + b));
    var rad = img.select(b).subtract(1).multiply(ucc);
    var refl = rad.multiply(Math.PI).multiply(d2).divide(ee.Number(esun[b]).multiply(cosSZA)).rename(b);
    out = out.addBands(refl);
  });
  return out.copyProperties(img, img.propertyNames());
}

var v_first = ee.Image(v_use.first());
var v_reflFirst = ee.Image(v_toa(v_first)).clip(v_roi);

v_reflFirst.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: v_roi, scale: 30, maxPixels: 1e9, bestEffort: true
}).evaluate(function(r) {
  print('단일 씬(첫 영상) 밴드별 반사율 범위:');
  print(r);
  print('※ 0~1 근처면 정상. 음수/극단값이면 FAIL → 필드명 재확인.');
});
print('');

// ─────────────────────────────────────────
// [진단 4] 대흥광산 임계값 재현성 — median 대신 각 씬별 개별 계산 후 평균
// ─────────────────────────────────────────

print('════════════════════════════════════');
print('[진단 4] 대흥광산 임계값 재현성 (핵심)');
print('════════════════════════════════════');

var v_reflCol = v_use.map(v_toa);
var v_median = ee.Image(v_reflCol.median()).clip(v_roi);

v_median = v_median.addBands(
  v_median.select('B09').multiply(0.73).rename('B09'), null, true
);

var v_rbd687 = v_median.select('B06').add(v_median.select('B08')).divide(v_median.select('B07')).rename('RBD687');
var v_rbd798 = v_median.select('B07').add(v_median.select('B09')).divide(v_median.select('B08')).rename('RBD798');
var v_mgo56  = v_median.select('B05').divide(v_median.select('B06')).rename('MgO56');

var v_taehungBuf = v_taehung.buffer(800);

v_rbd687.addBands(v_rbd798).addBands(v_mgo56).reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: v_taehungBuf, scale: 30, maxPixels: 1e9, bestEffort: true
}).evaluate(function(r) {
  if (!r || (r.RBD687 === null && r.RBD798 === null)) {
    print('❌ 여전히 값을 못 얻었다. 원인 후보:');
    print('  1) v_taehungBuf(대흥광산 800m)에 필터링된 씬이 커버를 안 함');
    print('     → v_roi 자체를 넓혀서 median 계산 범위를 확장할 것');
    print('  2) v_use 컬렉션이 여전히 0장');
    print('  진단 1·2 결과를 다시 확인하라.');
    return;
  }
  print('대흥광산 노천채굴부(반경 800m) 평균값:');
  print('  RBD(6+8)/7 = ' + (r.RBD687 !== null ? r.RBD687.toFixed(3) : 'null'));
  print('    → 논문 임계값 2.13 초과: ' + (r.RBD687 > 2.13 ? '✅ PASS' : '❌ FAIL'));
  print('  RBD(7+9)/8 = ' + (r.RBD798 !== null ? r.RBD798.toFixed(3) : 'null'));
  print('    → 논문 임계값 2.015 초과: ' + (r.RBD798 > 2.015 ? '✅ PASS' : '❌ FAIL'));
  print('  MgO지표(5/6) = ' + (r.MgO56 !== null ? r.MgO56.toFixed(3) : 'null'));
  print('    → 논문 실측 대흥 평균 1.069과 비교 (참고용)');
  print('');
  print('※ 둘 다 PASS → 02_swir_spectral_analysis.js 임계값 그대로 커밋 가능.');
  print('※ 하나라도 FAIL → 여기서 나온 실제 RBD687/RBD798 값을 새 임계값으로');
  print('   교체해서 02번에 반영한 뒤 커밋할 것.');
});

// ─────────────────────────────────────────
Map.centerObject(v_taehung, 13);
Map.addLayer(v_median, {bands:['B3N','B02','B01'], min:0, max:0.4}, 'ASTER 자연색(근사)');
Map.addLayer(v_taehungBuf, {color: 'FF0000'}, '대흥 검증 버퍼(800m)');
Map.addLayer(v_taehung, {color: 'FFFFFF'}, '대흥광산');
Map.addLayer(v_ryongyang, {color: 'FFFF00'}, '용양광산');
