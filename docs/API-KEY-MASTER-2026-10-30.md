# HealingMart EXAM — API 키 이름 전체 계획 (2026-10-30)

이 문서는 **키 이름과 후보 역할만** 기록합니다. 실제 비밀 값은 절대 GitHub에 저장하지 않습니다. `healingmart/API_KEY`의 2026-10-27 키 **이름 목록**과 공식 제공기관 문서를 비교했습니다.

## 1. 기존 API_KEY 저장소에 이름이 있는 항목 (25개)

### 시험·공공데이터 기반 (3)
- `HRDK_SCHEDULE_SERVICE_API_KEY` — Q-Net 국가자격 시험일정
- `DATA_GO_KR_API_KEY` — 공공데이터포털 승인 서비스
- `DATA_GO_KR_SEARCH_API_KEY` — 공공데이터 검색

### KOSIS 통계 (6)
- `KOSIS_API_KEY` — KOSIS 공유서비스 기본 인증키
- `KOSIS_STAT_DATA_API_KEY` — 통계자료, 동일 인증키 별칭으로 이용 가능
- `KOSIS_STAT_LIST_API_KEY` — 통계목록, 동일 인증키 별칭으로 이용 가능
- `KOSIS_STAT_EXPLANATION_API_KEY` — 통계설명, 동일 인증키 별칭으로 이용 가능
- `KOSIS_INDICATOR_DESC_API_KEY` — 지표 설명 관련 기존 변수명; API별 승인·인증방식 확인
- `KOSIS_TABLE_DESC_API_KEY` — 통계표 설명 관련 기존 변수명; API별 승인·인증방식 확인

KOSIS 공유서비스는 **인증키 한 개로 통계목록·자료·설명·통합검색을 이용할 수 있음**. 기능별로 별도 키를 발급받지 말 것.

### 취업·직업훈련 (5)
- `WORK24_TRAINING_API_KEY` — 직업훈련
- `WORK24_JOB_SUPPORT_API_KEY` — 취업지원·일자리
- `WORK24_WORKLEARN_API_KEY` — 일학습병행·훈련
- `WORK24_CONSORTIUM_API_KEY` — 훈련 컨소시엄
- `WORK24_EMPLOYER_TRAINING_API_KEY` — 사업주 훈련

### 장학·지원 (6)
- `KOSAF_UNIVERSITY_AID_API_KEY` — 대학 학자금지원
- `KOSAF_HIGH_SCHOOL_AID_API_KEY` — 고교 지원
- `KOSAF_SCHOLARSHIP_LOAN_API_KEY` — 장학·학자금대출
- `ONTONG_YOUTH_API_KEY` — 청년 지원
- `SSIS_CENTRAL_WELFARE_API_KEY` — 중앙 복지
- `SSIS_WELFARE_SERVICE_API_KEY` — 지자체 복지

### 위치·지역 (2)
- `KAKAO_REST_API_KEY` — 시험장 위치검색·지오코딩
- `KAKAO_JAVASCRIPT_KEY` — 지도 프런트엔드

### 기타 지원정책·콘텐츠 (3)
- `MOIS_PUBLIC_BENEFITS_API_KEY` — 정부 공공서비스
- `NAVER_ACCESS_KEY_ID` — 기존 네이버 키 이름. **네이버 검색 API ID와 동일하다고 가정하지 말 것**
- `NAVER_SECRET_KEY` — 기존 네이버 키 이름. **네이버 검색 API Secret과 동일하다고 가정하지 말 것**

## 2. 신규로 신청·등록 검토할 항목 (실제 인증키 발급처 확인)

- `NEIS_API_KEY` — 나이스 교육정보 개방 포털 공식 인증키 (학교 학사일정·학교정보)
- `NAVER_SEARCH_CLIENT_ID` — 네이버 뉴스·웹·블로그 검색 API의 클라이언트 ID
- `NAVER_SEARCH_CLIENT_SECRET` — 네이버 뉴스·웹·블로그 검색 API의 클라이언트 Secret
- `KRIVET_OPENAPI_KEY` — 한국직업능력연구원 연구보고서 등의 별도 OpenAPI. **민간자격 전체 PQI API라고 가정하지 말 것**

## 3. 향후 분리 가능하도록 예약만 하는 변수명 (공식 발급키로 확정된 이름 아님)

아래는 **우리가 정한 내부 환경변수 이름**입니다. 실제 API가 있는지, 해당 endpoint에 별도 승인이 필요한지 검증해야 합니다. 기존 DATA_GO_KR_API_KEY를 재사용할 수 있다면 별도 발급 불필요.

- `HRDK_QUALIFICATION_LIST_API_KEY` — 국가자격 종목목록
- `HRDK_QUALIFICATION_DETAIL_API_KEY` — 종목별 자격정보
- `HRDK_ACQUISITION_STATS_API_KEY` — 자격 취득자 통계
- `HRDK_PASS_RATE_API_KEY` — 시험 응시·합격률 통계
- `HRDK_PUBLIC_QUESTIONS_API_KEY` — 국가자격 공개문제
- `HRDK_EXAM_VENUE_API_KEY` — 국가자격 시험장 정보
- `HRDK_CQNET_SCHEDULE_API_KEY` — CQ-Net 과정평가형·일학습병행 시험일정
- `NCS_API_KEY` — NCS 기준정보·능력단위
- `ALIO_RECRUIT_API_KEY` — 공공기관 채용 공고
- `PQI_PRIVATE_QUALIFICATION_API_KEY` — **PQI 전체 등록자격 실시간 API가 공식 개방될 경우에만** 사용. 현재 확보된 실제 API 아님.
- `KICE_CSAT_API_KEY` — **수능 일정 전용 공식 API 제공 여부 미확인**. 공개 공고/파일로 우선 처리.
- `MPM_EXAM_API_KEY` — **공무원 일정 전용 API 제공 여부 미확인**. 공식 CSV로 우선 처리.

## 실제 지금 요청할 것

1. 현재 Worker 배포 및 정적 민간자격 CSV 수집은 인증키 없이 가능.
2. 국가자격 일정: 기존 `HRDK_SCHEDULE_SERVICE_API_KEY` 승인·정상 호출 확인.
3. 시험 통계: `KOSIS_API_KEY` 한 개 + 한국산업인력공단 통계 관련 endpoint 승인 확인.
4. 시험 관련 기사: 네이버 검색 API ID/Secret **2개**.
5. 학교 학사일정: `NEIS_API_KEY` 추가 신청.
6. 모든 인증 정보는 Cloudflare Secret 또는 별도 보안 저장소에 저장; GitHub에는 변수명만.

## 공식 안내

- KOSIS 공유서비스: https://kosis.kr/openapi/index/index.jsp
- 한국산업인력공단 오픈API: https://openapi.hrdkorea.or.kr/main
- KRIVET 오픈API: https://krivet.re.kr/kor/sub.do?menuSn=43
- 나이스 교육정보 개방: https://open.neis.go.kr/portal/guide/apiGuidePage.do
- 네이버 뉴스검색: https://developers.naver.com/docs/serviceapi/search/news/news.md
- 국가공무원 시험일정 공식 CSV: https://www.data.go.kr/data/3033611/fileData.do

※ 등록 민간자격 종목의 최신 정식 원장은 공공데이터포털 CSV로 가져오며, 시험 일정은 각 시행기관 공식 일정이 확인된 경우에만 노출합니다.
