import { useStore } from '../store/useStore.js'
import { LIGHTING_TYPES } from '../data/materials.js'

const LINE_TYPES = ['라인조명 T5', '라인조명 T7']
const LINE_SIZES = [1200, 900, 600, 300]  // mm, 큰 것부터

// 전체 길이(mm) → 각 사이즈별 수량 (그리디)
function calcLineBreakdown(totalMm) {
  const result = {}
  let remaining = Math.round(totalMm)
  for (const size of LINE_SIZES) {
    const count = Math.floor(remaining / size)
    if (count > 0) {
      result[size] = count
      remaining -= count * size
    }
  }
  // 나머지가 있으면 가장 작은 단위(300mm) 1개 추가
  if (remaining > 0) {
    result[300] = (result[300] || 0) + 1
  }
  return result
}

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
          {lightings.map((l) => {
            const isLine = LINE_TYPES.includes(l.type)
            const totalMm = (l.lengthM || 0) * 1000
            const breakdown = isLine ? calcLineBreakdown(totalMm) : null

            return (
              <div key={l.id} style={s.row}>
                <select
                  value={l.type}
                  onChange={e => updateLighting(room.id, l.id, { type: e.target.value })}
                  style={{ ...s.input, width: 130 }}
                >
                  {LIGHTING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>

                {isLine ? (
                  /* T5/T7: 전체 길이 입력 → 사이즈별 수량 표시 */
                  <div style={s.lineWrap}>
                    <label style={s.inlineLabel}>전체길이(mm)
                      <input
                        type="number" min="0" step="100"
                        value={l.lengthM ? Math.round(l.lengthM * 1000) : ''}
                        placeholder="0"
                        onChange={e => updateLighting(room.id, l.id, { lengthM: Number(e.target.value) / 1000 })}
                        style={{ ...s.input, width: 75 }}
                      />
                    </label>
                    {breakdown && Object.keys(breakdown).length > 0 && (
                      <div style={s.breakdown}>
                        {LINE_SIZES.filter(sz => breakdown[sz]).map(sz => (
                          <span key={sz} style={s.sizeBadge}>
                            {sz}mm × {breakdown[sz]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 일반: 규격 + 수량 */
                  <>
                    <input
                      value={l.spec || ''}
                      onChange={e => updateLighting(room.id, l.id, { spec: e.target.value })}
                      placeholder="규격 입력"
                      style={{ ...s.input, flex: 1 }}
                    />
                    <input
                      type="number" min="0" value={l.qty}
                      onChange={e => updateLighting(room.id, l.id, { qty: Number(e.target.value) })}
                      style={{ ...s.input, width: 55, textAlign: 'center' }}
                    />
                  </>
                )}

                <button onClick={() => deleteLighting(room.id, l.id)} style={s.delBtn}>✕</button>
              </div>
            )
          })}
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
  tableWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' },
  input: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '4px 5px', fontSize: 12 },
  inlineLabel: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#888', gap: 2 },
  lineWrap: { display: 'flex', alignItems: 'flex-end', gap: 8, flex: 1, flexWrap: 'wrap' },
  breakdown: { display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 3 },
  sizeBadge: { fontSize: 11, fontWeight: 700, color: '#1e4078', background: '#eef2f8', borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' },
  delBtn: { fontSize: 10, padding: '2px 5px', background: '#fee', border: '1px solid #fcc', borderRadius: 3, cursor: 'pointer', color: '#c00', flexShrink: 0 },
}
