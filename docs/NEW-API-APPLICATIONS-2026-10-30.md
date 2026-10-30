# 시험 API 신청 목록 — 전수 정정 (2026-10-30)

> **중요:** 이전 문서가 잘못되었습니다. 41개는 인증키 41개가 아니라 환경변수명 41개입니다. 10월 30일 최신 `healingmart/API_KEY` 이름 목록과 비교하면 **25개 정확히 일치, 16개 이름이 불일치**합니다. 불일치 항목 16개 모두를 신규 신청할 수 있는 것이 아닙니다.

## 누락 16개에 대한 결론

- **기존 보유(2):** `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`은 사용자가 이미 보유한다고 확인. 최신 GitHub 텍스트 목록에는 같은 문자열이 안 보이지만 **신규 신청 대상이 아닙니다**. 네이버 검색광고 키와 네이버 검색 API 키는 별개이므로 사용자의 기존 체크리스트의 실제 변수명으로 연결해야 합니다.
- **기존 유사 키(1):** `KRIVET_OPENAPI_KEY` ← 최신 목록에 `KRIVET_API_KEY`(민간자격등록정보) 있음. **서로 같은 API인지 검증 전까지 추가 발급 대상이라고 단정할 수 없음**.
- **신규 독립 인증키 공식 신청 확인(1):** `NEIS_API_KEY` — https://open.neis.go.kr/portal/guide/apiGuidePage.do
- **별도 인증키 발급이 확인되지 않은 내부 예약명(12):** `HRDK_QUALIFICATION_LIST_API_KEY`, `HRDK_QUALIFICATION_DETAIL_API_KEY`, `HRDK_ACQUISITION_STATS_API_KEY`, `HRDK_PASS_RATE_API_KEY`, `HRDK_PUBLIC_QUESTIONS_API_KEY`, `HRDK_EXAM_VENUE_API_KEY`, `HRDK_CQNET_SCHEDULE_API_KEY`, `NCS_API_KEY`, `ALIO_RECRUIT_API_KEY`, `PQI_PRIVATE_QUALIFICATION_API_KEY`, `KICE_CSAT_API_KEY`, `MPM_EXAM_API_KEY`. **공식 발급 키로 인정하거나 신청하도록 안내하면 안 됨**.

16 = 2 + 1 + 1 + 12. **기존 키를 별도 API에 활용신청하는 행위와 신규 인증키 발급은 별개**입니다.

## 공식 제공처가 확인된 실제 데이터 — 각각 기존 공공데이터 인증키의 활용신청 상태 확인

| 제공 데이터 | 공식 링크 | 구분 |
|---|---|---|
| Q-Net 국가기술자격 종목별 시험정보 | https://www.data.go.kr/data/15003029/openapi.do | OpenAPI |
| Q-Net 국가자격 계열정보 | https://www.data.go.kr/data/15064868/openapi.do | OpenAPI |
| Q-Net 관심자격 정보 | https://www.data.go.kr/data/15064547/openapi.do | OpenAPI |
| Q-Net 국가기술자격 시험장 | https://www.data.go.kr/data/15088949/openapi.do | OpenAPI |
| Q-Net 국가기술자격 지역별 취득정보 | https://www.data.go.kr/data/15040841/openapi.do | OpenAPI |
| Q-Net 복수자격 취득현황 | https://www.data.go.kr/data/15108882/openapi.do | OpenAPI |
| Q-Net 국가기술자격시험 공통 시험기준 | https://www.data.go.kr/data/15150358/openapi.do | OpenAPI |
| NCS 기준정보 | https://www.data.go.kr/data/15128213/openapi.do | OpenAPI |
| NCS 활용자료 | https://www.data.go.kr/data/15086446/openapi.do | OpenAPI |
| 국가기술자격 통계 정보(필기/실기/취득) | https://www.data.go.kr/data/15025329/openapi.do | OpenAPI — 추가 발견 |

**파일로 받을 수 있어 API 활용신청이 필수는 아닌 데이터**

- 국가공무원 시험일정 — https://www.data.go.kr/data/3033611/fileData.do (CSV)
- 국가자격 CBT 통계 및 현황 — https://www.data.go.kr/data/15081999/fileData.do (CSV)
- 민간자격등록정보 원장 — https://www.data.go.kr/data/15075600/fileData.do (CSV)

## 아직 확인되지 않은 것

- 사용자 공공데이터포털 계정에서 위 각 endpoint 활용신청이 승인됐는지
- `KRIVET_API_KEY`가 외부 연구보고서 API에도 사용되는지
- 민간자격 실시간 API / 수능 전용 일정 API / 공무원 전용 API의 별도 인증키
- 네이버 검색 키를 사용자가 실제로 저장한 환경변수명

위 사항을 모르는 상태에서 "신청할 키가 16개다", "12개다", "1개가 전부다"라고 확정적으로 말하지 말 것.

**단계별 권장:** NEIS 인증키 발급 → 위 공식 OpenAPI의 기존 키 승인 상태 확인 → 필요한 API만 활용신청 → 검증된 정적 JSON 수집기 구축. 실제 Secret 값은 GitHub에 절대 저장하지 않음.
