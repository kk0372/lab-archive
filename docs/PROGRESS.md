# RAINFROG_01 — 진행 기록 (PROGRESS)
> 새 대화를 시작할 때: **캐릭터 info + 이 파일 + 고칠 파일의 현재 전체 내용**을 같이 붙여넣기.
---
## ⚠️ 0. 가장 중요한 규칙: 대화 기록보다 실제 파일이 최신
아래 파일은 대화 기록에 **diff(일부 변경)만 남아 있음.** 고치기 전에 반드시 **현재 파일 전체를 먼저 붙여줄 것.**
그렇지 않고 "전체 교체" 코드를 받으면 3-B·3-C 작업이 덮어씌워짐.
- `src/lab/components/ImageField.jsx` (3-B 순서 버튼 + 3-C 자동 축소 포함)
- `src/lab/pages/editor.css` (3-B·3-C 스타일 포함)
- `src/lab/pages/AdminEditor.jsx` (3-C의 "처리 중이면 저장 막기" 포함)
일반 원칙: 앞으로도 **"전체 교체" 전에 그 파일의 현재 내용을 확인**하고 진행.
---
## 1. 기본 정보
| 항목 | 내용 |
|---|---|
| 스택 | Vite + React, **JavaScript(.jsx)**, VS Code에서 직접 수정 |
| 저장소 | GitHub private `lab-archive` |
| 배포 | Vercel (`lab-archive.vercel.app`), `git push` 하면 자동 재배포. `vercel.json`에 SPA rewrite 있음 |
| Supabase 연결 | `src/supabase.js` (URL·anon 키 직접 입력 방식). `src/lab/data/api.js`가 이 파일을 불러옴 |
| Storage | 버킷 `images`, **Public**, 파일당 50MB, MIME 제한 없음 |
| 라이브러리 | `gsap`(아직 미사용), `three`, `react-router-dom` |
| 옛 사이트 | `App.jsx`, `index.css`(Tailwind) 등은 더 이상 안 불러옴. PHASE 3에서 삭제 예정. **`src/supabase.js`는 지우지 않음** |
## 2. 작업 방식
1. 한 단계에 파일 1~3개(많으면 단계를 나눔).
2. 수정은 가능하면 **파일 전체**를 줌. 단, 0번 규칙 우선.
3. 단계마다 "✅ 확인할 것" 표 → 사용자 확인 후 다음 단계.
4. 위험한 작업은 뒤로. 컴포넌트는 `disposed` 패턴(아래 7번) 기본 적용.
## 3. 디자인 결정
| 항목 | 값 |
|---|---|
| 이름 | `RAINFROG_01` / 라벨 `RF-01` / `Observation Archive · 2 Subjects · 1 Anomaly` |
| 색 | ink `#1F4D3F`(예온) · evie-rgb `140,214,176` / evie `#CFE3D4`(이비) · paper `#EEF1EE` · platinum `#EDE6D6` · alert `#B4483C`(이상값에만) |
| 글꼴 | 타이틀 Archivo **폭 72% / 굵기 500**, 한글 Pretendard, 숫자·라벨 JetBrains Mono |
| 배경 입자 | `--noise-opacity: 0.07` |
| 커서 빛 | `--glow-alpha: 0.2` (사용자 조정값) |
| 목록 글씨 | 18~24px, 굵기 500 (메뉴 제목은 22~36px) |
| z-index | 메뉴 7950 · 메뉴바 7990 · HUD 8000 · 인트로 8500 · 페이지 전환 8600 · 빛 9000 · 커서 9500 |
| 인트로 | `PACE = 1.3`, `HOLD = 350`. 세션당 1회. 테스트 주소 `/?intro`, `/?intro=hold`, `=tilt`, `=frog` |
| 액체(LiquidFrame CONFIG) | blobSize 0.30 / shrink 0.03 / merge 0.38 / range 0.45,0.55 / rim 0.25 / edge 0.14 / spec 0.55 / refract 18 / zoom 0.94 / dropSize 0.085 |
## 4. 파일 지도
```
vercel.json                     SPA rewrite
src/main.jsx                    BrowserRouter → AppRoutes
src/supabase.js                 Supabase 연결 (기존 파일)
src/lab/
├─ AppRoutes.jsx                라우트 정의 (Placeholder 임시 페이지 포함)
├─ Layout.jsx / layout.css      공통 틀: HUD·커서·메뉴 유지, 페이지 전환 막, PAGES 목록, TLink, useGo
├─ LabPreview.jsx               메인(/): Intro + HeroTitle + ArchiveIntro + Index 목록
├─ styles/tokens.css            디자인 토큰
├─ styles/global.css            리셋·노이즈·공용 클래스(rf-label, rf-spec 등), scrollbar-gutter
├─ components/
│  ├─ Cursor.jsx / cursor.css   점·원 커서 + 이비의 빛
│  ├─ HudFrame.jsx / hud.css    프레임·눈금자·상태값·아래 흐림 띠, OBS 번호
│  ├─ HeroTitle.jsx / hero.css  히어로, 타이틀 폭 맞춤
│  ├─ LiquidFrame.jsx / liquid.css  WebGL 액체(굴절·이비 방울·커서 반응)
│  ├─ FocusText.jsx             스크롤 초점 텍스트 (폰은 blur 없음)
│  ├─ ArchiveIntro.jsx / archive.css  (THE ARCHIVE) 섹션
│  ├─ Intro.jsx / intro.css     인트로
│  ├─ Menu.jsx / menu.css       위쪽 바 + 전체화면 INDEX (글 개수 표시)
│  └─ ImageField.jsx            이미지 칸 (넣기·빼기·순서·대표·자동 축소)  ⚠️ 0번 규칙
├─ data/
│  ├─ api.js                    DB/Storage 공용 함수 (아래 6번)
│  ├─ auth.js                   useAuth, signIn, signOut, maskEmail
│  └─ resize.js                 이미지 축소 (긴 변 3000px, WebP 0.9)
└─ pages/
   ├─ Admin.jsx                 /admin 로그인 ↔ 콘솔
   ├─ AdminList.jsx             /admin/:section 목록·삭제
   ├─ AdminEditor.jsx           /admin/:section/new, /admin/:section/:id  ⚠️ 0번 규칙
   ├─ admin.css
   └─ editor.css                ⚠️ 0번 규칙
```
## 5. 주소
| 주소 | 상태 |
|---|---|
| `/` | ✅ 메인 |
| `/subject/01`, `/subject/02`, `/interaction` | 임시(Placeholder) |
| `/chronicles`, `/visual`, `/logs` | 임시(Placeholder) |
| `/admin`, `/admin/:section`, `/admin/:section/new`, `/admin/:section/:id` | ✅ 완성 |
| 그 외 | `NO RECORD` |
## 6. DB (Supabase) — git에 없음, `supabase/schema.sql` 참고
- `public.is_owner()` : 내 UID인지 확인 (UID는 이 함수 안에만 있음)
- `public.posts`
  - `id, section('visual'|'chronicles'|'logs'), title, body, images text[](맨 앞 = 대표, 저장소 경로 'visual/xxx.webp'), subjects text[]('yeon','evie'), artist, artist_url, drawn_on date, observed_at timestamptz, access('public'|'classified'), created_at, updated_at(트리거 자동)`
  - 정책: 읽기 = 공개글은 누구나 / classified는 owner만. 쓰기·수정·삭제 = owner만
