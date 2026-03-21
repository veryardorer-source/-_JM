import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { calcSurfaceCost } from '../utils/surfaceCost.js'
import { calcPartitionCost } from '../utils/partitionCost.js'
import { generatePDF } from '../utils/pdfGenerator.js'
import { calcMoldingLengthM, calcMoldingEA } from '../utils/molding.js'
import { calcLinearCombo } from '../utils/calculations.js'
import { WRAPPING_BOARD_LENGTH_M } from '../data/materials.js'
import { exportToExcel } from '../utils/excelExport.js'

const DIR_LABEL = {
  wallA: '벽A', wallB: '벽B', wallC: '벽C', wallD: '벽D',
  wallN: '벽A', wallS: '벽B', wallE: '벽C', wallW: '벽D',
  floor: '바닥', ceiling: '천장',
}
function getSurfaceLabel(sf) {
  return DIR_LABEL[sf.direction] || sf.label || sf.name || sf.direction
}

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
  const { project, rooms, globalItems, customMaterials, priceOverrides } = useStore()
  const matOpts = { customMaterials, priceOverrides }
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
    const allSurfaces = [...room.surfaces, ...(room.partitions || [])]
    const surfaceData = allSurfaces
      .filter(sf => sf.enabled && sf.finishType && sf.finishType !== 'none')
      .map(sf => {
        const result = calcSurfaceCost(room, sf, matOpts)
        if (!result || result.items.length === 0) return null
        return { sf, items: result.items, total: result.total }
      })
      .filter(Boolean)

    const doorItems = calcDoorItems(room.doors)

    // 조명 항목
    const LINE_TYPES = ['라인조명 T5', '라인조명 T7']
    const lightingItems = (room.lightings || [])
      .filter(l => LINE_TYPES.includes(l.type) ? (l.lengthM || 0) > 0 : l.qty > 0)
      .map(l => {
        const totalLengthMm = (l.lengthM || 0) * 1000
        return {
          name: l.type,
          spec: l.spec || '',
          qty: l.qty,
          unit: 'EA',
          lengthM: l.lengthM || 0,
          totalLengthMm,
          unitPrice: 0,
          cost: 0,
          isLighting: true,
        }
      })

    // 랩핑평판(몰딩) 항목 - 벽면 + 가벽
    const wallMoldings = (room.moldings || []).map(m => {
      const lengthM = calcMoldingLengthM(m, room)
      const ea = calcMoldingEA(lengthM)
      return { name: `랩핑평판 ${m.widthMm}mm (${m.moldType})`, qty: ea, unit: 'EA', lengthM, unitPrice: 0, cost: 0, isMolding: true }
    })
    const partMoldings = (room.partitions || []).flatMap(p =>
      (p.moldings || []).map(m => {
        const lengthM = m.autoCalc ? (p.widthM || 0) : (m.customLengthM || 0)
        const ea = calcMoldingEA(lengthM)
        return { name: `랩핑평판 ${m.widthMm}mm (${p.name || '가벽'})`, qty: ea, unit: 'EA', lengthM, unitPrice: 0, cost: 0, isMolding: true }
      })
    )
    const moldingItems = [...wallMoldings, ...partMoldings].filter(m => m.qty > 0)

    // 칸막이벽 항목
    const partitionData = (room.partitions || [])
      .map(p => {
        const result = calcPartitionCost(room, p)
        return { partition: p, items: result.items, total: result.total }
      })
      .filter(pd => pd.items.length > 0)

    const allItems = [...surfaceData.flatMap(d => d.items), ...doorItems, ...lightingItems, ...moldingItems, ...partitionData.flatMap(pd => pd.items)]
    const roomAggregate = aggregateItems(allItems)
    const laborTotal = room.surfaces.reduce((s, sf) => {
      return s + (sf.laborItems || []).reduce((ss, li) => {
        return ss + ((li.matUnitPrice || 0) + (li.labUnitPrice || 0) + (li.expUnitPrice || 0)) * (li.qty || 0)
      }, 0)
    }, 0)
    const roomTotal = surfaceData.reduce((s, d) => s + d.total, 0)
      + doorItems.reduce((s, d) => s + d.cost, 0)
      + partitionData.reduce((s, pd) => s + pd.total, 0)
      + laborTotal

    return { room, surfaceData, doorItems, lightingItems, moldingItems, partitionData, roomAggregate, roomTotal }
  }).filter(r => r.surfaceData.length > 0 || r.doorItems.length > 0 || r.lightingItems.length > 0 || r.moldingItems.length > 0 || r.partitionData.length > 0)

  const grandAggregate = aggregateItems(roomData.flatMap(r => r.roomAggregate))
  const grandTotal = roomData.reduce((s, r) => s + r.roomTotal, 0)

  const toggleRoom = (id) => setCollapsedRooms(p => ({ ...p, [id]: !p[id] }))
  const toggleSurface = (id) => setCollapsedSurfaces(p => ({ ...p, [id]: !p[id] }))

  return (
    <div style={s.card}>
      {/* 헤더 */}
      <div style={s.header}>
        <h2 style={s.title}>자재 집계</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => exportToExcel(project, roomData, grandAggregate, grandTotal, globalItems).catch(e => alert('오류: ' + e.message))}
            style={s.xlsBtn}>엑셀 내보내기</button>
          <button onClick={() => generatePDF(project, roomData, grandAggregate, grandTotal)} style={s.pdfBtn}>인쇄 / PDF</button>
        </div>
      </div>

      {roomData.length === 0 ? (
        <p style={s.empty}>실을 추가하고 마감재를 선택하면 집계됩니다.</p>
      ) : (
        <>
          {/* ── 실별 블록 ── */}
          {roomData.map(({ room, surfaceData, doorItems, lightingItems, moldingItems, partitionData, roomAggregate, roomTotal }) => (
            <div key={room.id} style={s.roomBlock}>
              {/* 실 헤더 */}
              <div style={s.roomHeader} onClick={() => toggleRoom(room.id)}>
                <span style={s.collapseIcon}>{collapsedRooms[room.id] ? '▶' : '▼'}</span>
                <span style={s.roomName}>{room.name}</span>
                {room.widthM > 0 && room.depthM > 0 && (
                  <span style={s.roomSize}>{Math.round(room.widthM*1000)}×{Math.round(room.depthM*1000)}×H{Math.round(room.heightM*1000)}mm</span>
                )}
              </div>

              {!collapsedRooms[room.id] && (
                <div style={s.roomBody}>
                  {/* 면별 자재 목록 */}
                  {surfaceData.map(({ sf, items, total }) => (
                    <div key={sf.id} style={s.surfaceBlock}>
                      <div style={s.surfaceHeader} onClick={() => toggleSurface(sf.id)}>
                        <span style={s.collapseIconSm}>{collapsedSurfaces[sf.id] ? '▶' : '▼'}</span>
                        <span style={s.surfaceName}>{getSurfaceLabel(sf)}</span>
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

                  {/* 랩핑평판 – 면 목록 바로 아래 */}
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

                  {/* 조명 – 실 하단 */}
                  {lightingItems.length > 0 && (
                    <div style={s.surfaceBlock}>
                      <div style={{ ...s.surfaceHeader, borderLeftColor: '#e0a020' }}>
                        <span style={s.collapseIconSm}>―</span>
                        <span style={s.surfaceName}>조명</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {lightingItems.map((item, i) => {
                            const isLinear = item.name.includes('T5') || item.name.includes('T7')
                            const combo = isLinear && item.totalLengthMm > 0
                              ? calcLinearCombo(item.totalLengthMm) : null
                            return (
                              <>
                                <tr key={i} style={s.itemRow}>
                                  <td style={s.tdName}>
                                    <span style={{ ...s.filmBadge, background: '#e0a020' }}>조명</span>
                                    {item.name}{item.spec ? ` (${item.spec})` : ''}
                                  </td>
                                  <td style={s.tdQty}>
                                    {item.lengthM > 0
                                      ? `${item.lengthM}m`
                                      : `${item.qty} EA`}
                                  </td>
                                  <td style={s.tdCost}>-</td>
                                </tr>
                                {combo && combo.items.length > 0 && combo.items.map(({ size, count }) => (
                                  <tr key={`${i}_${size}`} style={s.secRow}>
                                    <td style={s.secName}>└ {item.name} {size}mm</td>
                                    <td style={{ ...s.tdQty, fontSize: 11, fontWeight: 700, color: '#1e4078' }}>{count} EA</td>
                                    <td style={s.tdCost}>-</td>
                                  </tr>
                                ))}
                              </>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 칸막이벽 */}
                  {partitionData.length > 0 && partitionData.map(({ partition, items, total }) => (
                    <div key={partition.id} style={s.surfaceBlock}>
                      <div style={{ ...s.surfaceHeader, borderLeftColor: '#4a9a6a' }}>
                        <span style={s.collapseIconSm}>―</span>
                        <span style={s.surfaceName}>칸막이 {partition.name}</span>
                        <span style={s.surfaceCostHint}>{Math.round(partition.lengthM*1000)}mm × H{Math.round((partition.heightM > 0 ? partition.heightM : room.heightM)*1000)}mm</span>
                        {total > 0 && <span style={{ ...s.surfaceCostHint, marginLeft: 'auto' }}>{Math.round(total).toLocaleString()}원</span>}
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {items.map((item, i) => (
                            <tr key={i} style={s.itemRow}>
                              <td style={s.tdName}>
                                <span style={{ ...s.filmBadge, background: '#4a9a6a' }}>칸막이</span>
                                {item.name}
                                {item.spec ? <span style={s.spec}> {item.spec}</span> : ''}
                              </td>
                              <td style={s.tdQty}>{item.qty > 0 ? `${item.qty} ${item.unit}` : '-'}</td>
                              <td style={s.tdCost}>{item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

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
  card:  {
    background: '#fff', borderRadius: 16, padding: '16px 18px',
    boxShadow: '0 4px 20px rgba(30,64,120,0.1), 0 1px 4px rgba(30,64,120,0.06)',
    border: '1px solid #e8edf5',
  },
  header:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '2px solid #e8edf5', paddingBottom: 10 },
  title: { fontSize: 14, fontWeight: 800, color: '#1e4078', letterSpacing: '-0.2px' },
  pdfBtn:{ fontSize: 11, padding: '6px 12px', background: 'linear-gradient(135deg,#1e4078,#2d62b8)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 6px rgba(30,64,120,0.25)' },
  xlsBtn:{ fontSize: 11, padding: '6px 12px', background: 'linear-gradient(135deg,#166534,#16a34a)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 6px rgba(22,101,52,0.25)' },
  empty: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 28 },

  // 실 블록
  roomBlock:  { marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(30,64,120,0.06)' },
  roomHeader: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', background: 'linear-gradient(135deg,#1a3a6e,#2563c0)', cursor: 'pointer', userSelect: 'none' },
  collapseIcon:{ fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  roomName:   { fontSize: 13, fontWeight: 700, color: '#fff' },
  roomSize:   { flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.45)', marginLeft: 4 },
  roomBody:   { padding: '6px 8px', background: '#f8fafc' },

  // 면 블록
  surfaceBlock:  { marginBottom: 4, border: '1px solid #e8edf5', borderRadius: 6, overflow: 'hidden' },
  surfaceHeader: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: '#f1f5fb', cursor: 'pointer', userSelect: 'none', borderLeft: '3px solid #3b82f6' },
  collapseIconSm:{ fontSize: 9, color: '#94a3b8' },
  surfaceName:   { flex: 1, fontSize: 12, fontWeight: 700, color: '#1e4078' },
  surfaceCostHint:{ fontSize: 10, color: '#94a3b8' },

  // 테이블 공통
  table:  { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  itemRow:    { borderBottom: '1px solid #f1f5f9' },
  itemRowFilm:{ borderBottom: '1px solid #f1f5f9', background: '#fffcf0' },
  secRow:     { borderBottom: '1px dashed #f1f5f9', background: '#fffef5' },
  tdName: { padding: '5px 8px', fontSize: 11, color: '#334155', width: '52%' },
  tdQty:  { padding: '5px 6px', fontSize: 11, textAlign: 'right', color: '#475569', width: '22%' },
  tdCost: { padding: '5px 8px', fontSize: 11, textAlign: 'right', color: '#94a3b8', width: '26%' },
  spec:   { color: '#94a3b8', fontSize: 10 },
  secName:{ padding: '3px 8px 3px 20px', fontSize: 10, color: '#94a3b8', width: '52%' },
  lossTag:{ color: '#ea580c', marginLeft: 6, fontSize: 10 },
  filmBadge:{ fontSize: 9, background: '#3b82f6', color: '#fff', borderRadius: 4, padding: '1px 5px', marginRight: 4 },
  secCount: { color: '#94a3b8', fontSize: 10 },
  secWarn:  { color: '#dc2626', fontSize: 10 },

  // 실 집계 블록
  aggBlock: { marginTop: 6, border: '1px solid #dde8f8', borderRadius: 8, overflow: 'hidden' },
  aggTitle: { padding: '6px 10px', background: '#e8f0fc', fontSize: 11, fontWeight: 700, color: '#1e4078' },
  aggRow:   { borderBottom: '1px solid #f1f5f9' },
  aggRowHL: { borderBottom: '1px solid #eef2f8', background: '#f5f8ff' },
  aggFoot:  { background: '#dde8f8' },
  aggFootLabel: { padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#1e4078', textAlign: 'right' },
  aggFootAmt:   { padding: '6px 8px', fontSize: 11, fontWeight: 700, color: '#1e4078', textAlign: 'right' },

  // 전체 집계 블록
  grandBlock: { marginTop: 12, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(30,64,120,0.2)' },
  grandTitle: { padding: '9px 14px', background: 'linear-gradient(135deg,#1a3a6e,#2563c0)', fontSize: 13, fontWeight: 700, color: '#fff' },
  grandHead:  { background: 'rgba(30,64,120,0.85)' },
  thName: { padding: '6px 8px', fontSize: 11, color: '#bfdbfe', fontWeight: 700, width: '52%' },
  thQty:  { padding: '6px 6px', fontSize: 11, color: '#bfdbfe', fontWeight: 700, textAlign: 'right', width: '22%' },
  thCost: { padding: '6px 8px', fontSize: 11, color: '#bfdbfe', fontWeight: 700, textAlign: 'right', width: '26%' },
  grandFoot:      { background: 'linear-gradient(135deg,#1a3a6e,#1e4078)' },
  grandFootLabel: { padding: '9px 8px', fontSize: 12, fontWeight: 700, color: '#93c5fd', textAlign: 'right' },
  grandFootAmt:   { padding: '9px 10px', fontSize: 15, fontWeight: 800, color: '#fff', textAlign: 'right' },
}
