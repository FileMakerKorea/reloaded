# RELOADED 법적 쟁점 검토 — 한국 우선, 미국·국제 배포 고려

조사·확인일: **2026-09-26 (KST)**. 대상: 이 브랜치의 독립 구현 프로토타입 및 예정 배포 모델. 최종 침해 판단, 상표 등록 가능성 의견 또는 포괄적인 FTO(freedom to operate) 의견서가 아니다. **확인 사실 / 구현에 대한 추정 / 미검증 범위**를 구분한다. 운영 배포나 법률상 위험 인수 결정은 이번 작업에 포함하지 않았다.

## 1. 현재 결론과 우선 조치

직접조작, 수정·실행 모드, 페이지 이동, 스냅, 복제라는 기능 이름이 유사하다는 이유만으로 침해가 확정되지는 않는다. 반대로 독립적으로 코드를 만들었다는 사실만으로 타인의 유효한 특허 청구범위를 피하는 것도 아니다. 저작권·특허·상표·부정경쟁은 다른 판단 틀이다.

현재 RELOADED는 자체 React 화면·객체 모델·좌표 계산·부분 patch를 사용한다. FileMaker 실행 파일, 비공개 코드, 아이콘, 서체, 로고, 스크린샷, 테마 파일을 복제하지 않았다. 참고 시안은 사용자가 제공한 RELOADED 자체 시안이다. 독립 UI와 Git 설계 기록을 유지한다.

| 쟁점 | 현재 판단 | 권장 조치 | 출시 전 확인 |
|---|---|---|---|
| 선택 조건 전환 특허 | 중~높음, 청구항 검토 필요 | 단일 객체 hit-test와 실행 이벤트 통과를 명확히 분리 | US11977791B2와 관련국 청구항 차트 |
| 스냅·자동 배치 특허 | 중간, 구체 알고리즘에 의존 | 고정 그리드/직접 인접선 정렬 유지, 간격·시각속성 전파 자동화는 별도 검토 | Canon·Apple 및 제3자 family/continuation |
| 저작권·UI 구체 표현 | 현재 독립 구현으로 위험 축소, 보장 아님 | 코드 출처와 독자 디자인 기록, 타사 자산 배제 | 배포 이미지·매뉴얼·아이콘 최종 비교 |
| RELOADED 상표 | 미해결, 출시 차단 항목 | 개발명으로 유지, 독창적 결합표장 후보 준비 | 한국/미국 9·42류 등 실상품 지정 검색 |
| 라이선스 | npm 목록은 허용적 라이선스 확인 | 고지 파일 유지, Electron 포함 제3자 고지 별도 패키징 | 설치물·번들 기준 법적 고지 검사 |
| AI·개인정보 | 전송 최소화했으나 사용자 입력은 여전히 위험 | 전송 대상 표시, 계정별 인증, 실데이터 입력 금지 기본값 | 국외 이전 근거·위탁계약·보관/삭제 정책 |

위 위험 등급은 내부 우선순위이며 법적 확률 수치가 아니다.

## 2. 특허: 기능이 아니라 청구항과 실시 국가를 대조

한국 특허법 제97조는 보호범위를 청구범위에 적힌 사항에 따라 정하도록 한다. 명세서의 FileMaker 설명이나 제품 소개만 읽고 권리범위를 판단하지 않는다. [국가법령정보센터 제97조](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0097&lsiSeq=279827&urlMode=lsScJoRltInfoR).

