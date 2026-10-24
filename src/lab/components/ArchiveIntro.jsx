import FocusText from './FocusText.jsx'
import './archive.css'

const INDEX = [
  ['Project', 'RF-01'],
  ['Subjects', '02'],
  ['Anomaly', '01'],
  ['Room temp', '23.0°C'],
  ['Access', 'Public / Classified'],
  ['Status', 'Stable'],
]

const BODY = [
  '본 아카이브는 두 개체에 대한 장기 관찰 기록을 보관한다. 모든 기록은 동일한 조건에서 작성되었다. 실내 온도 23.0°C, 조도 일정, 외부 접촉 없음.',
  '기록은 개체 프로필, 상호작용 로그, 시각 자료, 서술 기록으로 분류된다. 일부 문서는 열람 등급에 따라 접근이 제한된다.',
]

const NOTE = '특이사항: 개체 02의 행동 일부가 예측 모델과 일치하지 않음. 측정 오차로 분류.'

export default function ArchiveIntro() {
  return (
    <section className="rf-archive" aria-labelledby="rf-archive-title">
      {/* 섹션 머리 */}
      <div className="rf-archive__head">
        <h2 id="rf-archive-title" className="rf-label">
          (The archive)
        </h2>
        <span className="rf-archive__headline" aria-hidden="true" />
        <span className="rf-archive__mark" aria-hidden="true" />
      </div>

      <div className="rf-archive__grid">
        {/* 왼쪽: 라벨/값 표 */}
        <div className="rf-archive__index">
          <p className="rf-label rf-archive__caption">(Index)</p>
          <ul className="rf-spec">
            {INDEX.map(([k, v]) => (
              <li key={k}>
                <span className="rf-label">{k}</span>
                <span className="rf-spec__value rf-mono">{v}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 오른쪽: 본문 (초점 효과) */}
        <div className="rf-archive__body">
          <p className="rf-label rf-archive__caption">(Abstract)</p>
          {BODY.map((t) => (
            <FocusText key={t} text={t} className="rf-archive__text" />
          ))}
          <FocusText text={NOTE} className="rf-archive__note" />
        </div>
      </div>
    </section>
  )
}