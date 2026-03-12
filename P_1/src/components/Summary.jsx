import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { calcSurfaceCost } from '../utils/surfaceCost.js'
import { generatePDF } from '../utils/pdfGenerator.js'
import { calcMoldingLengthM, calcMoldingEA } from './MoldingSection.jsx'
import { WRAPPING_BOARD_LENGTH_M } from '../data/materials.js'

// 자재 수량 합산 (name + unit 기준)
function aggregateItems(itemsList) {
  const map = {}
  itemsList.forEach(item => {
    if (item.isFilm) {
      // 필름은 name(필름명) + unit 기준으로 합산
      const key = `${item.name}__m`
      if (!map[key]) map[key] = { name: item.name, qty: 0, unit: 'm', cost: 0, isFilm: true }
      map[key].qty = Math.round((map[key].qty + (item.qty || 0)) * 10) / 10
      map[key].cost += item.cost || 0
    } else {
      const key = `${item.name}__${item.unit}`
      if (!map[key]) map[key] = { name: item.name, qty: 0, unit: item.unit, cost: 0 }
      map[key].qty += item.qty || 0
      map[key].cost += item.cost || 0
    }
  })
  return Object.values(map)
}

function fmtQty(qty, unit) {
  if (!qty && qty !== 0) return '-'
  if (unit === 'm')  return (Math.round(qty * 10) / 10).toFixed(1)
  if (unit === '㎡') return (Math.round(qty * 100) / 100).toFixed(2)
  return Math.round(qty)
}

