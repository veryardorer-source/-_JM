import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import SurfaceRow from './SurfaceRow.jsx'

export default function RoomCard({ room }) {
  const { updateRoom, deleteRoom, duplicateRoom, addDoor, updateDoor, deleteDoor, addWall, customMaterials, priceOverrides } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  const upd = (fields) => updateRoom(room.id, fields)

  return (
    <div style={s.card}>
      <div style={s.header}>
        <button onClick={() => setCollapsed(!collapsed)} style={s.collapseBtn}>{collapsed ? '▶' : '▼'}</button>
        <input value={room.name} onChange={e => upd({ name: e.target.value })} style={s.nameInput} />
        <div style={s.dims}>
          <DimField label="가로(m)" value={room.widthM} onChange={v => upd({ widthM: v })} />
          <span style={s.x}>×</span>
          <DimField label="세로(m)" value={room.depthM} onChange={v => upd({ depthM: v })} />
          <span style={s.x}>× H</span>
          <DimField label="마감H(m)" value={room.heightM} onChange={v => upd({ heightM: v })} />
          <span style={s.x}>/ 슬라브H</span>
          <DimField label="슬라브H(m)" value={room.slabHeightM || 0} onChange={v => upd({ slabHeightM: v })} />
        </div>
        <div style={s.acts}>
          <button onClick={() => duplicateRoom(room.id)} style={s.btnGray}>복사</button>
          <button onClick={() => deleteRoom(room.id)} style={s.btnRed}>삭제</button>
        </div>
      </div>

      {!collapsed && (
        <div style={s.body}>
          <div style={s.sfHead}>
            <span style={{ width: 110 }}>면</span>
            <span style={{ width: 140 }}>마감 종류</span>
            <span style={{ flex: 1 }}>세부 설정</span>
            <span style={{ width: 80 }}>개구부</span>
          </div>
          {room.surfaces.map(sf => (
            <SurfaceRow key={sf.id} room={room} sf={sf} />
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0 2px' }}>
            <button onClick={() => addWall(room.id)} style={s.btnAdd}>+ 벽 추가</button>
          </div>

          {/* 도어 */}
          <div style={s.doorSection}>
            <div style={s.doorHeader}>
              <span style={s.doorTitle}>도어</span>
              <button onClick={() => addDoor(room.id)} style={s.btnAdd}>+ 도어 추가</button>
            </div>
            {(room.doors || []).length > 0 && (
              <div style={s.doorTable}>
                <div style={s.doorHead}>
                  <span style={{ width: 90 }}>종류</span>
                  <span style={{ width: 70 }}>폭(m)</span>
                  <span style={{ width: 70 }}>높이(m)</span>
                  <span style={{ width: 50 }}>수량</span>
                  <span style={{ width: 30 }}></span>
                </div>
                {(room.doors || []).map(door => (
                  <div key={door.id} style={s.doorRow}>
                    <select value={door.type} onChange={e => updateDoor(room.id, door.id, { type: e.target.value })} style={{ ...s.doorInput, width: 90 }}>
                      {['방문','ABS도어','강화도어','양문형도어','현관문','미서기문','폴딩도어','중문','기타'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input type="number" min="0" step="0.01" value={door.widthM || ''} onChange={e => updateDoor(room.id, door.id, { widthM: Number(e.target.value) })} style={{ ...s.doorInput, width: 70 }} />
                    <input type="number" min="0" step="0.01" value={door.heightM || ''} onChange={e => updateDoor(room.id, door.id, { heightM: Number(e.target.value) })} style={{ ...s.doorInput, width: 70 }} />
                    <input type="number" min="1" value={door.qty} onChange={e => updateDoor(room.id, door.id, { qty: Number(e.target.value) })} style={{ ...s.doorInput, width: 50 }} />
                    <button onClick={() => deleteDoor(room.id, door.id)} style={s.btnRed}>✕</button>
                  </div>
                ))}
              </div>
            )}
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
      <input type="number" min="0" step="0.01" value={value || ''} placeholder="0"
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 62, textAlign: 'center', border: '1px solid #d0d7e3', borderRadius: 7, padding: '5px 4px', fontSize: 13, background: '#fff' }} />
    </label>
  )
}

const s = {
  card: { background: '#fff', borderRadius: 14, boxShadow: '0 4px 20px rgba(30,64,120,0.08)', overflow: 'hidden', border: '1px solid #e8edf5' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'linear-gradient(135deg,#f4f7fc,#eef2f9)', borderBottom: '1px solid #dde4f0', flexWrap: 'wrap' },
  collapseBtn: { background: 'rgba(30,64,120,0.08)', border: 'none', cursor: 'pointer', fontSize: 11, color: '#1e4078', padding: '3px 6px', borderRadius: 6 },
  nameInput: { fontSize: 14, fontWeight: 700, color: '#1e4078', border: 'none', background: 'transparent', borderBottom: '2px solid #c8d4e8', padding: '2px 4px', width: 130, outline: 'none' },
  dims: { display: 'flex', alignItems: 'center', gap: 4 },
  x: { fontSize: 12, color: '#94a3b8' },
  acts: { marginLeft: 'auto', display: 'flex', gap: 8 },
  btnGray: { fontSize: 11, padding: '4px 12px', background: '#fff', border: '1px solid #d0d7e3', borderRadius: 8, cursor: 'pointer', color: '#64748b' },
  btnRed: { fontSize: 11, padding: '4px 12px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', color: '#dc2626' },
  btnAdd: { fontSize: 11, padding: '4px 12px', background: '#fff', border: '1px solid #d0d7e3', borderRadius: 8, cursor: 'pointer', color: '#1e4078', fontWeight: 600 },
  body: { padding: '12px 14px' },
  sfHead: { display: 'flex', gap: 8, fontSize: 10, color: '#94a3b8', fontWeight: 700, padding: '0 10px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: 8, textTransform: 'uppercase' },
  doorSection: { marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 },
  doorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doorTitle: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  doorTable: { display: 'flex', flexDirection: 'column', gap: 4 },
  doorHead: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700, padding: '0 4px 4px', textTransform: 'uppercase' },
  doorRow: { display: 'flex', gap: 6, alignItems: 'center', background: '#f8faff', borderRadius: 8, padding: '6px 8px', border: '1px solid #e2e8f0' },
  doorInput: { border: '1px solid #d0d7e3', borderRadius: 6, padding: '5px 5px', fontSize: 12, textAlign: 'center', background: '#fff' },
}
