# HealingMart EXAM (대한민국 시험·자격정보)

국가기술자격과 등록 민간자격을 등록번호·발급기관 중심으로 검색하는 독립 Cloudflare Static Assets 서비스입니다.

## 현재 기능 (v0.1.0)

- 시험/자격증 검색, 국가자격·등록 민간자격·공인 민간자격 필터
- 자격증별 등록번호·발급기관·직무·유의사항 및 공식 원문 이동
- 월간 시험 캘린더 (공식 날짜 검증된 일정만 표시; 현재 초기 빈 데이터)
- 6건의 **공식 페이지 확인** 초기 예시 데이터: PQI 민간자격 4, Q-Net 국가기술 2
- D1, KV, 별도 API 키 없이 Cloudflare Static Assets에 정적 JSON 제공
- 모바일 반응형 화면
- 대규모 PQI CSV 변환기 (전체 원장 아직 미가져옴)

**주의:** 공식 웹사이트에 등록된 민간자격은 국가공인 자격과 다릅니다. 등록만으로 취업·자격효력을 보장하지 않습니다. 현재 배포된 6건은 전체 6만여 개 데이터가 아닙니다.

## 프로젝트 분리

기존 `healingmart-life-calendar-cloudflare` 및 `healingmart-government-policy-cloudflare`와 별도 배포합니다. 데이터베이스, Workers, KV, 기존 서비스 설정을 건드리지 않습니다.

## 실행

Node.js 22+:

```bash
npm install
npm run dev
```

실제 배포:

```bash
npm run check
npx wrangler deploy
```

## 전체 민간자격 원장 수입

공식 공개자료: [한국직업능력연구원 민간자격등록정보](https://www.data.go.kr/data/15075600/fileData.do)

공식 CSV를 다운로드한 다음:

```bash
python scripts/import_pqi.py "C:\path\to\pqi.csv" --date 2026-06-30
npm run check
npm run deploy
```

- CSV는 UTF-8 BOM/CP949/EUC-KR 지원; 컬럼 자동 감지
- 종목명, 등록번호, 발급기관이 없으면 해당 행 제외
- 고유 ID: 등록번호+기관명+종목명 SHA-256 일부; 동일 이름의 다른 기관 보존
- 대규모 검색용 얇은 `public/data/index.json`, 상세 256개 shard JSON
- 100건 미만 입력·Cloudflare 파일 크기 초과 시 배포 데이터 덮어쓰기 방지
- 공식 원장에 없는 일정, 수수료 및 자격 효력은 생성하지 않음
- 반영된 민간자격 전체 건수는 실제 CSV 검수 후 결정 (공식 웹 통계와 다를 수 있음)

## 시험 일정 데이터 계약

`public/data/schedule.json`: `events` 배열의 각 일정은 `date` (`YYYY-MM-DD`), `title`, `source`, `url`, `verifiedAt` 필드가 필수입니다. 주관기관 공식 페이지·공고에 확인된 날짜만 게시합니다. 일반 회차와 종목별 접수 날짜를 혼동하지 않습니다.

## API 키

현재 **배포에 필요한 API 키는 없음**. 다음 단계 국가자격 정확 일정 자동 수집에 Q-Net 공공데이터 API가 필요하면 `HRDK_SCHEDULE_SERVICE_API_KEY`을 Cloudflare Secret으로 등록합니다. 공공데이터포털 공통 키는 각 endpoint 승인 상태가 확인된 경우에만 필요합니다. 비밀 키는 GitHub 커밋에 넣지 마세요.

## 검증

```bash
npm run check
```

정적 파일 존재, 데이터 형식, 고유 ID, 공식 URL 보안, 캘린더 필수 날짜 검증을 확인합니다.

## 로드맵

1. 공식 PQI CSV 전체 다운로드 → 정규화·중복·폐지 구분 검증 → 공개 원장
2. Q-Net 국가기술·전문자격 종목별 시험일정 공식 검증 및 정적 월간 데이터 생성
3. 수능·공무원·검정고시·교원임용·어학 시험을 각 공식기관별 수집기로 확장
4. 시험 운영정보(응시료, 응시자격, 난이도, 장단점)를 출처가 있는 항목부터 확장

Copyright © HealingMart. Official-source references linked per record.