- `storage.objects`(bucket `images`): 읽기 누구나, 올리기·교체·삭제 owner만
- `private.access_code` : 열람 코드 해시 (API 접근 불가)
- `public.post_stubs()` : 번호·구역·등급·날짜만 (목록·개수용)
- `public.unlock_classified(code)` : 코드 맞으면 classified 글 반환, 틀리면 0.8초 후 `ACCESS DENIED`
- 회원가입: **꺼짐**
- 열람 코드 바꾸기: `schema.sql` 맨 아래 "열람 코드" SQL 다시 실행
api.js 주요 함수: `fetchStubs, fetchPosts, fetchSection, fetchPost, unlockClassified, savedCode, useCounts, countLabel, notifyPostsChanged, deletePost, savePost, commitPost, uploadImage, removeImages, checkImageFile, imageUrl, coverPath, dayNumber, dayLabel, DAY_ONE, setFlash/readFlash, MAX_IMAGES(20), MAX_BYTES(50MB)`
## 7. 고친 함정 (다시 만들지 말 것)
| 문제 | 해결 |
|---|---|
| 개발 모드에서 WebGL 멈춤 (`uniform3f` 오류) | effect 안 `let disposed`, cleanup에서 `disposed = true`, 예약 콜백은 `if (disposed) return` |
| `texImage3D: FLIP_Y` 경고 | cleanup에서 `gl.pixelStorei(UNPACK_FLIP_Y/PREMULTIPLY_ALPHA, false)` 후 dispose |
| 폰에서 화면 전체 축소 | `.rf-hero { grid-template-columns: minmax(0,1fr); overflow-x: clip }`, `.rf-hero > * { min-width: 0 }`, 글꼴 `loadingdone` 때 다시 fit |
| 메뉴 열 때 화면 꿈틀 | `html { scrollbar-gutter: stable }` |
| 아이폰 사파리 분홍 줄 | FocusText `maxBlurMobile: 0` + blur 0이면 filter `none` |
| 폰에서 EDIT 안 보임 | `.rf-admin__pending { display:none }` 규칙 삭제 |
| `api.js` 연결 실패 | import 경로는 `../../supabase.js`, export 이름 자동 탐색 |
## 8. 제품 결정
- DAY 001 = **이비 귀국일**(= 공항 마중 = 보호 시작). `api.js`의 `DAY_ONE`은 **아직 null — 날짜 정해야 함.** 귀국 전 시각은 `PRE-OBS.`
- CLASSIFIED: (b) 비밀번호 열람. 목록에는 제목 숨김, `[CLASSIFIED] RF-01-C/0012` + 날짜만. 열람 코드 설정은 SQL로 완료(별도 UI 없음)
- 프로필(SUBJECT 01·02)·INTERACTION 타임라인: **코드 파일**에 작성
- 이미지: 축소 (b) 긴 변 3000px, WebP 0.9 (GIF는 원본, 커지면 원본). 글당 최대 20장. 순서는 버튼(`←` `→` 대표 지정). 업로드는 COMMIT 때만, 실패 시 롤백
- VISUAL DATA는 이미지 최소 1장 필수
- 옛 사이트: 삭제 예정
- 메뉴 6개 확정: SUBJECT 01 / SUBJECT 02 / INTERACTION / CHRONICLES / VISUAL DATA / RESEARCH LOGS
## 9. 알려진 한계
- 저장 안 한 상태에서 위쪽 INDEX 메뉴로 이동하면 경고 없음 (탭 닫기·새로고침·취소·←는 막음)
- CLASSIFIED 글의 이미지 파일은 정확한 주소를 알면 열림 (이름이 무작위라 추측 불가)
- Supabase 무료 플랜: 약 1주 미사용 시 일시정지 → 대시보드에서 Restore
## 10. 진행 상황
- ✅ 1단계: 메인 히어로 (STEP 0~7), 보안 정책, Vercel 배포
- ✅ PHASE 0: 0-A 주소 · 0-B 레이아웃·전환 · 0-C 메뉴 · 0-D DB
- ✅ PHASE 1: 1-A 로그인 · 1-B-1 목록·삭제 · 1-B-2 글쓰기·수정 · 1-B-3-A 업로드 · 1-B-3-B 순서 버튼 · 1-B-3-C 자동 축소
- ⏭ 1-B-3-D 끌어서 순서 바꾸기: **선택, 보류(건너뜀)**
- ⬜ PHASE 2 읽는 페이지: **2-1 VISUAL DATA** → 2-2 RESEARCH LOGS → 2-3 CHRONICLES → 2-4 SUBJECT 01 → 2-5 SUBJECT 02(렌즈 커서) → 2-6 INTERACTION → 2-7 이스터에그
- ⬜ PHASE 3 정리: 옛 파일 삭제 (`App.jsx`, Tailwind 등. `src/supabase.js`는 유지)