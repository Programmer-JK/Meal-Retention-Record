import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import RecordForm from '../components/RecordForm'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')

function parseDateParts(isoString) {
  const d = new Date(isoString)
  return {
    year: d.getFullYear(),
    month: pad(d.getMonth() + 1),
    day: pad(d.getDate()),
    dayOfWeek: DAY_NAMES[d.getDay()],
    hour: pad(d.getHours()),
    minute: pad(d.getMinutes()),
  }
}

// 인쇄용 카드 컴포넌트 (이미지와 동일한 형식)
function PrintCard({ record, index }) {
  const c = parseDateParts(record.collection_date)
  const d = parseDateParts(record.disposal_date)

  return (
    <div className="print-card">
      <div className="pc-title">
        <span className="pc-icon">☀</span>
        <strong>보존식 기록표</strong>
        <span className="pc-subtitle">(-18℃이하 144시간 보관)</span>
        <span className="pc-icon">🌱</span>
      </div>

      <table className="pc-date-table">
        <tbody>
          <tr>
            <td className="pc-date-label">채취일 :</td>
            <td><span className="dv">{c.year}</span>년 <span className="dv">{c.month}</span>월 <span className="dv">{c.day}</span>일 <span className="dv">{c.dayOfWeek}</span>요일 <span className="dv">{c.hour}</span>시 <span className="dv">{c.minute}</span>분</td>
          </tr>
          <tr>
            <td className="pc-date-label">폐기일 :</td>
            <td><span className="dv">{d.year}</span>년 <span className="dv">{d.month}</span>월 <span className="dv">{d.day}</span>일 <span className="dv">{d.dayOfWeek}</span>요일 <span className="dv">{d.hour}</span>시 <span className="dv">{d.minute}</span>분</td>
          </tr>
        </tbody>
      </table>

      <div className="pc-diet-section">
        <div className="pc-diet-label">식 단</div>
        <div className="pc-diet-content">{record.diet}</div>
      </div>

      <div className="pc-footer">
        <div className="pc-author">작성자 : <span>{record.author}</span></div>
        <div className="pc-org">도봉구 어린이급식관리지원센터</div>
      </div>
    </div>
  )
}

