# WONTECH 업무관리 V14.1.3 — GitHub Windows 빌드

이 프로젝트를 GitHub에 올리면 GitHub Actions가 Windows에서 설치파일을 직접 만듭니다.

## 처음 한 번만 하는 방법

1. GitHub에서 새 저장소를 만듭니다. 저장소 이름은 `wontech-work-manager-v14`를 권장합니다.
2. 이 ZIP의 압축을 푼 뒤, `WONTECH-V14-GitHub` 폴더 **안에 있는 파일과 폴더 전체**를 저장소에 업로드합니다.
3. GitHub 저장소 상단의 **Actions**를 누릅니다.
4. 왼쪽에서 **Build WONTECH V14 Windows**를 선택합니다.
5. **Run workflow → Run workflow**를 누릅니다.
6. 빌드가 끝나고 초록색 체크가 표시되면 실행 결과를 클릭합니다.
7. 화면 아래 **Artifacts**에서 원하는 파일을 받습니다.

## 어떤 파일을 받아야 하나요?

- Windows 10·11 64비트 PC: `WONTECH-V14-Windows`

Artifact를 받으면 ZIP으로 다운로드됩니다. 압축을 풀고 안에 있는 설치 EXE를 실행하세요.

## 프로그램 기능

- 메인 메뉴: 오늘 / +업무 / 체크 / 견적 / 발주 / 견적관리 / Google번역 / GPT번역 / 마크
- 밤 12시 자동 날짜 전환 및 미처리 업무 자동 이월
- 장기 체크리스트 전체 누적 개수를 메인 화면에 계속 표시
- 이름과 주소를 수정할 수 있는 자주 쓰는 링크 버튼 6개
- 제출 견적 / 입찰 유 / CXL / 담당자 / 첨부파일 관리
- 업무표 머리글 가로·세로 중앙 정렬
- 기존 V14 데이터 폴더를 그대로 사용
- Google번역/GPT번역 사이트 바로 연결(API 키 불필요)
