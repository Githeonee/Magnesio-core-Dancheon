[README.md](https://github.com/user-attachments/files/31032658/README.md)
# Danchen CMEZ — GEE Spatial Analysis

Magnesio-Core: 단천 마그네사이트 스마트 경제특구 입지 타당성 분석
> 2026 남북교류와 미래 국토비전 작품 공모전 제출작
> 주최: 대한국토·도시계획학회 / 후원: 국토교통부·통일부

---

## 프로젝트 개요

본 저장소는 함경남도 단천시를 대상으로 한 핵심광물 경제특구(CMEZ: Critical Minerals Economic Zone) 입지 타당성 분석을 위한 Google Earth Engine(GEE) 코드를 포함합니다.

중국의 마그네슘 공급망 독점(글로벌 점유율 60~80%)에 대응하여, 북한 단천 지역의 마그네사이트 자원(용양광산 확정 매장량 7.7억톤, MgO 45.82%)을 활용한 탈중국 핵심소재 공급망 거점 조성 가능성을 GIS 기반으로 검증합니다.

> 🔄 **2026.06 개정**: 입지 기준을 광산 근접 → 단천항 근접(배후 정련단지)으로 확정. 이전 "2.19 km²"(GEE unmask 오류로 인한 산출 오류값) 및 "31.88 km²"(상이 AOI 기준값)는 **전면 폐기**. 항만 5km 가용지 11.44 km² · 1단계 배치 1.85 km²로 교체.

---

## 파일 구조

```
danchen-cmez-gee/
│
├── README.md                         # 프로젝트 설명
├── .gitignore                        # Git 제외 파일
│
├── 01_basic_visualization.js         # 단천 기본 위성 이미지 + 광산·항만 포인트
├── 02_swir_spectral_analysis.js      # ASTER SWIR 마그네사이트 판별 (현장 캘리브레이션 방식)
├── 02_validate_diagnostic_v2.js      # 02번 사전검증 스크립트 (재현성 증거, 매 GEE 세션 갱신 시 재실행 권장)
├── 03_terrain_analysis.js            # DEM 기반 지형·경사도 분석
├── 04_flood_risk_analysis.js         # 홍수 리스크 + 가용지 산출 (unmask 보정, 11.44 km²)
├── 05_export.js                      # GeoTIFF Export (Google Drive)
├── 06_phase1_port_zone.js    # Sentinel-2 커버리지 검증 (2020–2024, 구름<30%)
│
└── python/
    └── zone_b_analysis.py            # Zone B/C/E 면적 재현 검증 스크립트
```

---

## 핵심 분석 결과

| 항목 | 수치 | 분석 방법 |
|---|---|---|
| 용양-대흥 광산 간 거리 | **19.7 km** | GEE 거리 계산 |
| 용양-단천항 거리 | **55.2 km** | GEE 거리 계산 |
| CMEZ 전체 AOI 면적 | **121.83 km²** | NASA SRTM DEM, 경사도 필터 |
| 단천항 5km 가용지(1단계 후보) | **11.44 km²** | 경사도 5도 이하 AND 홍수위험 제외 (unmask 보정) |
| 1단계 실배치 (Zone B+C+E) | **1.85 km²** | GIS 검증 평탄지 내 데이터 기반 배치 |
| ├ Zone B (정련·가공) | **0.828 km²** | — |
| ├ Zone C (AI 스마트인프라) | **0.613 km²** | — |
| └ Zone E (배후지원) | **0.405 km²** | — |
| Zone B 중심 좌표 | **40.4546°N / 128.9139°E** | QGIS centroid, EPSG:4326 |
| Zone B → 단천항 직선거리 | **4.74 km** | — |
| Zone B 하천 설정 거리 | **693 m** | — |
| Zone B 경사도 | **1.22° (1–3°)** | NASA SRTM DEM |
| Zone B 고도 | **2 m** | NASA SRTM DEM |

> ⚠️ 이전 버전에서 사용된 "31.88 km²"(전체 Zone B), "2.19 km²"(최종 유효 Zone B)는 **GEE `focalMax` 단계에서 `unmask(0)` 처리 누락으로 발생한 산출 오류값**이며 전면 폐기되었습니다. 현재 면적 체계는 121.83 → 11.44 → 1.85(B+C+E) km²의 포함관계로 재구성되었습니다.

---

## 정정 이력 (Reproducibility)

본 저장소는 분석의 재현가능성과 자기검증 과정을 투명하게 공개한다. 오류가 발견된 항목은 삭제하지 않고 정정 사유와 함께 기록한다.

| 구분 | v1 (초기) | v2 (현재, 확정) |
|---|---|---|
| 입지 기준 | 광산 근접 | 단천항 근접 (배후 정련단지) |
| 대표 면적 | "최종 유효 Zone B 2.19 km²" | 1단계 배치 1.85 km² / 후보영역 11.44 km² |
| 산출 오류 | `focalMax` 수면 마스크 `unmask` 누락 → 유효영역 과소산출 | `unmask(0)` 보정, 검산(평탄지−홍수겹침=가용지) 일치 |
| AOI | 광산권 협역 박스 (31.88 km² 평탄지) | 단천항 포함 확장 박스 (121.83 km² 가용지) |
| 마그네사이트 판별 | Landsat 9 SWIR2/SWIR1 비율 | ASTER SWIR RBD, 대흥광산 현장 캘리브레이션(μ−1σ) |

**① 면적 오류.** `focalMax` 홍수 마스크에서 `unmask(0)`을 누락하여 유효영역이 과소산출되었다. 검산 결과 전체 평탄지 − 홍수 겹침 ≠ 2.19로 불일치가 확인되어 로직을 전면 수정했다.

**② 방법론 교체 (Landsat → ASTER).** Landsat OLI의 SWIR2 밴드폭(2.11–2.29μm)은 마그네사이트(~2.30μm)·백운석(~2.32μm)·방해석(~2.34μm)의 진단 흡수대를 분해하지 못한다. 세 광물이 한 밴드에 뭉쳐 구분이 불가능하므로, v1의 Landsat 접근은 마그네사이트 "탐지"라 부를 수 없는 단순 탄산염 스크리닝이었다. ASTER SWIR 6밴드 기반 RBD 판별 방식으로 전면 교체했다.

**③ 절대 임계값 → 현장 캘리브레이션 (2026.08).** 논문(Son et al. 2022)의 절대 임계값(RBD687>2.13, RBD798>2.015)을 GEE에서 실측 검증한 결과, 대흥광산 노천채굴부(기지 마그네사이트) 38개 씬 median에서 RBD687=1.877, RBD798=1.824로 **둘 다 미달**했다(검증 스크립트 `02_validate_diagnostic_v2.js` 실행 결과, 2026.08). 논문은 FLAASH 대기보정 반사율을 쓰지만 GEE ASTER는 대기보정 전 TOA만 제공하여 체계적 오프셋(88~91%)이 발생한 것으로 판단, 대흥 노천부 실측값을 자체 기준점으로 삼는 상대 임계값(μ−1σ, 매 실행마다 서버사이드 재계산)으로 전환했다.

> "31.88 km²"는 광산권 협역 박스의 경사 5도 이하 평탄지 총량으로, 항만 중심 분석과 AOI가 달라 직접 비교하지 않는다(`03_terrain_analysis.js` 참조).

---

## 대상 지역 좌표

| 지점 | 위도 | 경도 | 출처 |
|---|---|---|---|
| 용양광산 (Ryongyang Mine) | 40.901815°N | 128.804703°E | CSIS Beyond Parallel (2019) |
| 대흥청년영웅광산 (Taehung Mine) | 41.07637°N | 128.84932°E | OpenStreetMap |
| 단천항 (Danchen Port) | 40.412522°N | 128.917731°E | NK Econ Watch (2013) |
| Zone B 중심 (확정) | 40.4546°N | 128.9139°E | QGIS centroid 산출 |

---

## 사용 방법

### 사전 요건
- Google Earth Engine 계정 (Community 등급 이상)
- [GEE Code Editor](https://code.earthengine.google.com) 접속

### 실행 순서
```
1. code.earthengine.google.com 접속
2. 각 .js 파일 내용을 코드 에디터에 붙여넣기 (파일마다 별도 스크립트로 실행 — 변수명 접두사 분리되어 있음)
3. Run 버튼 클릭
4. 05_export.js 실행 후 Tasks 탭에서 Run 클릭
5. Google Drive > GEE_Danchen 폴더에서 결과 확인
6. python/zone_b_analysis.py 로 면적 재현 검증 (121.83 / 11.44 km² 재현 확인 필수)
```

### 권장 실행 순서
```
01 → 02 → 03 → 04 → 06(커버리지 검증) → 05(export)
```

---

## 데이터 소스

| 데이터 | 출처 | GEE 컬렉션 ID |
|---|---|---|
| 지형 고도(DEM) | NASA SRTM 30m | `USGS/SRTMGL1_003` |
| 위성 이미지 (분석) | Sentinel-2 SR Harmonized | `COPERNICUS/S2_SR_HARMONIZED` |
| 수면 발생 빈도 | JRC Global Surface Water | `JRC/GSW1_4/GlobalSurfaceWater` |
| SWIR 분광(마그네사이트 판별) | ASTER L1T (1999–2008.4 아카이브) | `ASTER/AST_L1T_003` |

### 마그네사이트 판별 기준 (v3 — 현장 캘리브레이션)

**절대 임계값(RBD687>2.13, RBD798>2.015)은 GEE 환경에서 재현되지 않음이 실측으로 확인되어 폐기.** 대흥광산 노천채굴부(기지 마그네사이트) 38개 씬 median 실측 결과 RBD687=1.877, RBD798=1.824로 논문 임계값에 미달했다(원인: 논문은 FLAASH 대기보정 반사율, GEE는 대기보정 전 TOA 근사만 제공 — 체계적 오프셋 88~91%).

현재는 **대흥 노천부 실측값을 자체 기준점(μ−1σ)으로 삼는 상대 임계값**을 매 실행마다 서버사이드로 재계산하는 방식으로 전환했다(`02_swir_spectral_analysis.js` 참조). 판별 로직(RBD 두 조건 동시 적용)과 밴드 조합 자체는 논문을 그대로 따른다.

> ⚠️ 이 방식은 대흥 노천부를 마그네사이트로 전제하고 임계값을 역산하므로 순환논증에 가깝다. 결과는 "확정 부존"이 아니라 "대흥과 분광특성이 유사한 영역의 상대 분포"로만 해석해야 하며, 확정적 부존량 판정에는 현장 시추 조사가 필요하다.

> 근거: Son et al. (2022), *Remote Sensing* 14(1), 181 (KIGAM). 해당 논문은 중국 랴오닝과 **북한 단천** 두 곳을 대상으로 암석시료를 직접 분석했으며, 단천 시료 29점(마그네사이트 25·백운석 4)을 포함한다. 본 프로젝트의 대흥·용양 광산이 논문에 실명으로 등장하므로, 유사 사례가 아니라 **동일 대상지에 대한 선행 검증 연구**다.
>
> ※ 일부 문헌에서 쓰이는 (B6+B8)/(B7+B9)는 Fatima et al. (2017), *J. Appl. Remote Sens.* 11(4) 046006의 일반 마그네사이트 밴드비로, 위 논문의 식이 아니다.

---

## 참고 문헌

| 자료 | 내용 | URL |
|---|---|---|
| CSIS Beyond Parallel (2019) | 용양광산 위성 분석 | [링크](https://beyondparallel.csis.org/mining-north-korea-magnesite-production-at-ryongyang-mine/) |
| CSIS Beyond Parallel (2019) | 대흥광산 위성 분석 | [링크](https://beyondparallel.csis.org/mining-north-korea-magnesite-production-at-the-taehung-youth-hero-mine/) |
| NK Econ Watch (2013) | 단천항 준공 현황 | [링크](https://www.nkeconwatch.com/2013/04/25/tanchon-port-reconstruction-to-be-completed-by-2012/) |
| CSIS Beyond Parallel (2018) | 남북 철도 협력 현황 | [링크](https://beyondparallel.csis.org/making-solid-tracks-north-and-south-korean-railway-cooperation/) |
| 통일부 북한정보포털 | 용양광산 매장량·품위 | [링크](https://nkinfo.unikorea.go.kr) |
| USGS Mineral Commodity Summaries | 북한 마그네사이트 매장량 | [링크](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries) |
| Son et al. (2022), *Remote Sensing* 14(1), 181 | ASTER RBD 판별 원리·MgO 품위지표 근거 (랴오닝·**단천** 시료 직접 분석). 절대 임계값은 GEE 미재현으로 현장 캘리브레이션 대체 | [DOI](https://doi.org/10.3390/rs14010181) |
| Fatima et al. (2017), *J. Appl. Remote Sens.* 11(4) 046006 | 일반 마그네사이트 밴드비 (보조 지표) | — |

---

## 한계 및 주의사항

```
1. 북한은 현장 접근 불가 지역으로 모든 분석은
   공개 위성 데이터 기반 원격 탐사 결과임

2. 광산 내부 시설·지하 광맥은 위성 분석으로
   직접 탐지 불가 (지표 분광 분석 기반 간접 추정)

3. 본 분석은 남북관계 호전 및 교류·협력이
   가능한 상황을 전제로 한 정책 기획 목적임

4. 단천항 수심·하역 능력·함경선 철도 상태는
   남북 교류 재개 후 공동 실태조사를 통해 확정 필요

5. 면적 수치는 재현 가능성 검증 대상임 —
   python/zone_b_analysis.py 재실행 시 소수 둘째 자리까지
   일치해야 함(셋째 자리 차이는 투영법 차이로 정상)
```

---

## 라이선스

본 코드는 학술·연구 목적으로 공개되며 상업적 사용을 금합니다.