export default function Summary() {
  const { project, rooms } = useStore()
  const [collapsedRooms, setCollapsedRooms] = useState({})
  const [collapsedSurfaces, setCollapsedSurfaces] = useState({})

  // 도어 항목 계산
  function calcDoorItems(doors) {
    return (doors || [])
      .filter(d => d.qty > 0)
      .map(d => ({
        name: `${d.type} ${Math.round(d.widthM * 1000)}×${Math.round(d.heightM * 1000)}mm`,
        qty: d.qty,
        unit: '짝',
        unitPrice: d.unitPrice || 0,
        cost: d.qty * (d.unitPrice || 0),
        isDoor: true,
      }))
  }

  // 데이터 계산
  const roomData = rooms.map(room => {
    const surfaceData = room.surfaces
      .filter(sf => sf.enabled && sf.finishType && sf.finishType !== 'none')
      .map(sf => {
        const result = calcSurfaceCost(room, sf)
        if (!result || result.items.length === 0) return null
        return { sf, items: result.items, total: result.total }
      })
      .filter(Boolean)

    const doorItems = calcDoorItems(room.doors)

    // 조명 항목
    const lightingItems = (room.lightings || [])
      .filter(l => l.qty > 0)
      .map(l => ({
        name: l.type,
        spec: l.spec || '',
        qty: l.qty,
        unit: 'EA',
        lengthM: l.lengthM || 0,
        unitPrice: 0,
        cost: 0,
        isLighting: true,
      }))

    // 랩핑평판(몰딩) 항목
    const moldingItems = (room.moldings || [])
      .map(m => {
        const lengthM = calcMoldingLengthM(m, room)
        const ea = calcMoldingEA(lengthM)
        return {
          name: `랩핑평판 ${m.widthMm}mm (${m.moldType})`,
          qty: ea,
          unit: 'EA',
          lengthM,
          unitPrice: 0,
          cost: 0,
          isMolding: true,
        }
      })
      .filter(m => m.qty > 0)

    const allItems = [...surfaceData.flatMap(d => d.items), ...doorItems, ...lightingItems, ...moldingItems]
    const roomAggregate = aggregateItems(allItems)
    const roomTotal = surfaceData.reduce((s, d) => s + d.total, 0)
      + doorItems.reduce((s, d) => s + d.cost, 0)

    return { room, surfaceData, doorItems, lightingItems, moldingItems, roomAggregate, roomTotal }
  }).filter(r => r.surfaceData.length > 0 || r.doorItems.length > 0 || r.lightingItems.length > 0 || r.moldingItems.length > 0)

  const grandAggregate = aggregateItems(roomData.flatMap(r => r.roomAggregate))
  const grandTotal = roomData.reduce((s, r) => s + r.roomTotal, 0)

  const toggleRoom = (id) => setCollapsedRooms(p => ({ ...p, [id]: !p[id] }))
  const toggleSurface = (id) => setCollapsedSurfaces(p => ({ ...p, [id]: !p[id] }))

  return (
    <div style={s.card}>
      {/* 헤더 */}
      <div style={s.header}>
        <h2 style={s.title}>자재 집계</h2>
        <button onClick={() => generatePDF(project, rooms)} style={s.pdfBtn}>PDF 출력</button>
      </div>

      {roomData.length === 0 ? (
        <p style={s.empty}>실을 추가하고 마감재를 선택하면 집계됩니다.</p>
      ) : (
        <>
          {/* ── 실별 블록 ── */}
          {roomData.map(({ room, surfaceData, doorItems, lightingItems, moldingItems, roomAggregate, roomTotal }) => (
            <div key={room.id} style={s.roomBlock}>
              {/* 실 헤더 */}
              <div style={s.roomHeader} onClick={() => toggleRoom(room.id)}>
                <span style={s.collapseIcon}>{collapsedRooms[room.id] ? '▶' : '▼'}</span>
                <span style={s.roomName}>{room.name}</span>
                {room.widthM > 0 && room.depthM > 0 && (
                  <span style={s.roomSize}>{room.widthM}×{room.depthM}×H{room.heightM}m</span>
                )}
              </div>

              {!collapsedRooms[room.id] && (
                <div style={s.roomBody}>
                  {/* 면별 자재 목록 */}
                  {surfaceData.map(({ sf, items, total }) => (
                    <div key={sf.id} style={s.surfaceBlock}>
                      <div style={s.surfaceHeader} onClick={() => toggleSurface(sf.id)}>
                        <span style={s.collapseIconSm}>{collapsedSurfaces[sf.id] ? '▶' : '▼'}</span>
                        <span style={s.surfaceName}>{sf.label}</span>
                        <span style={s.surfaceCostHint}>{Math.round(total).toLocaleString()}원</span>
                      </div>
                      {!collapsedSurfaces[sf.id] && (
                        <table style={s.table}>
                          <tbody>
                            {items.map((item, i) => (
                              <SurfaceItemRow key={i} item={item} />
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}

                  {/* 도어 목록 */}
                  {doorItems.length > 0 && (
                    <div style={s.surfaceBlock}>
                      <div style={{ ...s.surfaceHeader, borderLeftColor: '#7b5ea7' }}>
                        <span style={s.collapseIconSm}>―</span>
                        <span style={s.surfaceName}>도어</span>
                        <span style={s.surfaceCostHint}>
                          {Math.round(doorItems.reduce((sum, d) => sum + d.cost, 0)).toLocaleString()}원
                        </span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {doorItems.map((item, i) => (
                            <tr key={i} style={s.itemRow}>
                              <td style={s.tdName}>
                                <span style={{ ...s.filmBadge, background: '#7b5ea7' }}>도어</span>
                                {item.name}
                              </td>
                              <td style={s.tdQty}>{item.qty} {item.unit}</td>
                              <td style={s.tdCost}>{item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 조명 목록 */}
                  {lightingItems.length > 0 && (
                    <div style={s.surfaceBlock}>
                      <div style={{ ...s.surfaceHeader, borderLeftColor: '#e0a020' }}>
                        <span style={s.collapseIconSm}>―</span>
                        <span style={s.surfaceName}>조명</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {lightingItems.map((item, i) => (
                            <tr key={i} style={s.itemRow}>
                              <td style={s.tdName}>
                                <span style={{ ...s.filmBadge, background: '#e0a020' }}>조명</span>
                                {item.name}{item.spec ? ` (${item.spec})` : ''}
                              </td>
                              <td style={s.tdQty}>{item.qty} EA{item.lengthM > 0 ? ` / ${item.lengthM}m` : ''}</td>
                              <td style={s.tdCost}>-</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 랩핑평판 목록 */}
                  {moldingItems.length > 0 && (
                    <div style={s.surfaceBlock}>
                      <div style={{ ...s.surfaceHeader, borderLeftColor: '#6a9e4a' }}>
                        <span style={s.collapseIconSm}>―</span>
                        <span style={s.surfaceName}>랩핑평판</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {moldingItems.map((item, i) => (
                            <tr key={i} style={s.itemRow}>
                              <td style={s.tdName}>
                                <span style={{ ...s.filmBadge, background: '#6a9e4a' }}>몰딩</span>
                                {item.name}
                              </td>
                              <td style={s.tdQty}>{item.qty} EA <span style={{ color: '#999', fontSize: 10 }}>({item.lengthM.toFixed(2)}m)</span></td>
                              <td style={s.tdCost}>-</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 실 자재 합계 */}
                  <div style={s.aggBlock}>
                    <div style={s.aggTitle}>{room.name} 자재 합계</div>
                    <table style={s.table}>
                      <tbody>
                        {roomAggregate.map((item, i) => (
                          <AggRow key={i} item={item} />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={s.aggFoot}>
                          <td colSpan={2} style={s.aggFootLabel}>합계 (참고금액)</td>
                          <td style={s.aggFootAmt}>{Math.round(roomTotal).toLocaleString()}원</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* ── 전체 자재 합계 ── */}
          <div style={s.grandBlock}>
            <div style={s.grandTitle}>전체 자재 합계</div>
            <table style={s.table}>
              <thead>
                <tr style={s.grandHead}>
                  <th style={s.thName}>자재명</th>
                  <th style={s.thQty}>수량</th>
                  <th style={s.thCost}>참고금액(원)</th>
                </tr>
              </thead>
              <tbody>
                {grandAggregate.map((item, i) => (
                  <AggRow key={i} item={item} highlight />
                ))}
              </tbody>
              <tfoot>
                <tr style={s.grandFoot}>
                  <td colSpan={2} style={s.grandFootLabel}>합계 (참고금액)</td>
                  <td style={s.grandFootAmt}>{Math.round(grandTotal).toLocaleString()}원</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// 면 내 자재 행 (구간 상세 포함)
function SurfaceItemRow({ item }) {
  if (item.isFilm) {
    return (
      <>
        <tr style={s.itemRowFilm}>
          <td style={s.tdName}>
            <span style={s.filmBadge}>필름</span>
            <strong>{item.name}</strong>
            {item.sections?.length > 0
              ? <span style={s.secCount}> {item.sections.length}구간</span>
              : <span style={s.secWarn}> 구간 미입력</span>}
          </td>
          <td style={{ ...s.tdQty, fontWeight: 700, color: '#1e4078' }}>
            {item.qty > 0 ? `${item.qty.toFixed(1)}m` : '-'}
          </td>
          <td style={s.tdCost}>{item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
        </tr>
        {item.sections?.map((sec, i) => (
          <tr key={i} style={s.secRow}>
            <td style={s.secName}>
              └ {i + 1}. 폭{sec.widthMm}mm
              {sec.patternRepeatMm > 0 ? ` 패턴${sec.patternRepeatMm}mm` : ''}
              <span style={s.lossTag}>로스 {sec.lossM}m</span>
            </td>
            <td style={{ ...s.tdQty, fontSize: 10 }}>{sec.sectionM}m</td>
            <td style={{ ...s.tdCost, fontSize: 10, color: '#aaa' }}>
              {sec.sectionCost > 0 ? Math.round(sec.sectionCost).toLocaleString() : '-'}
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

// 집계 행 (실 합계 / 전체 합계)
function AggRow({ item, highlight }) {
  return (
    <tr style={highlight ? s.aggRowHL : s.aggRow}>
      <td style={s.tdName}>
        {item.isFilm && <span style={s.filmBadge}>필름</span>}
        <strong>{item.name}</strong>
      </td>
      <td style={{ ...s.tdQty, fontWeight: 700, color: highlight ? '#1e4078' : '#333', fontSize: highlight ? 13 : 12 }}>
        {fmtQty(item.qty, item.unit)} {item.unit}
      </td>
      <td style={{ ...s.tdCost, color: '#aaa', fontSize: 10 }}>
        {item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}
      </td>
    </tr>
  )
}

const s = {
  card:  { background: '#fff', borderRadius: 8, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  header:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '2px solid #1e4078', paddingBottom: 6 },
  title: { fontSize: 14, fontWeight: 700, color: '#1e4078' },
  pdfBtn:{ fontSize: 12, padding: '6px 14px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 },
  empty: { color: '#aaa', fontSize: 13, textAlign: 'center', padding: 24 },

  // 실 블록
  roomBlock:  { marginBottom: 8, border: '1px solid #c8d4e8', borderRadius: 6, overflow: 'hidden' },
  roomHeader: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: '#1e4078', cursor: 'pointer', userSelect: 'none' },
  collapseIcon:{ fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  roomName:   { fontSize: 13, fontWeight: 700, color: '#fff' },
  roomSize:   { flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  roomBody:   { padding: '6px 8px', background: '#f7f9fc' },

  // 면 블록
  surfaceBlock:  { marginBottom: 5, border: '1px solid #e0e8f4', borderRadius: 4, overflow: 'hidden' },
  surfaceHeader: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: '#eef2f8', cursor: 'pointer', userSelect: 'none', borderLeft: '3px solid #4a7fc1' },
  collapseIconSm:{ fontSize: 9, color: '#888' },
  surfaceName:   { flex: 1, fontSize: 12, fontWeight: 700, color: '#1e4078' },
  surfaceCostHint:{ fontSize: 10, color: '#aaa' },

  // 테이블 공통
  table:  { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  itemRow:    { borderBottom: '1px solid #f0f2f5' },
  itemRowFilm:{ borderBottom: '1px solid #f0f2f5', background: '#fffaf0' },
  secRow:     { borderBottom: '1px dashed #f0f2f5', background: '#fffdf5' },
  tdName: { padding: '4px 8px', fontSize: 11, color: '#444', width: '52%' },
  tdQty:  { padding: '4px 6px', fontSize: 11, textAlign: 'right', color: '#333', width: '22%' },
  tdCost: { padding: '4px 8px', fontSize: 11, textAlign: 'right', color: '#aaa', width: '26%' },
  spec:   { color: '#999', fontSize: 10 },
  secName:{ padding: '3px 8px 3px 20px', fontSize: 10, color: '#888', width: '52%' },
  lossTag:{ color: '#e06000', marginLeft: 6, fontSize: 10 },
  filmBadge:{ fontSize: 9, background: '#1e4078', color: '#fff', borderRadius: 3, padding: '1px 4px', marginRight: 4 },
  secCount: { color: '#999', fontSize: 10 },
  secWarn:  { color: '#c00', fontSize: 10 },

  // 실 집계 블록
  aggBlock: { marginTop: 6, border: '2px solid #c8d4e8', borderRadius: 5, overflow: 'hidden' },
  aggTitle: { padding: '5px 10px', background: '#dde8f8', fontSize: 11, fontWeight: 700, color: '#1e4078' },
  aggRow:   { borderBottom: '1px solid #eef2f8' },
  aggRowHL: { borderBottom: '1px solid #e0e8f4', background: '#f5f8ff' },
  aggFoot:  { background: '#c8d4e8' },
  aggFootLabel: { padding: '5px 8px', fontSize: 11, fontWeight: 700, color: '#1e4078', textAlign: 'right' },
  aggFootAmt:   { padding: '5px 8px', fontSize: 11, fontWeight: 700, color: '#1e4078', textAlign: 'right' },

  // 전체 집계 블록
  grandBlock: { marginTop: 10, border: '2px solid #1e4078', borderRadius: 6, overflow: 'hidden' },
  grandTitle: { padding: '7px 12px', background: '#1e4078', fontSize: 13, fontWeight: 700, color: '#fff' },
  grandHead:  { background: '#2d5499' },
  thName: { padding: '5px 8px', fontSize: 11, color: '#cde', fontWeight: 700, width: '52%' },
  thQty:  { padding: '5px 6px', fontSize: 11, color: '#cde', fontWeight: 700, textAlign: 'right', width: '22%' },
  thCost: { padding: '5px 8px', fontSize: 11, color: '#cde', fontWeight: 700, textAlign: 'right', width: '26%' },
  grandFoot:      { background: '#1e4078' },
  grandFootLabel: { padding: '7px 8px', fontSize: 12, fontWeight: 700, color: '#a8d0ff', textAlign: 'right' },
  grandFootAmt:   { padding: '7px 8px', fontSize: 14, fontWeight: 700, color: '#a8d0ff', textAlign: 'right' },
}
