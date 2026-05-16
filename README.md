# Danchen CMEZ — GEE Spatial Analysis
Magnesio-Core: 단천 마그네사이트 스마트 경제특구 입지 타당성 분석

> 2026 남북교류와 미래 국토비전 작품 공모전 제출작  
> 주최: 대한국토·도시계획학회 / 후원: 국토교통부·통일부

---

## 프로젝트 개요

본 저장소는 함경남도 단천시를 대상으로 한 핵심광물 경제특구(CMEZ: Critical Minerals Economic Zone) 입지 타당성 분석을 위한 Google Earth Engine(GEE) 코드를 포함합니다.

중국의 마그네슘 공급망 독점(글로벌 점유율 60~80%)에 대응하여, 북한 단천 지역의 마그네사이트 자원(용양광산 확정 매장량 7.7억톤, MgO 45.82%)을 활용한 탈중국 핵심소재 공급망 거점 조성 가능성을 GIS 기반으로 검증합니다.

---

## 파일 구조

```
danchen-cmez-gee/
│
├── README.md                         # 프로젝트 설명
├── .gitignore                        # Git 제외 파일
│
├── 01_basic_visualization.js         # 단천 기본 위성 이미지 + 광산·항만 포인트
├── 02_swir_spectral_analysis.js      # SWIR 분광 분석 (Mg-OH 흡수대)
├── 03_terrain_analysis.js            # DEM 기반 지형·경사도 분석 + Zone B 면적
├── 04_flood_risk_analysis.js         # 홍수 리스크 분석 + 최종 유효 Zone B
└── 05_export.js                      # GeoTIFF Export (Google Drive)
```

---

## 핵심 분석 결과

| 항목 | 수치 | 분석 방법 |
|------|------|---------|
| 용양-대흥 광산 간 거리 | **19.7 km** | GEE 거리 계산 |
| CMEZ 전체 Zone B 면적 | **31.88 km²** | NASA SRTM DEM, 경사도 5도 이하 |
| 홍수 고위험 구역 면적 | **5.86 km²** | JRC GSW, 하천 인접 500m |
| **최종 유효 Zone B** | **2.19 km²** | 홍수 리스크 제외 후 |
| CMEZ 고도 중앙값 | **1,163.5 m** | NASA SRTM DEM |
| 용양광산 평균 경사도 | **24.2도** | NASA SRTM DEM |
| 대흥광산 평균 경사도 | **22.3도** | NASA SRTM DEM |

> 최종 유효 Zone B(2.19 km²)는 고려아연 온산제련소(약 1.42 km²) 대비 약 1.5배 규모로,  
> 마그네시아 크링카 정련·가공 특화 클러스터 입지에 충분한 면적이다.

---

## 대상 지역 좌표

| 지점 | 위도 | 경도 | 출처 |
|------|------|------|------|
| 용양광산 (Ryongyang Mine) | 40.901815°N | 128.804703°E | CSIS Beyond Parallel (2019) |
| 대흥청년영웅광산 (Taehung Mine) | 41.07636°N | 128.84944°E | OpenStreetMap |
| 단천항 (Danchen Port) | 40.412522°N | 128.917731°E | NK Econ Watch (2013) |

---

## 사용 방법

### 사전 요건
- Google Earth Engine 계정 (Community 등급 이상)
- [GEE Code Editor](https://code.earthengine.google.com) 접속

### 실행 순서

```
1. code.earthengine.google.com 접속
2. 각 .js 파일 내용을 코드 에디터에 붙여넣기
3. Run 버튼 클릭
4. 05_export.js 실행 후 Tasks 탭에서 Run 클릭
5. Google Drive > GEE_Danchen 폴더에서 결과 확인
```

### 권장 실행 순서

```
01 → 02 → 03 → 04 → 05
```

---

## 데이터 소스

| 데이터 | 출처 | GEE 컬렉션 ID |
|--------|------|--------------|
| 지형 고도(DEM) | NASA SRTM 30m | `USGS/SRTMGL1_003` |
| 위성 이미지 | Landsat 9 Collection 2 | `LANDSAT/LC09/C02/T1_L2` |
| 수면 발생 빈도 | JRC Global Surface Water | `JRC/GSW1_4/GlobalSurfaceWater` |

---

## 참고 문헌

| 자료 | 내용 | URL |
|------|------|-----|
| CSIS Beyond Parallel (2019) | 용양광산 위성 분석 | [링크](https://beyondparallel.csis.org/mining-north-korea-magnesite-production-at-ryongyang-mine/) |
| CSIS Beyond Parallel (2019) | 대흥광산 위성 분석 | [링크](https://beyondparallel.csis.org/mining-north-korea-magnesite-production-at-the-taehung-youth-hero-mine/) |
| NK Econ Watch (2013) | 단천항 준공 현황 | [링크](https://www.nkeconwatch.com/2013/04/25/tanchon-port-reconstruction-to-be-completed-by-2012/) |
| CSIS Beyond Parallel (2018) | 남북 철도 협력 현황 | [링크](https://beyondparallel.csis.org/making-solid-tracks-north-and-south-korean-railway-cooperation/) |
| 통일부 북한정보포털 | 용양광산 매장량·품위 | [링크](https://nkinfo.unikorea.go.kr) |
| USGS Mineral Commodity Summaries | 북한 마그네사이트 매장량 | [링크](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries) |

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
```

---

## 작성자

- **소속:** 강원대학교 부동산학과
- **공모전:** 2026 남북교류와 미래 국토비전 작품 공모전 (학생부문)
- **제출일:** 2026년 10월

---

##  라이선스

본 코드는 학술·연구 목적으로 공개되며 상업적 사용을 금합니다.
