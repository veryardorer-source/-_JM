import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { calcSurfaceCost } from '../utils/surfaceCost.js'
import { generatePDF } from '../utils/pdfGenerator.js'

export default function Summary() {
  const { project, rooms } = useStore()
  const [collapsed, setCollapsed] = useState({}) // roomId → bool

  let grandTotal = 0

  // 실별 계산
  const roomData = rooms.map(room => {
    let roomTotal = 0
    const surfaceData = room.surfaces
      .filter(sf => sf.enabled && sf.finishType && sf.finishType !== 'none')
      .map(sf => {
        const result = calcSurfaceCost(room, sf)
        if (!result || result.items.length === 0) return null
        roomTotal += result.total
        return { sf, items: result.items, total: result.total }
      })
      .filter(Boolean)

    grandTotal += roomTotal
    return { room, surfaceData, roomTotal }
  }).filter(r => r.surfaceData.length > 0)

  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div style={s.card}>
      <div style={s.header}>
        <h2 style={s.title}>견적 합계</h2>
        <button onClick={() => generatePDF(project, rooms)} style={s.pdfBtn}>PDF 출력</button>
      </div>

      {roomData.length === 0 ? (
        <p style={s.empty}>실을 추가하고 마감재를 선택하면 견적이 계산됩니다.</p>
      ) : (
        <>
          {roomData.map(({ room, surfaceData, roomTotal }) => (
            <div key={room.id} style={s.roomBlock}>
              {/* 실 헤더 */}
              <div style={s.roomHeader} onClick={() => toggle(room.id)}>
                <span style={s.collapseIcon}>{collapsed[room.id] ? '▶' : '▼'}</span>
                <span style={s.roomName}>{room.name}</span>
                <span style={s.roomTotal}>{Math.round(roomTotal).toLocaleString()}원</span>
              </div>

              {/* 실 내용 */}
              {!collapsed[room.id] && (
                <div style={s.roomBody}>
                  {surfaceData.map(({ sf, items, total }) => (
                    <div key={sf.id} style={s.surfaceBlock}>
                      {/* 면 헤더 */}
                      <div style={s.surfaceHeader}>
                        <span style={s.surfaceName}>{sf.label}</span>
                        <span style={s.surfaceTotal}>{Math.round(total).toLocaleString()}원</span>
                      </div>
                      {/* 자재 목록 */}
                      <table style={s.table}>
                        <tbody>
                          {items.map((item, i) => (
                            <ItemRow key={i} item={item} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {/* 실 소계 */}
                  <div style={s.roomSubtotal}>
                    <span>{room.name} 소계</span>
                    <span>{Math.round(roomTotal).toLocaleString()}원</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 전체 합계 */}
          <div style={s.grandTotal}>
            <span>전체 합계 (자재비)</span>
            <span style={s.grandTotalNum}>{Math.round(grandTotal).toLocaleString()} 원</span>
          </div>
        </>
      )}
    </div>
  )
}

function ItemRow({ item }) {
  // 필름은 면별 합계 + 구간 상세 표시
  if (item.isFilm) {
    return (
      <>
        <tr style={s.itemRowFilm}>
          <td style={s.tdName}>
            <span style={s.filmBadge}>필름</span>
            {item.sections?.length > 0 ? `${item.sections.length}개 구간` : '구간 미입력'}
          </td>
          <td style={{ ...s.tdQty, color: '#1e4078', fontWeight: 700 }}>
            {item.qty > 0 ? `${item.qty.toFixed(1)}m` : '-'}
          </td>
          <td style={s.tdCost}>{item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
        </tr>
        {item.sections?.map((sec, i) => (
          <tr key={i} style={s.filmSecRow}>
            <td style={{ ...s.tdName, paddingLeft: 20, color: '#888', fontSize: 10 }}>
              └ {i + 1}. 폭{sec.widthMm}mm{sec.patternRepeatMm > 0 ? ` / 패턴${sec.patternRepeatMm}mm` : ''}
              <span style={{ color: '#e06000', marginLeft: 6 }}>로스{sec.lossM}m</span>
            </td>
            <td style={{ ...s.tdQty, color: '#555', fontSize: 10 }}>{sec.sectionM}m</td>
            <td style={{ ...s.tdCost, fontSize: 10, color: '#888' }}>
              {item.unitPrice > 0 ? Math.round(sec.sectionM * item.unitPrice).toLocaleString() : '-'}
            </td>
          </tr>
        ))}
      </>
    )
  }

  return (
    <tr style={s.itemRow}>
      <td style={s.tdName}>{item.name}{item.spec ? <span style={s.spec}> {item.spec}</span> : ''}</td>
      <td style={s.tdQty}>{fmtQty(item.qty, item.unit)} {item.unit}</td>
      <td style={s.tdCost}>{item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
    </tr>
  )
}

function fmtQty(qty, unit) {
  if (!qty && qty !== 0) return '-'
  if (unit === 'm')  return (Math.round(qty * 10) / 10).toFixed(1)
  if (unit === '㎡') return (Math.round(qty * 100) / 100).toFixed(2)
  return Math.round(qty)
}

const s = {
  card:    { background: '#fff', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #1e4078', paddingBottom: 6 },
  title:   { fontSize: 14, fontWeight: 700, color: '#1e4078' },
  pdfBtn:  { fontSize: 12, padding: '6px 14px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 },
  empty:   { color: '#aaa', fontSize: 13, textAlign: 'center', padding: 24 },

  // 실 블록
  roomBlock:   { marginBottom: 8, border: '1px solid #dde4f0', borderRadius: 6, overflow: 'hidden' },
  roomHeader:  { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#1e4078', cursor: 'pointer', userSelect: 'none' },
  collapseIcon:{ fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  roomName:    { flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' },
  roomTotal:   { fontSize: 13, fontWeight: 700, color: '#a8d0ff' },
  roomBody:    { padding: '6px 8px', background: '#fafbfd' },

  // 면 블록
  surfaceBlock:  { marginBottom: 6 },
  surfaceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: '#eef2f8', borderRadius: '4px 4px 0 0', borderLeft: '3px solid #4a7fc1' },
  surfaceName:   { fontSize: 12, fontWeight: 700, color: '#1e4078' },
  surfaceTotal:  { fontSize: 12, fontWeight: 600, color: '#1e4078' },

  // 자재 테이블
  table:  { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  itemRow:    { borderBottom: '1px solid #f0f2f5' },
  itemRowFilm:{ borderBottom: '1px solid #f0f2f5', background: '#fffaf0' },
  filmSecRow: { borderBottom: '1px dashed #f0f2f5', background: '#fffdf5' },
  tdName: { padding: '4px 6px', fontSize: 11, color: '#444', width: '50%' },
  tdQty:  { padding: '4px 6px', fontSize: 11, textAlign: 'right', color: '#555', width: '22%' },
  tdCost: { padding: '4px 6px', fontSize: 11, textAlign: 'right', color: '#333', width: '28%' },
  spec:   { color: '#999', fontSize: 10 },
  filmBadge: { fontSize: 9, background: '#1e4078', color: '#fff', borderRadius: 3, padding: '1px 4px', marginRight: 4 },

  // 소계/합계
  roomSubtotal: { display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: '#dde8f8', borderRadius: '0 0 4px 4px', fontSize: 12, fontWeight: 700, color: '#1e4078', marginTop: 2 },
  grandTotal:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#1e4078', borderRadius: 6, fontWeight: 700, fontSize: 13, color: '#fff', marginTop: 10 },
  grandTotalNum:{ fontSize: 18, color: '#a8d0ff' },
}
