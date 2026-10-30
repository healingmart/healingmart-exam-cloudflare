# 시험정보 API 키 요청서

## 1차 — 연결 가능한 기존 변수명

| Secret name | 목적 | 단계 |
|---|---|---|
| `HRDK_SCHEDULE_SERVICE_API_KEY` | Q-Net 국가기술/전문자격 종목별 일정 | 공식 endpoint 정상 호출 검증 후 |
| `DATA_GO_KR_API_KEY` | 공공데이터포털 승인 endpoint | 해당 API 승인 확인 후 |
| `DATA_GO_KR_SEARCH_API_KEY` | 공공데이터 검색·발견 | 선택 (필수 아님) |
| `KOSIS_API_KEY` | 시험·자격 관련 공식 통계가 실제 존재할 때 | 선택 (현재 비활성) |

위 4개는 기존 `healingmart/API_KEY` 관리 저장소의 **변수명**만 확인됨. 값은 확인/복사하지 않음.
각 키의 존재와 해당 endpoint 활용 승인은 다르다.
신규 등록 시 Cloudflare → Workers → 해당 Worker → Settings → Variables and Secrets → Add → Secret 에 변수명을 정확히 입력.
**사용 전에는 키 추가 불필요.**

## 추후 공식기관별 추가 가능성

| Source | 기준 |
|---|---|
| 민간자격정보서비스(PQI) | 공식 CSV 원장: API 키 불필요; 실시간 API 제공·허가 여부 별도 확인 |
| 한국교육과정평가원 수능·모의평가 | 공식 공고 수집; 별도 API 제공 확인 전에는 키 요청하지 않음 |
| 지방공무원·교원임용 | 교육청 및 시·도 주관기관 공식 공고; 동일 |
| 어학시험(TOEIC/TOEFL 등) | 주관기관별 공식 공개 일정과 이용조건 확인 필요 |
| Q-Net 실적 통계 | 자격별 응시·합격 실적의 공식 원천 데이터 확인 필요 |

시험 응시자 순위·난도 순위는 정량 지표(지원자/응시자/합격률), 기준연도, 출처 없이는 생성하거나 추정하지 않음.
