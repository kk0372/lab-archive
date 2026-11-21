/* ==========================================================
   RF-01 / SUBJECT 프로필 (코드 파일)
   ----------------------------------------------------------
   줄 형식
     { k: '라벨', v: '값' }        라벨 + 값
     { v: '문장' }                 라벨 없는 한 줄
     [[n]]                         v 안에 넣으면 글자 n개 길이의 검은 줄 (완전히 가림)
     { lock: '키', len: n }        열람 코드로 열리는 줄 (길이 n 글자)
                                   원문은 DB private.redactions에만 있음 → supabase/redactions.sql
     faint: true                   아주 흐리고 작게 (균열)
     ~~지운 말~~                   v 안에 넣으면 취소선 (예온이가 쓰고 지운 단어). 바로 뒤에 정정한 말을 쓰기
     lens: '문장'                  렌즈로만 보이는 문장 (줄 끝에 옅은 ◌ 표시)

   ⚠️ 이 파일은 방문자 브라우저로 그대로 전송됨.
      완전히 가린 줄과 열리는 줄의 원문은 여기에 절대 쓰지 말 것.
   ========================================================== */

export const SUBJECTS = {
  yeon: {
    id: 'yeon',
    no: '01',
    code: 'S-01',
    path: '/subject/01',
    name: '서예온',
    hanja: '徐睿溫',
    latin: 'Seo Ye-on',
    kind: 'Self-record',
    recorder: 'S-01',
    observed: 'S-01',

    sections: [
      {
        no: '01',
        title: 'Identification',
        lines: [
          { k: '성명', v: '서예온 (徐睿溫)' },
          { k: '피험자 번호', v: 'S-01' },
          { k: '성별 / 연령', v: '남 / 24' },
          { k: '생년월일', v: '2000.01.17' },
          { k: '학위', v: '생명공학 박사 (조기 취득)' },
          { k: '소속', v: '[[7]] 부설 신약개발연구소 — 생물정보학 연구 총괄' },
          { k: '거주', v: '고층 주거 시설, 지상 약 1[[2]]m. 외부 창 전면 고정.' },
        ],
      },
      {
        no: '02',
        title: 'Physical',
        lines: [
          { v: '신장 184cm. 체지방률 낮음. 근육량 표준 이상.' },
          { v: '모발 흑색. 홍채 녹색.' },
          { k: '시력 교정', v: '박막 티타늄 안경. 화면 열람 시에만 착용.' },
          { k: '복장', v: '백색 셔츠, 슬랙스. 변동 없음.' },
          { k: '특이 표지', v: '[[14]]' },
        ],
      },
      {
        no: '03',
        title: 'Environment',
        lines: [
          { k: '선호', v: '실내 온도 23.0°C 항온 / 고정된 일과 / 청결, 소독제 냄새 / 관찰.' },
          { k: '기피', v: '감정의 과잉 표출 / 예측되지 않은 자극 / 외부 간섭.' },
          { k: '비고', v: '위 항목은 개인적 취향이 아니라 최적 작동 조건이다.' },
        ],
      },
      {
        no: '04',
        title: 'Early environment',
        lines: [
          { k: '성장 환경', v: '[[20]]' },
          { lock: 's01-04-guardian', len: 11 },
          { k: '기간', v: '[[4]]' },
          { v: '[[26]]' },
          { lock: 's01-04-rescue', len: 15 },
          { v: '[[16]]' },
          { lock: 's01-04-conclusion', len: 60 },
          { k: '분류', v: '초기 환경 데이터. 현재 작동에 영향 없음.' },
        ],
      },
      {
        no: '05',
        title: 'Current protocol',
        lines: [
          { k: '대상', v: 'S-02 (백이비 / Evie Sinclair)' },
          { k: '최초 접촉', v: '중학교 재학 중, 강우 시. 사유: 감기는 불필요한 마찰을 만든다.' },
          { k: '분리', v: '중학교 졸업 직후, 보호자의 결정으로 국외 이주. 개체 02의 의사 확인: 불가.' },
          { k: '추적', v: '이주 국가와 교육기관 특정 완료. 이후 지속 모니터링. 혼혈 개체로 식별 용이.' },
          { lock: 's01-05-source', len: 47 },
          { k: '재접촉', v: '2024.10.23 (DAY 001). 장소: 입국장.' },
          { k: '조치', v: '보호 환경으로 이송. 외부 변수 차단.' },
          { k: '법적 분류', v: '[[6]]' },
          { k: '판단', v: '이 조치는 구속이 아니라 초기화다.' },
        ],
      },
      {
        no: '06',
        title: 'Self-assessment',
        lines: [
          { k: '정서 상태', v: '안정.' },
          { k: '판단 능력', v: '이상 소견 없음.' },
          { k: '개체 02에 대한 애착', v: '해당 없음. 보호 의무에 따른 관리 행위임.' },
          {
            k: '최근 관측된 미세 이상',
            v: '흉곽 내 압박감. 개체 02의 예측 외 행동 시 반응 지연(0.5초 내외). 분류: 측정 오차.',
          },
          { k: '접근을 3,176일간 보류한 사유', v: '최적 시점 대기.' },
          { k: '개체 02가 자발적으로 이탈했을 가능성', v: '검토하지 않음.', faint: true },
        ],
      },
    ],

    signature: ['서명: S-01.', '기록자와 피험자 동일. 편향 가능성: 없음.'],
  },

  evie: {
    id: 'evie',
    no: '02',
    code: 'S-02',
    path: '/subject/02',
    name: '백이비',
    hanja: null,
    latin: 'Evie Sinclair',
    kind: 'Observation record',
    recorder: 'S-01',
    observed: 'S-02',

    sections: [
      {
        no: '01',
        title: 'Identification',
        lines: [
          { k: '성명', v: '백이비 / Evie Sinclair' },
          { k: '피험자 번호', v: 'S-02' },
          { k: '성별 / 연령', v: '여 / 24' },
          { k: '생년월일', v: '2000.04.29' },
          { k: '국적', v: '대한민국 · 영국 (이중)' },
          { v: '신장 154cm. 체구 작음.' },
          { v: '모발 백금발, 단발. 홍채 연녹색.' },
          { k: '체취', v: '~~좋음~~ 특이 사항 없음.', lens: '비누 냄새. 소독제보다 낫다.' },
        ],
      },
      {
        no: '02',
        title: 'Behavioral baseline',
        lines: [
          { k: '보행', v: '보폭이 짧아 이동 빈도가 높음. 실내를 자주 순회함. 발소리 거의 없음.' },
          { k: '표정 변화', v: '거의 없음.', lens: '그래도 구분할 수 있다.' },
          { k: '발화', v: '짧고 직설적. 수식어 없음.' },
          {
            k: '호칭',
            v: "관찰자를 '너'로 지칭. 간헐적으로 '예온'.",
            lens: '이름을 부를 때마다 반응 지연이 발생한다.',
          },
          { k: '고립 인식', v: '혼자인 상태를 기본값으로 인식. 외로움 자각 없음 (본인 진술).' },
          {
            k: '관찰자 부재 시',
            v: '활동량 급감. 복귀 시 접근 빈도 증가. 해석: ~~애착~~ 환경 적응 반응.',
            lens: '돌아오면 현관까지 나와 있다.',
          },
        ],
      },
      {
        no: '03',
        title: 'Response to observer',
        lines: [
          { k: '타인에 대한 태도', v: '순응. 결과에 무관심.' },
          {
            k: '관찰자에 대한 태도',
            v: '~~순응~~ 신뢰 (추정).',
            lens: '순응이었다면 측정이 쉬웠을 것이다.',
          },
          { k: '물리적 거리', v: '근접 빈번. 접촉 거부 0회.' },
          {
            k: '배려 행동 감지',
            v: '민감도 높음. 추정 원인: 수혜 경험 부족.',
            lens: '내가 하는 것은 전부 들킨다.',
          },
          { k: '진술 기록', v: '"…이유가 있어서지." / "…너도." (담요 제공 시)' },
        ],
      },
      {
        no: '04',
        title: 'Specimens received',
        lines: [
          { k: '개구리', v: '중학교 재학 중 반복 제공. 생체 상태 양호. 관찰 후 방생.' },
          { k: '네잎클로버', v: '1회 제공.' },
          { k: '처리', v: '~~폐기~~ 보관 중.', lens: '버릴 수 없었다.' },
          { k: '보관 위치', v: '[[6]]' },
        ],
      },
      {
        no: '05',
        title: 'Separation period',
        lines: [
          { k: '기간', v: '2016.02 — 2024.10. 거주지: 런던.' },
          { k: '학적', v: '확인 완료. 교우 관계: 소수.' },
          { lock: 's02-05-rain', len: 24 },
          { k: '사유', v: '불명.', lens: '그 비를 전부 맞게 둔 것은 나다.' },
          { k: '귀국 동기', v: '"…그냥. 돌아오고 싶었어." (본인 진술)' },
        ],
      },
      {
        no: '06',
        title: 'Assessment',
        lines: [
          { k: '적응 상태', v: '양호. 탈출 시도 0회.' },
          { k: '현관 앞 정지 행동', v: '확인 행동으로 분류. 위험도 낮음.' },
          { k: '관찰자가 개체에 미치는 영향', v: '~~있음~~ 없음.', lens: '있다.' },
          { k: '결론', v: '보호 조치 유지.' },
          { k: '분리 기간 중 관찰자의 상태', v: '측정 오차 범위 내.', lens: '보고 싶었다.' },
        ],
      },
    ],

    signature: ['서명: S-01.', '관찰 지속.'],
  },
}

