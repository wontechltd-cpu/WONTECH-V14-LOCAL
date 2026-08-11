WONTECH 업무메모 + 견적작성 + 발주관리 + 견적관리 통합 V14.1.2 - Windows Local

[구성]
- 메인 업무메모: 오전 3시 날짜 전환, 미처리 이월, 미처리/완료/체크, 체크 색상 구분
- 체크리스트: 별도 독립 창, 날짜와 무관한 장기 보관, 미처리/완료
- 견적관리: 별도 독립 창, 견적 이력 + 작성/열기
- 발주관리: 별도 독립 창, 발주 이력 + 작성/열기
- 견적관리: 제출 견적/입찰/CXL/담당자/첨부파일 통합관리 별도 창
- 견적/발주 작성: 사용자가 제공한 WontechQuote.html 양식을 그대로 기반으로 통합
- 번역 연결: 메인 화면의 Google번역/GPT번역 버튼으로 각 번역 사이트 연결
- 마크 교체: 메인에서 이미지 선택 시 메모/체크/견적/발주 창에 공통 적용
- 메인 JPG/PDF/인쇄: Electron 로컬 기능으로 처리
- 데이터: Windows 사용자 AppData에 wontech-v14-data.json으로 저장
- 기존 V14.0.0과 동일한 데이터 폴더를 사용하므로 기존 업무메모/견적/발주 자료 유지
- 메인 메뉴: 오늘 / +업무 / 체크 / 견적 / 발주 / 견적관리 / Google번역 / GPT번역 / 마크

[실제 Windows EXE 만들기]
방법 1) BUILD_WINDOWS.bat
1. Node.js LTS 설치
2. 이 폴더에서 BUILD_WINDOWS.bat 실행 (최초 빌드 시 인터넷 필요)
3. release 폴더 안의 WONTECH_업무관리_V14_14.1.2_x64.exe 사용
4. 일반 업무메모·견적·발주 기능은 인터넷 없이 사용할 수 있습니다. Google번역/GPT번역 사이트 연결만 인터넷이 필요합니다.

방법 2) GitHub Actions
이 폴더 전체를 GitHub 저장소 main 브랜치에 올리면 .github/workflows/build-windows.yml이 Windows용 EXE를 빌드합니다. Actions의 Artifacts에서 WONTECH-V14-Windows를 받으면 됩니다.

[테스트]
RUN_TEST.bat를 실행하면 개발용 Electron 창으로 먼저 확인할 수 있습니다. 최초 1회 npm install 때문에 인터넷이 필요합니다.

[번역 연결 사용]
- 메인 화면의 'Google번역'을 누르면 영문→한글로 설정된 Google 번역 사이트가 열립니다.
- 메인 화면의 'GPT번역'을 누르면 ChatGPT 사이트가 열립니다.
- 별도의 프로그램 번역창과 API 키 설정은 사용하지 않습니다.

[중요]
- 견적/발주 양식의 기존 화면과 계산, JPG, PDF, 프린트 로직은 첨부 받은 WontechQuote 소스를 유지했습니다.
- 상단에 'V14 관리 저장' 버튼만 추가했습니다. 이 버튼으로 견적관리/발주관리 이력에 저장합니다.
- 체크리스트/견적관리/발주관리는 메인 화면 전환이 아니라 별도 Windows 창으로 열립니다.
