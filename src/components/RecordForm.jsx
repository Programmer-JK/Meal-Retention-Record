import { useState } from 'react'
import { supabase } from '../lib/supabase'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function fieldsToDayOfWeek({ year, month, day }) {
  return DAY_NAMES[new Date(year, month - 1, day).getDay()]
}

const MEAL_FIELDS_DAY = [
  { key: 'morning_snack',   label: '오전간식' },
  { key: 'lunch',           label: '점\u00A0\u00A0\u00A0심' },
  { key: 'afternoon_snack', label: '오후간식' },
]

const MEAL_FIELDS_DINNER = [
  { key: 'dinner', label: '석\u00A0\u00A0\u00A0식' },
]

// 채취 시간: 낮=11:00, 석식=16:00 고정
// 폐기 시간: 항상 09:00 고정 (채취일+7일)
const COLLECTION_HOUR = { day: 11, dinner: 16 }

export default function RecordForm({ record, userProfile, userId, onClose, onSaved, mealType = 'day' }) {
  const activeMealFields = mealType === 'dinner' ? MEAL_FIELDS_DINNER : MEAL_FIELDS_DAY
  const fixedHour = COLLECTION_HOUR[mealType] ?? 11

  const now = new Date()
  const initDate = record ? new Date(record.collection_date) : now

  const [collection, setCollection] = useState({
    year:  initDate.getFullYear(),
    month: initDate.getMonth() + 1,
    day:   initDate.getDate(),
  })

  const [meals, setMeals] = useState({
    morning_snack:   record?.morning_snack   || '',
    lunch:           record?.lunch           || '',
    afternoon_snack: record?.afternoon_snack || '',
    dinner:          record?.dinner          || '',
  })
  const [author, setAuthor] = useState(record?.author || userProfile?.display_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pad = (n) => String(n).padStart(2, '0')

  // 폐기일 = 채취일 + 7일, 09:00 고정
  const disposalDate = new Date(collection.year, collection.month - 1, collection.day + 7, 9, 0)
  const disposal = {
    year:      disposalDate.getFullYear(),
    month:     disposalDate.getMonth() + 1,
    day:       disposalDate.getDate(),
    dayOfWeek: DAY_NAMES[disposalDate.getDay()],
  }

  const years  = Array.from({ length: 11 }, (_, i) => 2020 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days   = Array.from({ length: 31 }, (_, i) => i + 1)

  const handleSave = async () => {
    const hasAnyMeal = activeMealFields.some(({ key }) => meals[key].trim())
    if (!hasAnyMeal) return setError('식단을 하나 이상 입력해주세요.')
    if (!author.trim()) return setError('작성자를 입력해주세요.')
    setLoading(true)
    setError('')

    const collectionDate = new Date(collection.year, collection.month - 1, collection.day, fixedHour, 0)

    const payload = {
      user_id:         userId,
      collection_date: collectionDate.toISOString(),
      disposal_date:   disposalDate.toISOString(),
      morning_snack:   meals.morning_snack.trim(),
      lunch:           meals.lunch.trim(),
      afternoon_snack: meals.afternoon_snack.trim(),
      dinner:          meals.dinner.trim(),
      author:          author.trim(),
    }

    let err
    if (record) {
      ;({ error: err } = await supabase.from('records').update(payload).eq('id', record.id))
    } else {
      ;({ error: err } = await supabase.from('records').insert(payload))
    }

    if (err) setError('저장 중 오류가 발생했습니다.')
    else onSaved()
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{record ? (mealType === 'dinner' ? '석식 기록 수정' : '낮 기록 수정') : (mealType === 'dinner' ? '석식 기록 추가' : '낮 기록 추가')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* 채취일 */}
          <div className="field-section">
            <label className="section-label">채취일</label>
            <div className="date-fields">
              <select value={collection.year} onChange={(e) => setCollection({ ...collection, year: +e.target.value })}>
                {years.map((y) => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select value={collection.month} onChange={(e) => setCollection({ ...collection, month: +e.target.value })}>
                {months.map((m) => <option key={m} value={m}>{pad(m)}월</option>)}
              </select>
              <select value={collection.day} onChange={(e) => setCollection({ ...collection, day: +e.target.value })}>
                {days.map((d) => <option key={d} value={d}>{pad(d)}일</option>)}
              </select>
              <span className="day-of-week">({fieldsToDayOfWeek(collection)})</span>
              <span className="date-fields readonly"><span>{pad(fixedHour)}시 00분</span></span>
            </div>
          </div>

          {/* 폐기일 (자동 계산, 읽기 전용) */}
          <div className="field-section">
            <label className="section-label">폐기일 <span className="auto-label">(채취일 +7일 자동)</span></label>
            <div className="date-fields readonly">
              <span>{disposal.year}년</span>
              <span>{pad(disposal.month)}월</span>
              <span>{pad(disposal.day)}일</span>
              <span>({disposal.dayOfWeek})</span>
              <span>09시 00분</span>
            </div>
          </div>

          {/* 식단 */}
          <div className="field-section">
            <label className="section-label">식단</label>
            <div className="meal-grid">
              {activeMealFields.map(({ key, label }) => (
                <div key={key} className="meal-row">
                  <span className="meal-label">{label.replace(/\u00A0/g, ' ')}</span>
                  <textarea
                    value={meals[key]}
                    onChange={(e) => setMeals({ ...meals, [key]: e.target.value })}
                    placeholder={`${label.replace(/\u00A0/g, '')} 내용`}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 작성자 */}
          <div className="field-section">
            <label className="section-label">작성자</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="작성자 이름"
            />
          </div>

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