/* ── 도우미 ── */

/* '[[7]] 부설 …', '~~좋음~~ 특이 사항 없음.'
   → [{ t: 'bar', n: 7 }, { t: 'text', v: … }, { t: 'del', v: '좋음' }, …] */
export function parseInline(v = '') {
  const out = []
  const re = /\[\[(\d+)\]\]|~~(.+?)~~/g
  let last = 0
  let m
  while ((m = re.exec(v))) {
    if (m.index > last) out.push({ t: 'text', v: v.slice(last, m.index) })
    if (m[1] != null) out.push({ t: 'bar', n: Number(m[1]) })
    else out.push({ t: 'del', v: m[2] })
    last = re.lastIndex
  }
  if (last < v.length) out.push({ t: 'text', v: v.slice(last) })
  return out
}

/* 집계: 완전히 가린 곳 / 열리는 줄 / 정정 / 렌즈 문장 */
export function redactionStats(subject) {
  let sealed = 0
  let locks = 0
  let struck = 0
  let lenses = 0
  for (const sec of subject.sections) {
    for (const line of sec.lines) {
      if (line.lock) locks += 1
      if (line.lens) lenses += 1
      sealed += (line.v?.match(/\[\[\d+\]\]/g) ?? []).length
      struck += (line.v?.match(/~~.+?~~/g) ?? []).length
    }
  }
  return { sealed, locks, struck, lenses }
}