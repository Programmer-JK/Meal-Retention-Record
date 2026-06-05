import { useState, useEffect } from 'react'
import ExcelJS from 'exceljs'
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

export default function Dashboard({ user, onLogout }) {
  const [records, setRecords] = useState([])
  const userProfile = user
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async (start = filterStart, end = filterEnd) => {
    setLoading(true)
    let query = supabase
      .from('records')
      .select('*')
      .order('collection_date', { ascending: false })

    if (start) query = query.gte('collection_date', start + 'T00:00:00')
    if (end) query = query.lte('collection_date', end + 'T23:59:59')

    const { data } = await query
    setRecords(data || [])
    setSelectedIds(new Set())
    setLoading(false)
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map(r => r.id)))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('이 기록을 삭제하시겠습니까?')) return
    await supabase.from('records').delete().eq('id', id)
    fetchRecords()
  }

  const handleLogout = () => {
    onLogout()
  }

  const handleExcelExport = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator = '보존식 기록표'
    wb.created = new Date()

    const ws = wb.addWorksheet('보존식기록', {
      views: [{ state: 'frozen', ySplit: 2 }],
    })

    // ── 열 너비 & 키 정의 ──
    ws.columns = [
      { key: 'no',       width: 6 },
      { key: 'cDate',    width: 14 },
      { key: 'cDay',     width: 6 },
      { key: 'cTime',    width: 8 },
      { key: 'dDate',    width: 14 },
      { key: 'dDay',     width: 6 },
      { key: 'dTime',    width: 8 },
      { key: 'diet',     width: 45 },
      { key: 'author',   width: 10 },
    ]

    // ── 공통 스타일 ──
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
    const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } }
    const oddFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    const evenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } }
    const border = {
      top:    { style: 'thin', color: { argb: 'FFA5D6A7' } },
      bottom: { style: 'thin', color: { argb: 'FFA5D6A7' } },
      left:   { style: 'thin', color: { argb: 'FFA5D6A7' } },
      right:  { style: 'thin', color: { argb: 'FFA5D6A7' } },
    }
    const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: false }
    const leftAlign   = { horizontal: 'left',   vertical: 'middle', wrapText: true }

    // ── 1행: 타이틀 병합 ──
    const titleRow = ws.addRow(['보존식 기록표 (-18℃이하 144시간 보관)'])
    ws.mergeCells('A1:I1')
    const titleCell = ws.getCell('A1')
    titleCell.font     = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Malgun Gothic' }
    titleCell.fill     = headerFill
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleRow.height    = 28

    // ── 2행: 컬럼 헤더 ──
    const headers = ['번호', '채취일', '채취요일', '채취시간', '폐기일', '폐기요일', '폐기시간', '식단', '작성자']
    const headerRow = ws.addRow(headers)
    headerRow.height = 22
    headerRow.eachCell((cell) => {
      cell.font      = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Malgun Gothic' }
      cell.fill      = subHeaderFill
      cell.alignment = centerAlign
      cell.border    = border
    })

    // ── 데이터 행 ──
    records.forEach((r, i) => {
      const c = parseDateParts(r.collection_date)
      const d = parseDateParts(r.disposal_date)
      const row = ws.addRow([
        records.length - i,
        `${c.year}-${c.month}-${c.day}`,
        c.dayOfWeek,
        `${c.hour}:${c.minute}`,
        `${d.year}-${d.month}-${d.day}`,
        d.dayOfWeek,
        `${d.hour}:${d.minute}`,
        r.diet,
        r.author,
      ])
      row.height = 18
      const fill = i % 2 === 0 ? oddFill : evenFill
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill      = fill
        cell.border    = border
        cell.font      = { size: 10, name: 'Malgun Gothic' }
        cell.alignment = colNum === 8 ? leftAlign : centerAlign
      })
    })

    // ── 다운로드 ──
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `보존식기록_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 인쇄: 선택된 항목만 (없으면 전체), 8개씩 페이지 그룹
  const printRecords = selectedIds.size > 0 ? records.filter(r => selectedIds.has(r.id)) : records
  const printPages = []
  for (let i = 0; i < printRecords.length; i += 8) {
    printPages.push(printRecords.slice(i, i + 8))
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
          <button className="btn-secondary" onClick={() => { setFilterStart(''); setFilterEnd(''); fetchRecords('', '') }}>초기화</button>
        </div>
        <div className="action-row">
          <button className="btn-primary" onClick={() => { setEditRecord(null); setShowForm(true) }}>
            + 기록 추가
          </button>
          <button className="btn-secondary" onClick={handleExcelExport} disabled={records.length === 0}>
            엑셀 다운로드
          </button>
          <button className="btn-secondary" onClick={() => window.print()} disabled={records.length === 0}>
            인쇄{selectedIds.size > 0 ? ` (${selectedIds.size}개 선택)` : ''}
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
                    <th className="th-cb">
                      <input
                        type="checkbox"
                        checked={records.length > 0 && selectedIds.size === records.length}
                        ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < records.length }}
                        onChange={toggleSelectAll}
                      />
                    </th>
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
                    const selected = selectedIds.has(r.id)
                    return (
                      <tr key={r.id} className={selected ? 'tr-selected' : ''} onClick={() => toggleSelect(r.id)}>
                        <td className="td-cb" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selected} onChange={() => toggleSelect(r.id)} />
                        </td>
                        <td className="td-num">{records.length - i}</td>
                        <td className="td-date">{c.year}.{c.month}.{c.day} ({c.dayOfWeek}) {c.hour}:{c.minute}</td>
                        <td className="td-date">{d.year}.{d.month}.{d.day} ({d.dayOfWeek}) {d.hour}:{d.minute}</td>
                        <td className="td-diet">{r.diet}</td>
                        <td className="td-author">{r.author}</td>
                        <td className="td-actions" onClick={e => e.stopPropagation()}>
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
                const selected = selectedIds.has(r.id)
                return (
                  <div key={r.id} className={`mobile-card${selected ? ' mc-selected' : ''}`} onClick={() => toggleSelect(r.id)}>
                    <div className="mc-top">
                      <div className="mc-num">#{records.length - i}</div>
                      <input type="checkbox" className="mc-cb" checked={selected} onChange={() => toggleSelect(r.id)} onClick={e => e.stopPropagation()} />
                    </div>
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
                    <div className="mc-actions" onClick={e => e.stopPropagation()}>
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
          userId={user.id}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRecords() }}
        />
      )}
    </div>
  )
}
