import { useStore } from '../store/useStore.js'
import { LIGHTING_TYPES } from '../data/materials.js'

export default function LightingSection({ room }) {
  const { addLighting, updateLighting, deleteLighting } = useStore()
  const lightings = room.lightings || []

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>조명</span>
        <button onClick={() => addLighting(room.id)} style={s.addBtn}>+ 추가</button>
      </div>
      {lightings.length > 0 && (
        <div style={s.tableWrap}>
          <div style={s.thead}>
            <span style={{ flex: 2 }}>종류</span>
            <span style={{ flex: 2 }}>규격/모델</span>
            <span style={{ width: 55, textAlign: 'center' }}>수량(EA)</span>
            <span style={{ width: 65, textAlign: 'center' }}>길이(m)</span>
            <span style={{ width: 24 }}></span>
          </div>
          {lightings.map((l) => (
            <div key={l.id} style={s.row}>
              <select
                value={l.type}
                onChange={e => updateLighting(room.id, l.id, { type: e.target.value })}
                style={{ ...s.input, flex: 2 }}
              >
                {LIGHTING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input
                value={l.spec}
                onChange={e => updateLighting(room.id, l.id, { spec: e.target.value })}
                placeholder="규격 입력"
                style={{ ...s.input, flex: 2 }}
              />
              <input
                type="number" min="0" value={l.qty}
                onChange={e => updateLighting(room.id, l.id, { qty: Number(e.target.value) })}
                style={{ ...s.input, width: 55, textAlign: 'center' }}
              />
              <input
                type="number" min="0" step="0.1" value={l.lengthM || ''}
                placeholder="0"
                onChange={e => updateLighting(room.id, l.id, { lengthM: Number(e.target.value) })}
                style={{ ...s.input, width: 65, textAlign: 'center' }}
              />
              <button onClick={() => deleteLighting(room.id, l.id)} style={s.delBtn}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { marginTop: 8, borderTop: '1px dashed #dde4f0', paddingTop: 8 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 12, fontWeight: 700, color: '#555' },
  addBtn: { fontSize: 11, padding: '3px 10px', background: '#f0f4fa', border: '1px solid #c8d4e8', borderRadius: 4, cursor: 'pointer', color: '#1e4078', fontWeight: 600 },
  tableWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  thead: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: '#aaa', fontWeight: 600, padding: '0 0 3px' },
  row: { display: 'flex', gap: 6, alignItems: 'center' },
  input: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '4px 5px', fontSize: 12 },
  delBtn: { fontSize: 10, padding: '2px 5px', background: '#fee', border: '1px solid #fcc', borderRadius: 3, cursor: 'pointer', color: '#c00', flexShrink: 0 },
}
