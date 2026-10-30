# HealingMart EXAM — 실제 신청할 신규 인증키 (2026-10-30)

**정정:** 앞선 41개 목록은 실제 신규 발급키 41개가 아니다. 기존 키 이름 25개 + 신규 후보 4개 + 미검증 내부 예약명 12개를 섞은 목록이었다. 예약명은 API 제공기관에 그대로 신청할 수 있는 이름이 아니다.

## A. 실제 신규 신청: 3건의 신청, 4개 환경변수

| 우선순위 | 새 환경변수 이름 | 제공기관 | 신청 내용 | 신청/안내 |
|---|---|---|---|---|
| 1 | `NEIS_API_KEY` | 교육부 나이스 교육정보 개방 포털 | 학사일정, 학교정보 | https://open.neis.go.kr/portal/guide/actKeyPage.do |
| 1 | `NAVER_SEARCH_CLIENT_ID` | 네이버 개발자센터 | 검색 API(뉴스/블로그/웹) 애플리케이션 등록으로 발급되는 Client ID | https://developers.naver.com/ |
| 1 | `NAVER_SEARCH_CLIENT_SECRET` | 네이버 개발자센터 | 같은 애플리케이션 등록으로 함께 발급되는 Client Secret | https://developers.naver.com/ |
| 2 | `KRIVET_OPENAPI_KEY` | 한국직업능력연구원 | 연구보고서/논문/동향지 OpenAPI(민간자격 원장 API 아님) | https://www.krivet.re.kr/kor/sub.do?menuSn=43 |

네이버는 ID와 Secret 2개 필드지만 **신청 1건**. 나이스 1건, KRIVET 1건으로 총 **신청 3건**.
* 실제 계정에 이미 해당 키가 있는지는 제공기관 로그인 후 확인해야 한다.
* 변수명은 우리가 Cloudflare Secret에 붙이는 이름이다. 제공기관이 그 이름으로 발급하는 것이 아니다.

## B. 신규 인증키 발급 대신 기존 키로 'API별 활용신청/승인' 확인

- `HRDK_SCHEDULE_SERVICE_API_KEY`: 국가기술자격 종목별 시험정보 https://www.data.go.kr/data/15003029/openapi.do
- `DATA_GO_KR_API_KEY`: NCS 기준정보 https://www.data.go.kr/data/15128213/openapi.do
- `DATA_GO_KR_API_KEY`: 국가기술자격 지역별 자격취득 https://www.data.go.kr/data/15040841/openapi.do
- `DATA_GO_KR_API_KEY`: 국가자격 계열정보 https://www.data.go.kr/data/15064868/openapi.do
- `DATA_GO_KR_API_KEY`: 연도별 복수자격 취득현황 https://www.data.go.kr/data/15108882/openapi.do
- `KOSIS_API_KEY`: 통계검색, 통계목록, 통계표, 자료·설명은 동일 KOSIS 키 재사용. 별도 5개 키를 발급받지 말 것.

공공데이터포털은 API별 활용신청 승인과 실제 인증키 공유를 혼동하지 말 것.

## C. 발급 불필요 / 아직 요청하지 말 것

- 민간자격등록정보 원장: 공식 CSV 다운로드. PQI 전용 실시간 API가 확인되지 않았음
- `PQI_PRIVATE_QUALIFICATION_API_KEY`, `KICE_CSAT_API_KEY`, `MPM_EXAM_API_KEY`: 검증되지 않은 예약 이름
- `HRDK_QUALIFICATION_LIST_API_KEY`, `HRDK_QUALIFICATION_DETAIL_API_KEY`, `HRDK_ACQUISITION_STATS_API_KEY`, `HRDK_PASS_RATE_API_KEY`, `HRDK_PUBLIC_QUESTIONS_API_KEY`, `HRDK_EXAM_VENUE_API_KEY`, `HRDK_CQNET_SCHEDULE_API_KEY`, `NCS_API_KEY`, `ALIO_RECRUIT_API_KEY`: **실제 별도 인증키라고 검증되지 않은 내부 변수명**. 공공데이터포털 기존 키와 각 API의 승인 여부부터 확인.

## 활용 설명 예시 (200자 이내)

> 힐링편의점(HealingMart EXAM)에서 국가시험·민간자격·교육·통계·취업 관련 정보를 공식 자료를 바탕으로 검색·비교·달력 형태로 무료 제공합니다. 데이터의 출처와 갱신일을 표시하며, 서비스 운영을 위해 Google AdSense 광고가 포함될 수 있습니다.

## 보안

Cloudflare Worker Settings > Variables and Secrets에 필요 시 등록. GitHub에는 값 업로드 금지. 아직 연결하지 않은 기능에 불필요한 Secret을 대량 등록할 이유는 없음.