export default function Dashboard({ session }) {
  const [records, setRecords] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')

  useEffect(() => {
    fetchProfile()
    fetchRecords()
  }, [])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setUserProfile(data)
  }

  const fetchRecords = async () => {
    setLoading(true)
    let query = supabase
      .from('records')
      .select('*')
      .order('collection_date', { ascending: false })

    if (filterStart) query = query.gte('collection_date', filterStart + 'T00:00:00')
    if (filterEnd) query = query.lte('collection_date', filterEnd + 'T23:59:59')

    const { data } = await query
    setRecords(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) return
    await supabase.from('records').delete().eq('id', id)
    fetchRecords()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleExcelExport = () => {
    const rows = records.map((r, i) => {
      const c = parseDateParts(r.collection_date)
      const d = parseDateParts(r.disposal_date)
      return {
        번호: i + 1,
        채취일: `${c.year}-${c.month}-${c.day}`,
        채취요일: c.dayOfWeek,
        채취시간: `${c.hour}:${c.minute}`,
        폐기일: `${d.year}-${d.month}-${d.day}`,
        폐기요일: d.dayOfWeek,
        폐기시간: `${d.hour}:${d.minute}`,
        식단: r.diet,
        작성자: r.author,
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 5 }, { wch: 14 }, { wch: 6 }, { wch: 8 },
      { wch: 14 }, { wch: 6 }, { wch: 8 }, { wch: 40 }, { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '보존식기록')
    XLSX.writeFile(wb, `보존식기록_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 인쇄: 8개씩 페이지 그룹
  const printPages = []
  for (let i = 0; i < records.length; i += 8) {
    printPages.push(records.slice(i, i + 8))
  }

  return (
    <div className="dashboard">
      {/* ── 헤더 (화면 전용) ── */}
      <header className="dash-header no-print">
        <div className="dash-title">
          <span className="dash-icon">☀</span>
          <h1>보존식 기록표</h1>
        </div>
        <div className="dash-user">
          <span>{userProfile?.display_name || userProfile?.username || ''}</span>
          <button className="btn-logout" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      {/* ── 필터 & 버튼 (화면 전용) ── */}
      <div className="dash-controls no-print">
        <div className="filter-row">
          <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          <span className="filter-sep">~</span>
          <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
          <button className="btn-secondary" onClick={fetchRecords}>조회</button>
          <button className="btn-secondary" onClick={() => { setFilterStart(''); setFilterEnd(''); setTimeout(fetchRecords, 0) }}>초기화</button>
        </div>
        <div className="action-row">
          <button className="btn-primary" onClick={() => { setEditRecord(null); setShowForm(true) }}>
            + 기록 추가
          </button>
          <button className="btn-secondary" onClick={handleExcelExport} disabled={records.length === 0}>
            엑셀 다운로드
          </button>
          <button className="btn-secondary" onClick={() => window.print()} disabled={records.length === 0}>
            인쇄
          </button>
        </div>
      </div>

      {/* ── 화면용 테이블 ── */}
      <div className="no-print">
        {loading ? (
          <div className="loading-msg">불러오는 중...</div>
        ) : records.length === 0 ? (
          <div className="empty-msg">기록이 없습니다. 기록을 추가해주세요.</div>
        ) : (
          <>
            {/* 데스크탑: 테이블 */}
            <div className="table-wrap">
              <table className="record-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>채취일</th>
                    <th>폐기일</th>
                    <th>식단</th>
                    <th>작성자</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const c = parseDateParts(r.collection_date)
                    const d = parseDateParts(r.disposal_date)
                    return (
                      <tr key={r.id}>
                        <td className="td-num">{records.length - i}</td>
                        <td className="td-date">{c.year}.{c.month}.{c.day} ({c.dayOfWeek}) {c.hour}:{c.minute}</td>
                        <td className="td-date">{d.year}.{d.month}.{d.day} ({d.dayOfWeek}) {d.hour}:{d.minute}</td>
                        <td className="td-diet">{r.diet}</td>
                        <td className="td-author">{r.author}</td>
                        <td className="td-actions">
                          <button className="btn-edit" onClick={() => { setEditRecord(r); setShowForm(true) }}>수정</button>
                          <button className="btn-delete" onClick={() => handleDelete(r.id)}>삭제</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 모바일: 카드형 리스트 */}
            <div className="mobile-list">
              {records.map((r, i) => {
                const c = parseDateParts(r.collection_date)
                const d = parseDateParts(r.disposal_date)
                return (
                  <div key={r.id} className="mobile-card">
                    <div className="mc-num">#{records.length - i}</div>
                    <div className="mc-row">
                      <span className="mc-label">채취일</span>
                      <span>{c.year}.{c.month}.{c.day} ({c.dayOfWeek}) {c.hour}:{c.minute}</span>
                    </div>
                    <div className="mc-row">
                      <span className="mc-label">폐기일</span>
                      <span>{d.year}.{d.month}.{d.day} ({d.dayOfWeek}) {d.hour}:{d.minute}</span>
                    </div>
                    <div className="mc-row">
                      <span className="mc-label">식단</span>
                      <span className="mc-diet">{r.diet}</span>
                    </div>
                    <div className="mc-row">
                      <span className="mc-label">작성자</span>
                      <span>{r.author}</span>
                    </div>
                    <div className="mc-actions">
                      <button className="btn-edit" onClick={() => { setEditRecord(r); setShowForm(true) }}>수정</button>
                      <button className="btn-delete" onClick={() => handleDelete(r.id)}>삭제</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 인쇄용 카드 레이아웃 (화면에서는 숨김) ── */}
      <div className="print-only">
        {printPages.map((pageRecords, pi) => (
          <div key={pi} className="print-page">
            {pageRecords.map((r) => (
              <PrintCard key={r.id} record={r} />
            ))}
          </div>
        ))}
      </div>

      {/* ── 기록 추가/수정 모달 ── */}
      {showForm && (
        <RecordForm
          record={editRecord}
          userProfile={userProfile}
          userId={session.user.id}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRecords() }}
        />
      )}
    </div>
  )
}
