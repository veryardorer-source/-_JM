import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { calcSurfaceCost } from '../utils/surfaceCost.js'
import { calcLinearCombo } from '../utils/calculations.js'

function expandLightings(lightings) {
  const items = []
  for (const l of (lightings || [])) {
    if (!l.name || (!l.qty && !l.totalLengthMm)) continue
    const isLine = l.name === '라인조명 T5' || l.name === '라인조명 T7'
    if (isLine && l.totalLengthMm > 0) {
      const combo = calcLinearCombo(l.totalLengthMm)
      combo.items.forEach(c => {
        items.push({
          name: `${l.name} ${c.size}mm`,
          qty: c.count,
          unit: 'EA',
          isLighting: true,
        })
      })
    } else if (l.qty > 0) {
      items.push({
        name: l.spec ? `${l.name} (${l.spec})` : l.name,
        qty: l.qty,
        unit: 'EA',
        isLighting: true,
      })
    }
  }
  return items
}

const DIR_LABEL = { wallA: '벽A', wallB: '벽B', wallC: '벽C', wallD: '벽D', floor: '바닥', ceiling: '천장', wallExtra: '추가벽' }

function aggregateItems(itemsList) {
  const map = {}
  itemsList.forEach(item => {
    if (item.isFilm) {
      const key = `${item.name}__m`
      if (!map[key]) map[key] = { name: item.name, qty: 0, unit: 'm', isFilm: true }
      map[key].qty = Math.round((map[key].qty + (item.qty || 0)) * 10) / 10
    } else {
      const key = `${item.name}__${item.unit}`
      if (!map[key]) map[key] = { name: item.name, qty: 0, unit: item.unit }
      map[key].qty += item.qty || 0
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

export default function QuantityPanel() {
  const { rooms, customMaterials, priceOverrides } = useStore()
  const matOpts = { customMaterials, priceOverrides }
  const [collapsedRooms, setCollapsedRooms] = useState({})

  const roomData = rooms.map(room => {
    const surfaceData = room.surfaces
      .filter(sf => sf.enabled && sf.finishType && sf.finishType !== 'none')
      .map(sf => {
        const result = calcSurfaceCost(room, sf, matOpts)
        if (!result || result.items.length === 0) return null
        return { sf, items: result.items }
      })
      .filter(Boolean)

    const doorItems = (room.doors || [])
      .filter(d => d.qty > 0)
      .map(d => ({
        name: `${d.type} ${Math.round(d.widthM * 1000)}×${Math.round(d.heightM * 1000)}mm`,
        qty: d.qty,
        unit: '짝',
        isDoor: true,
      }))

    const lightingItems = expandLightings(room.lightings)

    const extraItems = (room.extras || [])
      .filter(e => e.name && e.qty > 0)
      .map(e => ({
        name: e.spec ? `${e.name} (${e.spec})` : e.name,
        qty: e.qty,
        unit: e.unit || 'EA',
        isExtra: true,
      }))

    const allItems = [...surfaceData.flatMap(d => d.items), ...doorItems, ...lightingItems, ...extraItems]
    const roomAggregate = aggregateItems(allItems)
    return { room, surfaceData, doorItems, lightingItems, extraItems, roomAggregate }
  }).filter(r => r.surfaceData.length > 0 || r.doorItems.length > 0 || r.lightingItems.length > 0 || r.extraItems.length > 0)

  const grandAggregate = aggregateItems(roomData.flatMap(r => r.roomAggregate))
  const toggleRoom = (id) => setCollapsedRooms(p => ({ ...p, [id]: !p[id] }))

  return (
    <div style={s.card}>
      <div style={s.header}>
        <h2 style={s.title}>자재 물량 집계</h2>
      </div>

      {roomData.length === 0 ? (
        <p style={s.empty}>공간을 추가하고 마감재를 선택하면 집계됩니다.</p>
      ) : (
        <>
          {roomData.map(({ room, surfaceData, doorItems, lightingItems, extraItems, roomAggregate }) => (
            <div key={room.id} style={s.roomBlock}>
              <div style={s.roomHeader} onClick={() => toggleRoom(room.id)}>
                <span style={s.collapseIcon}>{collapsedRooms[room.id] ? '▶' : '▼'}</span>
                <span style={s.roomName}>{room.name}</span>
                {room.widthM > 0 && room.depthM > 0 && (
                  <span style={s.roomSize}>{Math.round(room.widthM*1000)}×{Math.round(room.depthM*1000)}×H{Math.round(room.heightM*1000)}</span>
                )}
              </div>

              {!collapsedRooms[room.id] && (
                <div style={s.roomBody}>
                  {surfaceData.map(({ sf, items }) => (
                    <div key={sf.id} style={s.sfBlock}>
                      <div style={s.sfHeader}>
                        <span style={s.sfName}>{DIR_LABEL[sf.direction] || sf.label}</span>
                        <span style={s.sfLabel}>{sf.label !== (DIR_LABEL[sf.direction] || '') ? sf.label : ''}</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {items.map((item, i) => (
                            <ItemRow key={i} item={item} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                  {doorItems.length > 0 && (
                    <div style={s.sfBlock}>
                      <div style={{ ...s.sfHeader, borderLeftColor: '#7b5ea7' }}>
                        <span style={s.sfName}>도어</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {doorItems.map((item, i) => (
                            <tr key={i} style={s.row}>
                              <td style={s.tdName}><span style={{ ...s.badge, background: '#7b5ea7' }}>도어</span>{item.name}</td>
                              <td style={s.tdQty}>{item.qty} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {lightingItems.length > 0 && (
                    <div style={s.sfBlock}>
                      <div style={{ ...s.sfHeader, borderLeftColor: '#eab308' }}>
                        <span style={s.sfName}>조명</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {lightingItems.map((item, i) => (
                            <tr key={i} style={s.row}>
                              <td style={s.tdName}><span style={{ ...s.badge, background: '#eab308' }}>조명</span>{item.name}</td>
                              <td style={s.tdQty}>{item.qty} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {extraItems.length > 0 && (
                    <div style={s.sfBlock}>
                      <div style={{ ...s.sfHeader, borderLeftColor: '#16a34a' }}>
                        <span style={s.sfName}>추가항목</span>
                      </div>
                      <table style={s.table}>
                        <tbody>
                          {extraItems.map((item, i) => (
                            <tr key={i} style={s.row}>
                              <td style={s.tdName}><span style={{ ...s.badge, background: '#16a34a' }}>추가</span>{item.name}</td>
                              <td style={s.tdQty}>{fmtQty(item.qty, item.unit)} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={s.aggBlock}>
                    <div style={s.aggTitle}>{room.name} 합계</div>
                    <table style={s.table}>
                      <tbody>
                        {roomAggregate.map((item, i) => (
                          <tr key={i} style={s.aggRow}>
                            <td style={s.tdName}>
                              {item.isFilm && <span style={s.badge}>필름</span>}
                              <strong>{item.name}</strong>
                            </td>
                            <td style={{ ...s.tdQty, fontWeight: 700, color: '#1e4078' }}>
                              {fmtQty(item.qty, item.unit)} {item.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={s.grandBlock}>
            <div style={s.grandTitle}>전체 자재 합계</div>
            <table style={s.table}>
              <thead>
                <tr style={s.grandHead}>
                  <th style={s.thName}>자재명</th>
                  <th style={s.thQty}>수량</th>
                </tr>
              </thead>
              <tbody>
                {grandAggregate.map((item, i) => (
                  <tr key={i} style={s.grandRow}>
                    <td style={s.tdName}>
                      {item.isFilm && <span style={s.badge}>필름</span>}
                      <strong>{item.name}</strong>
                    </td>
                    <td style={{ ...s.tdQty, fontWeight: 800, fontSize: 13, color: '#1e4078' }}>
                      {fmtQty(item.qty, item.unit)} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ItemRow({ item }) {
  if (item.isFilm) {
    return (
      <>
        <tr style={s.rowFilm}>
          <td style={s.tdName}>
            <strong>{item.name}</strong>
            {item.sections?.length > 0
              ? <span style={{ color: '#94a3b8', fontSize: 10 }}> {item.sections.length}구간</span>
              : <span style={{ color: '#dc2626', fontSize: 10 }}> 구간 미입력</span>}
          </td>
          <td style={{ ...s.tdQty, fontWeight: 700, color: '#1e4078' }}>
            {item.qty > 0 ? `${item.qty.toFixed(1)}m` : '-'}
          </td>
        </tr>
        {item.sections?.map((sec, i) => (
          <tr key={i} style={s.secRow}>
            <td style={s.secName}>└ {i+1}. 폭{sec.widthMm}mm{sec.patternRepeatMm > 0 ? ` 패턴${sec.patternRepeatMm}` : ''} <span style={{ color: '#ea580c' }}>로스{sec.lossM}m</span></td>
            <td style={{ ...s.tdQty, fontSize: 10 }}>{sec.sectionM}m</td>
          </tr>
        ))}
      </>
    )
  }
  return (
    <tr style={s.row}>
      <td style={s.tdName}>{item.name}{item.spec ? <span style={{ color: '#94a3b8', fontSize: 10 }}> {item.spec}</span> : ''}</td>
      <td style={s.tdQty}>{fmtQty(item.qty, item.unit)} {item.unit}</td>
    </tr>
  )
}

const s = {
  card: { background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(30,64,120,0.1)', border: '1px solid #e8edf5' },
  header: { padding: '12px 16px', borderBottom: '2px solid #e8edf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: 800, color: '#1e4078' },
  empty: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 28 },
  roomBlock: { marginBottom: 2, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', margin: 8 },
  roomHeader: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'linear-gradient(135deg,#1a3a6e,#2563c0)', cursor: 'pointer' },
  collapseIcon: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  roomName: { fontSize: 13, fontWeight: 700, color: '#fff' },
  roomSize: { flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 },
  roomBody: { padding: '6px 8px', background: '#f8fafc' },
  sfBlock: { marginBottom: 4, border: '1px solid #e8edf5', borderRadius: 6, overflow: 'hidden' },
  sfHeader: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#f1f5fb', borderLeft: '3px solid #3b82f6' },
  sfName: { fontSize: 12, fontWeight: 700, color: '#1e4078' },
  sfLabel: { fontSize: 10, color: '#94a3b8' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  row: { borderBottom: '1px solid #f1f5f9' },
  rowFilm: { borderBottom: '1px solid #f1f5f9', background: '#fffcf0' },
  secRow: { background: '#fffef5' },
  tdName: { padding: '5px 8px', fontSize: 11, color: '#334155', width: '65%' },
  tdQty: { padding: '5px 8px', fontSize: 11, textAlign: 'right', color: '#475569', width: '35%' },
  secName: { padding: '3px 8px 3px 20px', fontSize: 10, color: '#94a3b8' },
  badge: { fontSize: 9, background: '#3b82f6', color: '#fff', borderRadius: 4, padding: '1px 5px', marginRight: 4 },
  aggBlock: { marginTop: 6, border: '1px solid #dde8f8', borderRadius: 8, overflow: 'hidden' },
  aggTitle: { padding: '5px 10px', background: '#e8f0fc', fontSize: 11, fontWeight: 700, color: '#1e4078' },
  aggRow: { borderBottom: '1px solid #f1f5f9' },
  grandBlock: { margin: 8, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(30,64,120,0.2)' },
  grandTitle: { padding: '9px 14px', background: 'linear-gradient(135deg,#1a3a6e,#2563c0)', fontSize: 13, fontWeight: 700, color: '#fff' },
  grandHead: { background: 'rgba(30,64,120,0.85)' },
  thName: { padding: '6px 8px', fontSize: 11, color: '#bfdbfe', fontWeight: 700, width: '65%', textAlign: 'left' },
  thQty: { padding: '6px 8px', fontSize: 11, color: '#bfdbfe', fontWeight: 700, textAlign: 'right', width: '35%' },
  grandRow: { borderBottom: '1px solid #e8edf5' },
}