미국 존속기간은 통상 관련 출원일 기준 20년이지만, 조정·연장·포기·유지료 등으로 달라질 수 있다. Google Patents의 상태 표시는 그 사이트도 법적 결론이 아니라고 명시한다. 실제 등록원부/심사기록·유지료 확인과 각국 권리는 별도다. [USPTO MPEP 2701](https://www.uspto.gov/web/offices/pac/mpep/s2701.html), [USPTO MPEP 2504](https://www.uspto.gov/web/offices/pac/mpep/s2504.html).

### 검색 기록과 실제 확인 문헌

사용한 검색어: `FileMaker layout mode patent`, `Filemaker Inc layout`, `Claris editing patent`, `object snapping dynamic guides`, `editing selection condition`. 검색 결과의 단순 제품명 언급과 출원인/권리자를 구별했다. 아래 청구항은 공개된 특허 원문에 근거하며 법적 상태는 Google 집계의 **잠정 표시**다.

| 문헌·국가 | 확인한 날짜·상태 | 확인한 핵심 구성 | RELOADED 대조 및 한계 |
|---|---|---|---|
| [US7000182B1](https://patents.google.com/patent/US7000182B1/en), 미국, database layout/report assistant | 출원 1999-08-20, 등록 2006-02-14. Expired–Lifetime 표시, 예상 만료 2019-08-20 | 청구항 1: DB 필드·summary field 관련 인터뷰로 조직 정보를 얻고, 레이아웃/보고서를 자동 생성하며 재생성 스크립트 생성 여부도 인터뷰에서 결정 | FileMaker 모드 일반을 독점하는 청구항이라고 볼 수 없다. 현재 직접 속성 patch는 이 보고서 마법사와 다르다는 기술적 추정. 원문에는 Apple 양도 기록과 Sun 표기가 함께 있어 소유권은 별도 원부 확인 필요 |
| [US7545392B2](https://patents.google.com/patent/US7545392B2/en), 미국, Apple Dynamic guides | 출원 2003-05-30, 등록 2009-06-09. Expired–Lifetime, 예상 만료 2023-05-30 | 청구항 1·3: 슬라이드/워드프로세싱 저작 앱에서 선택·비선택 객체의 정렬 가이드 겹침에 따라 가시성·색·질감 등의 표시를 갱신 | 현재 좌표선 표시는 겹침 판단에 따른 색/질감 강조와 다르지만 이것만으로 전체 권리 분석 종료 불가. 관련 패밀리와 후속 개량 특허 확인 필요 |
| [US11977791B2](https://patents.google.com/patent/US11977791B2/en), 미국, Casio | 우선일 2022-01-21, 미국 출원 2023-01-11, 등록 2024-05-07. Active 표시 | 등록 청구항 1: 객체 편집 화면과 사용자 선택 조작에 대해 서로 다른 제1·제2 선택 조건으로 객체 선택/비선택 상태를 정하는 기능. 청구항 2는 범위 전체/일부 포함을 구체화 | 현재 일반 클릭은 단일 stable ID 선택, 수정키 클릭은 업무 실행으로 통과. 이것이 두 선택 조건인지/단순 실행 모드인지 해석 쟁점. 독립항을 인쇄 분야로 임의 제한하지 말 것. **변리사 우선 검토** |
| [US11842042B2](https://patents.google.com/patent/US11842042B2/en), 미국, Canon | 우선일 2019-08-08, 미국 출원 2020-07-23, 등록 2023-12-12. Active 표시 | 청구항 1·8·12: 페이지 가장자리와 기배치 객체 사이 거리로 여러 스냅 지점을 정하고, 최소 객체 간격 적용과 크기·투명도·효과·회전 중 속성의 시각적 반영 등을 결합 | 현재 고정 8px 그리드와 인접 x/y/크기 후보만 사용. 페이지 양쪽 여백으로 스냅 지점 생성, 전역 최소 간격 및 시각효과 전파를 구현하지 않았다. 일부 구성 차이는 확인되나 비침해 결론은 별도 claim chart 필요 |

Casio 페이지의 country family 목록은 US/JP/CN/TW, Canon은 US/JP로 표시되었다. 이 목록에 KR이 보이지 않는다는 관찰은 한국 권리가 없다는 증거가 아니다. 각국 청구항은 미국과 다를 수 있고 미공개 출원, 분할·계속출원, 명칭 변화가 누락될 수 있다. 한국 등록·존속 상태, 균등론, 간접침해, 미국 서버/다운로드 제공의 실시 장소 판단은 미검증이다.

### 공식 검색 채널 접근 범위

- [KIPRIS](https://www.kipris.or.kr/khome/main.do): 공식 검색 포털 접근 확인. 이번 환경에서 한국 출원인별 전수검색 결과 및 등록원부를 확정하지 못했다. `파일메이커/클라리스/애플/캐논/카시오`, 영문 변형과 G06F3/048 계열을 조합한 청구항 검색이 필요하다.
- [USPTO Patent Public Search](https://www.uspto.gov/patents/search/patent-public-search): 공식 검색 경로 확인. 위 번호 원문은 Google에서 확인했으며 Patent Center의 유지료·심사경과 전부를 독립 대조하지 못했다.
- [WIPO PATENTSCOPE](https://patentscope.wipo.int/search/en/search.jsf): 조회 시 도구에서 접근 오류. PCT 전수검색 완료로 취급하지 않았다.
- Google Patents: 위 4건 청구항/날짜/국가·상태와 관련 family 목록 확인. Google이 제공하는 원문은 확인 자료이나 상태/소유권 집계는 법률기관의 확정 판단이 아니다.

**검색 결과 없음 = 비침해가 아니다.** FileMaker 보유 권리만 검색해서도 안 된다. 버튼 복제·화면 전환·DOM 편집·AI 모델 patch에 관한 제3자 특허, 디자인권·미국 design patent 조사까지 출시 범위에 맞춰 확장해야 한다.

## 3. 저작권, 독립 구현과 UI 표현

한국 저작권법 제101조의2는 프로그램 언어·규약·해법에 대한 적용 제외를 정한다. 제101조의3·4의 조사/역분석 관련 예외는 조건이 있으며 비공개 코드 복제 허가로 확대할 수 없다. [법령 원문](https://law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1017054983).

미국 Copyright Office는 프로그램의 저작권 있는 표현과 아이디어·로직·알고리즘·시스템·방법 등을 구별한다. 구체적인 그래픽·문구·코드 표현에 대한 권리는 별도로 검토해야 한다. [Computer Programs](https://www.copyright.gov/register/tx-programs.html), [What is Copyright](https://www.copyright.gov/what-is-copyright/).

권장 설계: 행동 요구사항에서 출발해 직접 작성한 소스와 디자인 이력을 남긴다. 메뉴 전환이라는 기능은 유지하되 타사 고유 툴바 배열, 아이콘 묶음, 배색·문구·스플래시·도움말을 그대로 옮기지 않는다. 예제 화면은 자체 고객관리 워크플로와 타이포그래피를 사용한다. 외부 플러그인·테마·샘플을 가져올 때는 각각의 라이선스와 적법한 접근 근거를 확인한다. AI 생성물도 출처·유사 코드·라이선스 검사를 생략하지 않는다.

## 4. 상표 RELOADED와 FileMaker의 언급

**RELOADED의 사용·등록 가능성은 미확정**이다. 일반 영어 단어라는 이유로 자유 사용이 보장되지는 않는다. 동일·유사 표장, 발음(`리로디드`, `리로드` 등 실제 사용 변형), 지정상품, 유통경로·수요자와 국가를 함께 봐야 한다. 한국·미국 9류 소프트웨어, 42류 SaaS/개발 도구 서비스를 우선 검토하되 실제 사업 범위가 기준이다.

[USPTO 공식 TTABVUE 검색 결과](https://ttabvue.uspto.gov/ttabvue/v?corr=BRETT+A.+MANCHEL)에 RELOADED 표장 출원번호 90784094와 90838963 관련 절차가 나타났다. 이는 같은 단어가 다른 권리 문맥에서 사용된다는 확인 자료다. 현재 등록·지정상품·사업 관련 충돌을 확정한 것은 아니다. TSDR 현재 상태와 실제 사용 조사를 추가해야 한다. 한국 선행표장 전수검색은 미완료다. [USPTO 상표 검색](https://www.uspto.gov/trademarks/search), [WIPO Global Brand Database](https://www.wipo.int/en/web/global-brand-database), [KIPRIS](https://www.kipris.or.kr/khome/main.do).

FileMaker는 제품 철학의 역사적 참조를 설명하는 데 필요한 정도로만 문장 안에 쓴다. 프로젝트명·로고·아이콘·도메인·앱 아이콘에 결합하지 않고 Claris의 후원·인증·공식 호환성을 암시하지 않는다. Claris 공식 가이드는 상표 표기·출처 표시 및 로고 사용 제한을 설명한다. [Claris Trademark Guidelines](https://www.claris.com/company/legal/trademark-guidelines.html).

외부 문서 권장 표기: “Claris 및 FileMaker는 Claris International Inc.의 상표입니다. RELOADED는 Claris와 제휴하거나 승인을 받은 제품이 아닙니다.” 이 문구만으로 침해나 혼동이 자동 해소되는 것은 아니다. 실제 광고·제품 비교 주장의 정확성도 검증해야 한다.

## 5. 트레이드드레스·부정경쟁·영업비밀

한국 부정경쟁방지법은 상품·영업표지 혼동, 상품 형태 모방, 상당한 투자·노력의 성과 무단 이용 등 서로 다른 유형을 두고 있다. 소프트웨어 화면에 어느 유형이 적용되는지는 구체 사실과 판례 검토가 필요하다. 이 보고서는 화면 유사성을 곧바로 해당 위반으로 분류하지 않는다. [현행 법령 진입점](https://www.law.go.kr/법령/부정경쟁방지및영업비밀보호에관한법률), [접근 가능한 본문](https://www.law.go.kr/lsInfoP.do?efYd=20230929&lsiSeq=249239). 전자는 본문 파싱이 되지 않았고 후자는 2023 시행본이므로 **최신 조문 세부·항목 기호 대조는 미검증**이다.

미국에서는 트레이드드레스의 비기능성·식별력, 출처 혼동을 검토한다. 기능성 판단과 전체 시각적 조합의 판단은 다르다. 제품 디자인은 그 자체로 본래적 식별력이 인정되지 않는다는 등록 지침도 주의해야 한다. [USPTO TMEP 현행 1202.02](https://tmep.uspto.gov/RDMS/TMEP/print?href=TMEP-1200d1e835.html&version=current).

따라서 UI 전체 인상도 독자적으로 구성하고, 타사 내부 설계 문서·스크린샷·계약상 비밀자료를 모델 프롬프트나 저장소에 넣지 않는다. 독립 구현 기록은 저작권/영업비밀 관련 설명 자료가 되지만 특허 면책은 아니다.

## 6. 실제 의존성 라이선스와 배포 고지

`package-lock.json`과 설치된 package의 LICENSE/NOTICE를 조사했다. `npm run licenses`로 [기계 판독 목록](evidence/licenses.json) 및 [원문 고지 묶음](../THIRD_PARTY_NOTICES.md)을 다시 생성한다. 이번 설치 152개 패키지(개발 의존성 포함)의 package license 필드는 MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0이며 UNKNOWN은 없었다. 이 목록은 Electron 바이너리에 포함된 모든 Chromium 제3자 모듈의 독립 법률 검토를 대체하지 않는다.

| 구성 | 확인 근거 | 실무 조건 |
|---|---|---|
| Electron 41.10.7 | 설치물 LICENSE 및 [공식 LICENSE](https://github.com/electron/electron/blob/main/LICENSE) | Electron 자체 MIT. 저작권·허가·면책 고지 유지. 바이너리 부속 LICENSES.chromium.html도 포함 |
| Chromium 및 포함 제3자 | Electron 배포물 `LICENSES.chromium.html`, [Chromium LICENSE](https://raw.githubusercontent.com/chromium/chromium/main/LICENSE) | Chromium 대표 BSD 조건만으로 전체를 단정 금지. 제3자별 조건, 재배포 구성에 따른 추가 의무 확인 |
| React/react-dom | lockfile의 실제 버전과 설치 LICENSE, [공식 React LICENSE](https://github.com/react/react/blob/main/LICENSE) | MIT 고지 보존. 별도 RELOADED 전체 소스 공개를 MIT 자체가 강제하지 않음 |
| PostgreSQL 16.14 | 실제 실행 버전, [PostgreSQL License](https://www.postgresql.org/about/licence/) | 허용적 PostgreSQL 라이선스. 소프트웨어·문서의 관련 고지 보존. DB 데이터 권리·개인정보와 별개 |
| TypeScript/MCP SDK/Express/pg/Vite/Zod 및 전이 의존성 | evidence/licenses.json, 설치 LICENSE/NOTICE | 각 MIT/BSD/ISC/Apache 조건 보존. Apache는 LICENSE·해당 NOTICE·수정 고지와 특허 조항 검토 |

웹 runtime 배포물과 개발용 Electron 앱의 포함 범위가 다르므로 두 배포 단위를 별도로 점검한다. 현재 Electron 설치물에서 Chromium 고지 파일 존재를 확인했으며, 서명·공증된 설치 패키지는 만들지 않았다. 추후 LGPL/MPL/GPL 등 구성요소가 추가/활성화되면 소스 제공·재링크·수정 파일 공개 조건이 적용되는지 실제 링크·배포 형태별로 검토한다. “Electron은 MIT이므로 모든 포함 소프트웨어도 MIT”라고 안내하지 않는다.

RELOADED 자체의 오픈소스 라이선스/CLA/DCO는 아직 결정하지 않았다. 합리적인 구독·기여 생태계라는 방향이 오픈소스 라이선스 결정이나 제3자 의무 면제를 뜻하지 않는다. 공개 저장소 업로드와 특정 오픈소스 라이선스 부여도 동일하지 않다.

## 7. AI/Codex 약관·인증·데이터 전송

확인한 최신 문서: [OpenAI Services Agreement](https://openai.com/policies/services-agreement/)는 2026-01-01 효력 및 사업/API 적용 범위를, [개인용 Terms of Use](https://openai.com/policies/row-terms-of-use/)는 개인 계정 조건을 설명한다. [Service Terms](https://openai.com/policies/service-terms/)는 **2026-09-21 업데이트**로 확인했다. 계정 종류·지역·주문서에 따라 적용 문서가 달라지므로 개인 ChatGPT 인증을 SaaS 고객 전체에 재판매하는 권한으로 해석하지 않는다.

사업 약관은 입력 권한 확보, 출력의 적절성 평가, 자격증명 공유/재판매 제한 등을 정한다. 입력·출력 권리 조항이 제3자 저작권·특허·상표를 없애거나 출력의 고유성을 보증하지 않는다. 서비스별 배상 조항의 요건·예외도 확인해야 한다. 개인 계정과 사업/API의 학습·사용 설정을 같은 것으로 표시하지 않는다.

[Codex MCP](https://developers.openai.com/codex/mcp)와 [App Server](https://developers.openai.com/codex/app-server)는 역할이 다르다. 이 구현의 MCP는 로컬 모델 읽기/부분 수정 도구다. AI 추론·대화·인증은 App Server를 호출한다. 실제 시험에서 기존 로컬 Codex의 인증 상태와 짧은 합성 요청 완료를 확인했다. 이는 다른 고객 계정의 권한이나 상업 제공 허가의 확인이 아니다.

UI는 사용자가 쓴 문장과 선택 객체 ID·종류·이름이 전송됨을 표시한다. DB 비밀번호와 고객 레코드를 자동으로 프롬프트에 넣지 않는다. 그러나 사용자가 입력한 문장/객체 이름 자체가 개인정보·비밀일 수 있고 로컬 Codex 설정의 플러그인·로그·정책도 별도 경계다. 상용 제품에서는 조직 정책에 맞춘 독립 세션/허용 도구·전송 미리보기/보관 제어·감사 기록이 필요하다. 현재 패널은 제안만 반환하며 “실제 파일 변경 완료”로 표시하지 않는다.

## 8. 한국 개인정보·DB 운영·키 관리

고객명과 전화번호가 실제 개인과 연결되면 개인정보 처리에 해당할 수 있다. 수집 목적·법적 근거, 최소수집, 접근권한, 보유기간·파기, 정보주체 권리, 안전조치가 필요하다. PostgreSQL 또는 로컬 실행이라는 기술 선택이 법 준수를 자동 보장하지 않는다.

국외 제공에는 조회·처리위탁·보관도 포함될 수 있다. 개인정보 보호법 제28조의8의 허용 근거 중 해당하는 것을 검토하고, 별도 동의 또는 법이 허용하는 계약 이행 관련 고지 등 요건을 충족해야 한다. 모든 국외 이전에 언제나 동일한 동의만 필요하다고 단정하지 않는다. 확인한 법령 페이지는 **2026-09-11 시행, 법률 제21445호**를 표시한다. [제28조의8 원문](https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029331979). 위탁/재위탁, 수령자·국가·항목·목적·기간 및 이전 거부 관련 고지 세부는 실제 공급계약과 함께 검토해야 한다.

현재 개발 DB는 별도 포트/디렉터리·임의 비밀번호·SCRAM 인증, loopback 접속만 사용한다. 비밀번호는 `.local/db-config.json`(0600), DB 원본은 `.local/postgres`에 있고 Git·웹 번들·오류 출력에서 제외한다. 브라우저에 직접 입력한 연결 비밀번호는 서버 연결용으로만 보내고 메모리 사용 후 UI에서 비운다. 일반 사용자 OS 계정이 침해되었을 때까지 보호하는 암호화 vault는 아니다.

운영 권장: 최소권한 DB 계정과 역할 분리, TLS/인증, 비밀 관리자 또는 OS keychain, 키 회전/폐기, 접근 로그, 백업 암호화·복구 시험. metadata 이름·용도와 DB COMMENT도 민감정보가 될 수 있어 실제 고객정보를 넣지 않는다. Git 암호화 스냅샷을 쓰더라도 키와 복호화 원문은 분리하고 운영 COMMENT 접근권한을 별도로 통제한다. 이번 프로토타입에는 조직용 비밀 관리자와 암호화 metadata, 테넌트별 권한, 개인정보 삭제 워크플로가 구현되지 않았다.

## 9. 전문가 확인 목록·출시 판단 자료

1. 변리사: 위 4개 특허의 독립항 및 종속항별 구현 대조표, 국내 대응 출원·분할/계속출원, 존속·유지료·권리자, 균등론 및 실시 국가. Casio의 선택 조건과 modifier 실행을 최우선으로 검토.
2. 변리사: 한국/미국 RELOADED·한글 발음·유사 표장, 9/42류 지정상품과 실제 선사용, 미국 TSDR 현재 상태. 필요시 이름 변경 후보 및 출원 전략.
3. 법률 담당: 독립 UI·문서·자산 출처와 FileMaker 비교 표시, 부정경쟁 최신 조문·관련 판례, 비제휴 표기.
4. 배포 담당: 정확한 lockfile/SBOM, Electron 바이너리 제3자 고지와 소스 제공 조건, 서명 설치물 및 웹 runtime에 포함된 실제 구성. 자체 라이선스와 기여 정책 결정.
5. 개인정보·계약 담당: 실제 고객정보 흐름도, 적용 OpenAI 계정·계약, 수탁자/국외 이전·보관 기간, 조직별 키와 권한, 고객 DPA 및 SaaS 약관.

이 검토는 안전한 개발 방향을 정하고 미해결 권리를 드러내는 자료다. **상용 출시 가능 판정은 보류**하며, 개발 프로토타입 완료와 법적 출시 승인 여부를 분리한다.
