import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import SurfaceRow from './SurfaceRow.jsx'
import { calcSurfaceCost } from '../utils/surfaceCost.js'
import LightingSection from './LightingSection.jsx'
import PartitionSection from './PartitionSection.jsx'

export default function RoomCard({ room }) {
  const { updateRoom, deleteRoom, duplicateRoom, addDoor, updateDoor, deleteDoor, addWall, customMaterials, priceOverrides, doorTypes } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const matOpts = { customMaterials, priceOverrides }

  const roomTotal = room.surfaces.reduce((sum, sf) => {
    const r = calcSurfaceCost(room, sf, matOpts)
    return sum + (r?.total || 0)
  }, 0)

  const upd = (fields) => updateRoom(room.id, fields)

  return (
    <div style={styles.card}>
      {/* 헤더 */}
      <div style={styles.header}>
        <button onClick={() => setCollapsed(!collapsed)} style={styles.collapseBtn}>
          {collapsed ? '▶' : '▼'}
        </button>
        <input
          value={room.name}
          onChange={e => upd({ name: e.target.value })}
          style={styles.nameInput}
        />
        <div style={styles.dims}>
          <DimField label="가로(m)" value={room.widthM} onChange={v => upd({ widthM: v })} />
          <span style={styles.x}>×</span>
          <DimField label="세로(m)" value={room.depthM} onChange={v => upd({ depthM: v })} />
          <span style={styles.x}>× 마감H</span>
          <DimField label="마감H(m)" value={room.heightM} onChange={v => upd({ heightM: v })} />
          <span style={styles.x}>/ 슬라브H</span>
          <DimField label="슬라브H(m)" value={room.slabHeightM || 0} onChange={v => upd({ slabHeightM: v })} />
        </div>
        <div style={styles.actions}>
          <span style={styles.total}>{roomTotal.toLocaleString()}원</span>
          <button onClick={() => duplicateRoom(room.id)} style={styles.btnGray} title="복사">복사</button>
          <button onClick={() => deleteRoom(room.id)} style={styles.btnRed} title="삭제">삭제</button>
        </div>
      </div>

      {/* 면 목록 */}
      {!collapsed && (
        <div style={styles.surfaces}>
          <div style={styles.surfaceHeader}>
            <span style={{ width: 110 }}>면</span>
            <span style={{ width: 140 }}>마감재 종류</span>
            <span style={{ flex: 1 }}>세부 설정</span>
            <span style={{ width: 80 }}>개구부</span>
            <span style={{ width: 120, textAlign: 'right' }}>금액</span>
          </div>
          {room.surfaces.map(sf => (
            <SurfaceRow key={sf.id} room={room} sf={sf} />
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0 2px' }}>
            <button onClick={() => addWall(room.id)} style={styles.addDoorBtn}>+ 벽 추가</button>
          </div>

          {/* 도어 섹션 */}
          <div style={styles.doorSection}>
            <div style={styles.doorHeader}>
              <span style={styles.doorTitle}>도어</span>
              <button onClick={() => addDoor(room.id)} style={styles.addDoorBtn}>+ 도어 추가</button>
            </div>
            {(room.doors || []).length > 0 && (
              <div style={styles.doorTable}>
                <div style={styles.doorTableHead}>
                  <span style={{ width: 90 }}>종류</span>
                  <span style={{ width: 70 }}>폭(m)</span>
                  <span style={{ width: 70 }}>높이(m)</span>
                  <span style={{ width: 50 }}>수량</span>
                  <span style={{ flex: 1 }}>단가(원/짝)</span>
                  <span style={{ width: 30 }}></span>
                </div>
                {(room.doors || []).map(door => (
                  <div key={door.id} style={styles.doorCard}>
                    {/* 1행: 기본 치수 */}
                    <div style={styles.doorRow}>
                      <select value={door.type} onChange={e => {
                        const name = e.target.value
                        const found = (doorTypes || []).find(t => (typeof t === 'string' ? t : t.name) === name)
                        const defaultPrice = found && typeof found !== 'string' ? found.defaultPrice : 0
                        updateDoor(room.id, door.id, { type: name, ...(door.unitPrice === 0 && defaultPrice ? { unitPrice: defaultPrice } : {}) })
                      }} style={{ ...styles.doorInput, width: 90 }}>
                        {(doorTypes || []).map(t => {
                          const name = typeof t === 'string' ? t : t.name
                          return <option key={name} value={name}>{name}</option>
                        })}
                      </select>
                      <input type="number" min="0" step="0.01" value={door.widthM || ''}
                        onChange={e => updateDoor(room.id, door.id, { widthM: Number(e.target.value) })}
                        style={{ ...styles.doorInput, width: 70 }} />
                      <input type="number" min="0" step="0.01" value={door.heightM || ''}
                        onChange={e => updateDoor(room.id, door.id, { heightM: Number(e.target.value) })}
                        style={{ ...styles.doorInput, width: 70 }} />
                      <input type="number" min="1" value={door.qty}
                        onChange={e => updateDoor(room.id, door.id, { qty: Number(e.target.value) })}
                        style={{ ...styles.doorInput, width: 50 }} />
                      <input type="number" min="0" value={door.unitPrice || ''}
                        placeholder="단가 입력"
                        onChange={e => updateDoor(room.id, door.id, { unitPrice: Number(e.target.value) })}
                        style={{ ...styles.doorInput, flex: 1 }} />
                      <button onClick={() => deleteDoor(room.id, door.id)} style={styles.btnRed}>✕</button>
                    </div>
                    {/* 2행: 제품 상세 */}
                    <div style={styles.doorDetail}>
                      <input
                        value={door.modelNo || ''}
                        placeholder="제품번호·모델명"
                        onChange={e => updateDoor(room.id, door.id, { modelNo: e.target.value })}
                        style={{ ...styles.doorInput, flex: 2, fontSize: 11 }} />
                      <input
                        value={door.color || ''}
                        placeholder="색상·무늬"
                        onChange={e => updateDoor(room.id, door.id, { color: e.target.value })}
                        style={{ ...styles.doorInput, flex: 1, fontSize: 11 }} />
                      <select
                        value={door.glass || '없음'}
                        onChange={e => updateDoor(room.id, door.id, { glass: e.target.value })}
                        style={{ ...styles.doorInput, width: 100, fontSize: 11 }}>
                        <option>없음</option>
                        <option>일반유리</option>
                        <option>강화유리</option>
                        <option>반투명유리</option>
                        <option>기타유리</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 신규 칸막이벽 */}
          <PartitionSection room={room} />

          {/* 조명 – 실 하단 */}
          <LightingSection room={room} />

          <div style={styles.subtotal}>
            <span>소계</span>
            <span style={styles.subtotalNum}>{roomTotal.toLocaleString()}원</span>
          </div>
        </div>
      )}
    </div>
  )
}

function DimField({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 9, color: '#aaa' }}>{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value || ''}
        placeholder="0"
        onChange={e => onChange(Number(e.target.value))}
        style={styles.dimInput}
      />
    </label>
  )
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    boxShadow: '0 4px 20px rgba(30,64,120,0.08), 0 1px 4px rgba(30,64,120,0.06)',
    overflow: 'hidden',
    border: '1px solid #e8edf5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #f4f7fc 0%, #eef2f9 100%)',
    borderBottom: '1px solid #dde4f0',
    flexWrap: 'wrap',
  },
  collapseBtn: {
    background: 'rgba(30,64,120,0.08)', border: 'none', cursor: 'pointer',
    fontSize: 11, color: '#1e4078', padding: '3px 6px', borderRadius: 6,
  },
  nameInput: {
    fontSize: 14, fontWeight: 700, color: '#1e4078',
    border: 'none', background: 'transparent',
    borderBottom: '2px solid #c8d4e8',
    padding: '2px 4px', width: 130,
    outline: 'none',
  },
  dims: { display: 'flex', alignItems: 'center', gap: 4 },
  x: { fontSize: 12, color: '#94a3b8' },
  dimInput: {
    width: 62, textAlign: 'center',
    border: '1px solid #d0d7e3', borderRadius: 7,
    padding: '5px 4px', fontSize: 13,
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  actions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  total: {
    fontSize: 14, fontWeight: 700, color: '#1e4078',
    background: 'rgba(30,64,120,0.07)',
    padding: '4px 10px', borderRadius: 10,
  },
  btnGray: {
    fontSize: 11, padding: '4px 12px',
    background: '#fff', border: '1px solid #d0d7e3',
    borderRadius: 8, cursor: 'pointer', color: '#64748b',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  btnRed: {
    fontSize: 11, padding: '4px 12px',
    background: '#fff', border: '1px solid #fca5a5',
    borderRadius: 8, cursor: 'pointer', color: '#dc2626',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  surfaces: { padding: '12px 14px' },
  surfaceHeader: {
    display: 'flex', gap: 8, fontSize: 10, color: '#94a3b8',
    fontWeight: 700, padding: '0 10px 8px',
    borderBottom: '1px solid #f1f5f9', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  subtotal: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', marginTop: 8,
    borderTop: '1px solid #e2e8f0',
    background: 'linear-gradient(135deg, #f8faff, #f0f5ff)',
    borderRadius: '0 0 4px 4px',
    fontSize: 13, fontWeight: 700, color: '#1e4078',
  },
  subtotalNum: { fontSize: 15, color: '#1e4078' },

  doorSection: { marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 },
  doorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doorTitle: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  addDoorBtn: {
    fontSize: 11, padding: '4px 12px',
    background: '#fff', border: '1px solid #d0d7e3',
    borderRadius: 8, cursor: 'pointer', color: '#1e4078', fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  doorTable: { display: 'flex', flexDirection: 'column', gap: 6 },
  doorCard: {
    display: 'flex', flexDirection: 'column', gap: 4,
    background: '#f8faff', borderRadius: 8, padding: '6px 8px',
    border: '1px solid #e2e8f0',
  },
  doorDetail: { display: 'flex', gap: 6, alignItems: 'center', paddingLeft: 2 },
  doorTableHead: {
    display: 'flex', gap: 6, alignItems: 'center',
    fontSize: 10, color: '#94a3b8', fontWeight: 700,
    padding: '0 4px 6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  doorRow: { display: 'flex', gap: 6, alignItems: 'center' },
  doorInput: {
    border: '1px solid #d0d7e3', borderRadius: 6,
    padding: '5px 5px', fontSize: 12, textAlign: 'center',
    background: '#fff',
  },
}
