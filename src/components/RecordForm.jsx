import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateToFields(d) {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  }
}

function fieldsToDayOfWeek({ year, month, day }) {
  return DAY_NAMES[new Date(year, month - 1, day).getDay()]
}

function fieldsToDate({ year, month, day, hour, minute }) {
  return new Date(year, month - 1, day, hour, minute)
}

export default function RecordForm({ record, userProfile, userId, onClose, onSaved }) {
  const now = new Date()
  const initCollection = record
    ? dateToFields(new Date(record.collection_date))
    : dateToFields(now)

  const [collection, setCollection] = useState(initCollection)
  const [diet, setDiet] = useState(record?.diet || '')
  const [author, setAuthor] = useState(record?.author || userProfile?.display_name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 폐기일 = 채취일 + 7일 (자동 계산)
  const disposalDate = addDays(fieldsToDate(collection), 7)
  const disposal = dateToFields(disposalDate)

  const years = Array.from({ length: 11 }, (_, i) => 2020 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const pad = (n) => String(n).padStart(2, '0')

  const handleSave = async () => {
    if (!diet.trim()) return setError('식단을 입력해주세요.')
    if (!author.trim()) return setError('작성자를 입력해주세요.')
    setLoading(true)
    setError('')

    const payload = {
      user_id: userId,
      collection_date: fieldsToDate(collection).toISOString(),
      disposal_date: disposalDate.toISOString(),
      diet: diet.trim(),
      author: author.trim(),
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
          <h2>{record ? '기록 수정' : '기록 추가'}</h2>
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
              <select value={collection.hour} onChange={(e) => setCollection({ ...collection, hour: +e.target.value })}>
                {hours.map((h) => <option key={h} value={h}>{pad(h)}시</option>)}
              </select>
              <select value={collection.minute} onChange={(e) => setCollection({ ...collection, minute: +e.target.value })}>
                {minutes.map((m) => <option key={m} value={m}>{pad(m)}분</option>)}
              </select>
            </div>
          </div>

          {/* 폐기일 (자동 계산, 읽기 전용) */}
          <div className="field-section">
            <label className="section-label">폐기일 <span className="auto-label">(채취일 +7일 자동)</span></label>
            <div className="date-fields readonly">
              <span>{disposal.year}년</span>
              <span>{pad(disposal.month)}월</span>
              <span>{pad(disposal.day)}일</span>
              <span>({fieldsToDayOfWeek(disposal)})</span>
              <span>{pad(disposal.hour)}시</span>
              <span>{pad(disposal.minute)}분</span>
            </div>
          </div>

          {/* 식단 */}
          <div className="field-section">
            <label className="section-label">식단</label>
            <textarea
              value={diet}
              onChange={(e) => setDiet(e.target.value)}
              placeholder="식단 내용을 입력하세요"
              rows={4}
            />
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
