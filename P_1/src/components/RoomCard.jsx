import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import SurfaceRow from './SurfaceRow.jsx'
import { calcSurfaceCost } from '../utils/surfaceCost.js'
import LightingSection from './LightingSection.jsx'
import PartitionSection from './PartitionSection.jsx'

const DOOR_TYPES = [
  '방문', 'ABS도어', '강화도어', '양문형도어', '양개문',
  '현관문', '미서기문', '폴딩도어', '중문', '기타',
]

export default function RoomCard({ room }) {
  const { updateRoom, deleteRoom, duplicateRoom, addDoor, updateDoor, deleteDoor, addWall } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  const roomTotal = room.surfaces.reduce((sum, sf) => {
    const r = calcSurfaceCost(room, sf)
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
          <DimField label="가로(mm)" value={room.widthM} onChange={v => upd({ widthM: v })} />
          <span style={styles.x}>×</span>
          <DimField label="세로(mm)" value={room.depthM} onChange={v => upd({ depthM: v })} />
          <span style={styles.x}>× 마감H</span>
          <DimField label="마감H(mm)" value={room.heightM} onChange={v => upd({ heightM: v })} />
          <span style={styles.x}>/ 슬라브H</span>
          <DimField label="슬라브H(mm)" value={room.slabHeightM || 0} onChange={v => upd({ slabHeightM: v })} />
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
                  <span style={{ width: 70 }}>폭(mm)</span>
                  <span style={{ width: 70 }}>높이(mm)</span>
                  <span style={{ width: 50 }}>수량</span>
                  <span style={{ flex: 1 }}>단가(원/짝)</span>
                  <span style={{ width: 30 }}></span>
                </div>
                {(room.doors || []).map(door => (
                  <div key={door.id} style={styles.doorRow}>
                    <select value={door.type} onChange={e => updateDoor(room.id, door.id, { type: e.target.value })} style={{ ...styles.doorInput, width: 90 }}>
                      {DOOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="number" min="0" step="1" value={door.widthM ? Math.round(door.widthM * 1000) : ''}
                      onChange={e => updateDoor(room.id, door.id, { widthM: Number(e.target.value) / 1000 })}
                      style={{ ...styles.doorInput, width: 70 }} />
                    <input type="number" min="0" step="1" value={door.heightM ? Math.round(door.heightM * 1000) : ''}
                      onChange={e => updateDoor(room.id, door.id, { heightM: Number(e.target.value) / 1000 })}
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
        step="1"
        value={value ? Math.round(value * 1000) : ''}
        placeholder="0"
        onChange={e => onChange(Number(e.target.value) / 1000)}
        style={styles.dimInput}
      />
    </label>
  )
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    boxShadow: '0 1px 6px rgba(0,0,0,0.09)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: '#f0f4fa',
    borderBottom: '1px solid #dde4f0',
    flexWrap: 'wrap',
  },
  collapseBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: '#1e4078', padding: 0,
  },
  nameInput: {
    fontSize: 14, fontWeight: 700, color: '#1e4078',
    border: 'none', background: 'transparent',
    borderBottom: '1px solid #c8d4e8',
    padding: '2px 4px', width: 120,
    outline: 'none',
  },
  dims: { display: 'flex', alignItems: 'center', gap: 4 },
  x: { fontSize: 13, color: '#888' },
  dimInput: {
    width: 60, textAlign: 'center',
    border: '1px solid #d0d7e3', borderRadius: 4,
    padding: '4px 4px', fontSize: 13,
  },
  actions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  total: { fontSize: 14, fontWeight: 700, color: '#1e4078' },
  btnGray: {
    fontSize: 11, padding: '3px 10px',
    background: '#eef2f8', border: '1px solid #c8d4e8',
    borderRadius: 4, cursor: 'pointer', color: '#555',
  },
  btnRed: {
    fontSize: 11, padding: '3px 10px',
    background: '#fee', border: '1px solid #fcc',
    borderRadius: 4, cursor: 'pointer', color: '#c00',
  },
  surfaces: { padding: '10px 12px' },
  surfaceHeader: {
    display: 'flex', gap: 8, fontSize: 11, color: '#999',
    fontWeight: 600, padding: '0 10px 6px',
    borderBottom: '1px solid #eee', marginBottom: 6,
  },
  subtotal: {
    display: 'flex', justifyContent: 'space-between',
    padding: '8px 10px', marginTop: 6,
    borderTop: '2px solid #dde4f0',
    fontSize: 13, fontWeight: 700, color: '#1e4078',
  },
  subtotalNum: { fontSize: 14 },

  doorSection: { marginTop: 10, borderTop: '1px dashed #dde4f0', paddingTop: 8 },
  doorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  doorTitle: { fontSize: 12, fontWeight: 700, color: '#555' },
  addDoorBtn: {
    fontSize: 11, padding: '3px 10px',
    background: '#f0f4fa', border: '1px solid #c8d4e8',
    borderRadius: 4, cursor: 'pointer', color: '#1e4078', fontWeight: 600,
  },
  doorTable: { display: 'flex', flexDirection: 'column', gap: 4 },
  doorTableHead: {
    display: 'flex', gap: 6, alignItems: 'center',
    fontSize: 10, color: '#aaa', fontWeight: 600,
    padding: '0 4px 4px',
  },
  doorRow: { display: 'flex', gap: 6, alignItems: 'center' },
  doorInput: {
    border: '1px solid #d0d7e3', borderRadius: 4,
    padding: '4px 5px', fontSize: 12, textAlign: 'center',
  },
}
