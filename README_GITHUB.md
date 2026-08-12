# WONTECH 업무관리 V14.1.9 — GitHub Windows 빌드

이 프로젝트를 GitHub에 올리면 GitHub Actions가 Windows에서 설치파일을 직접 만듭니다.

## 처음 한 번만 하는 방법

1. GitHub에서 새 저장소를 만듭니다. 저장소 이름은 `wontech-work-manager-v14`를 권장합니다.
2. 이 ZIP의 압축을 푼 뒤, 폴더 안의 **파일과 폴더 전체**를 저장소에 업로드합니다. 이때 이름이 점으로 시작하는 **`.github` 폴더도 반드시 포함**해야 합니다.
3. GitHub 저장소 상단의 **Actions**를 누릅니다.
4. 왼쪽에서 **Build WONTECH V14 Windows**를 선택합니다.
5. **Run workflow → Run workflow**를 누릅니다.
6. 빌드가 끝나고 초록색 체크가 표시되면 실행 결과를 클릭합니다.
7. 화면 아래 **Artifacts**에서 원하는 파일을 받습니다.

## 업로드 직후 꼭 확인하세요

- 저장소의 `package.json`을 열었을 때 버전이 `14.1.9`이고 `"dist": "electron-builder --win nsis --x64 --publish never"`가 보여야 합니다.
- 저장소의 `.github/workflows/build-windows.yml`을 열었을 때 `node-version: '24'`가 보여야 합니다.
- 위 두 항목 중 하나라도 다르면 일부 파일만 업로드된 것이므로, ZIP 안의 파일과 폴더 전체를 다시 업로드하세요.

## 어떤 파일을 받아야 하나요?

- Windows 10·11 64비트 PC: `WONTECH-V14-Windows`

Artifact를 받으면 ZIP으로 다운로드됩니다. 압축을 풀고 안에 있는 설치 EXE를 실행하세요.

## 프로그램 기능

- 메인 메뉴: 오늘 / +업무 / 체크 / 견적 / 발주 / 견적관리 / Google번역 / GPT번역 / 마크
- 밤 12시 자동 날짜 전환 및 미처리 업무 자동 이월
- 장기 체크리스트 전체 누적 개수를 메인 화면에 계속 표시
- 이름·주소·브라우저를 링크별로 설정할 수 있는 자주 쓰는 링크 버튼 10개
- 제출 견적 / 입찰 유 / CXL / 담당자 / 첨부파일 관리
- 업무표 머리글 가로·세로 중앙 정렬
- 기존 V14 데이터 폴더를 그대로 사용
- Google번역/GPT번역 사이트 바로 연결(API 키 불필요)
- 별도 폴더설정 창에서 폴더 버튼 이름·연결 경로 10개 관리
- 견적관리의 영문견적작성 버튼, 한·영 병기 견적서, KRW/USD 금액단위 선택
