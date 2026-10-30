# HealingMart EXAM ATLAS

**대한민국 시험·자격정보를 오늘 날짜 중심으로 탐색하는 독립 웹 서비스.**
Cloudflare Workers Static Assets 우선, 무거운 API 서버·D1·KV·R2 없이 운영합니다.

- **서비스:** https://healingmart-exam-cloudflare.eternityland34.workers.dev
- **GitHub:** https://github.com/healingmart/healingmart-exam-cloudflare
- **기준일:** 2026-10-30
- **실제 수록:** 민간자격 **65,051종목(2026-06-30 공식 CSV의 현재상태 '등록완료')** + 국가기술자격 초기 예시 2종목 = **65,053종목**
- **제외:** 2026-06-30 CSV의 등록폐지 22,414종목, 등록취소 13종목
- **참고:** PQI가 2026-10-02 발표한 현황은 67,236개. 시점이 다르므로 본 서비스 수록량으로 혼용하지 않습니다.
- **검증 일정:** 교육부 공식 발표 2027학년도 수능 시험일 2026-11-19 / 성적 통지일 2026-12-11 (2건). 이외 일정은 검증 전이라 빈 상태를 유지합니다.
- **공식 소식:** PQI, 교육부/교육청 등 출처·발행일 검증된 3건.
- **통계 순위:** 공식 응시자·합격 데이터 미연결. 순위를 생성하지 않으며 비어 있음을 명시.

## 설치·검사·배포

```powershell
npm ci
npm run check
npx wrangler deploy
```

현재 의존성은 Wrangler뿐이며 앱은 바닐라 HTML/CSS/JavaScript로 구성됩니다.
참고: 테스트 PC에서 Playwright를 이용해 PC(1536px)/모바일(390px) 렌더링, 검색·상세·일정 조작 및 JS 오류를 검증했습니다. 테스트 도구는 운영 의존성에 포함하지 않습니다.

## 공식 민간자격 CSV 가져오기

공식 다운로드: https://www.data.go.kr/data/15075600/fileData.do

```powershell
python scripts/import_pqi.py "C:\path\official.csv" --date 2026-06-30
npm run check
npx wrangler deploy
```

수집기는 CP949·UTF-8 CSV를 해석합니다. **'현재상태'가 '등록완료'인 행만** 반영하며, 등록번호·발급기관·자격명 조합을 안정적인 SHA 기반 ID로 만듭니다. 등록 폐지·취소 자료는 공개 최신 검색에서 제외합니다. 열 정의가 바뀌거나 활성 레코드 수가 기대 범위를 벗어나면 수입을 중단합니다.

민간자격 검색 인덱스는 **11.3MB의 정적 JSON(전송 시 압축 가능)**이며 검색할 때에만 로드됩니다. 상세정보는 256개 분할 파일로 필요할 때만 요청합니다. 방문자당 D1 쿼리는 0건입니다.

## 프로그램 구조

```
public/
  index.html          전체 화면 반응형 UI
  style.css           플루이드 레이아웃과 모바일 스타일
  app.js              날짜·검색·상세·랭킹·공식 소식 동작
  data/
    seed.json         국가자격 2종 초기 정보(전체 CSV 사용 시 민간자격은 중복 제외)
    index.json        공식 민간자격 검색 색인
    details/000..255  자격 상세정보
    schedule.json     검증된 시험일정 이벤트만
    rankings.json     근거 확보 전에는 비어 있는 통계 데이터
    briefs.json       출처 있는 공식 소식
    manifest.json     수록량·원본 해시·기준일·상태 분포
src/worker.js         /api/health 전용 (요청 시에만 실행)
scripts/import_pqi.py 공식 원장 수입
scripts/check.mjs     데이터·코드 기본 검증
```

## 일정 데이터 신뢰성

`schedule.json`의 `events`는 `id,date,type,title,source,url,verifiedAt,status='verified'`가 필수입니다.
`type`은 `exam`(시험), `apply`(접수), `announce`(발표) 세 가지입니다. 공식 일정 변경 시 출처와 기준일을 갱신하세요. 확인되지 않은 데이터를 임의로 노출하지 않습니다.

## 서비스 비용 및 보안

Cloudflare Worker는 **`/api/*`만 실행**합니다. 페이지, 자격 상세, 검색 데이터, 일정·기사·통계 JSON은 모두 무료 Static Assets 경로에서 제공됩니다. 별도 데이터베이스와 반복 Cron이 없습니다. 비밀 키는 저장소에 올리지 않습니다.

Q-Net, NCS, KOSIS, 나이스, 뉴스 검색 등 향후 API 연계는 **제공기관의 서비스별 승인 및 실행 가능한 Secret이 설정된 후** 검증 수집기로 연결합니다. API 신청을 했다는 가정과 호출이 실제 성공했다는 사실은 다릅니다.

## 알려진 남은 작업

- 2026-06-30 이후 신규 등록·폐지 자료를 공식 최신 원장으로 갱신
- Q-Net 공식 종목별 날짜 수집 확대(접수·시험·발표, 회차·종목 구분)
- KOSIS/Q-Net 공식 응시·합격 통계 및 연도·분모 검증 후 랭킹 반영
- 기사 자동수집 시 출처/시간/중복/저작권 조건 확인
- GitHub → Cloudflare Builds 자동배포 연결(현재 Builds API 권한 403; 수동 배포 가능)
