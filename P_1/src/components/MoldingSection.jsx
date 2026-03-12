import { useStore } from '../store/useStore.js'
import { WRAPPING_WIDTHS, WRAPPING_BOARD_LENGTH_M } from '../data/materials.js'

const MOLD_TYPES = ['걸레받이', '천정몰딩', '창틀몰딩', '유리칠판테두리']
const AUTO_TYPES = ['걸레받이', '천정몰딩']

// 몰딩 선형 길이 계산 (m)
export function calcMoldingLengthM(molding, room) {
  switch (molding.moldType) {
    case '걸레받이': {
      if (!molding.autoCalc) return molding.customLengthM || 0
      const doorDeduction = (room.doors || []).reduce((sum, d) => sum + (d.widthM || 0), 0)
      return Math.max(0, (room.widthM + room.depthM) * 2 - doorDeduction)
    }
    case '천정몰딩': {
      if (!molding.autoCalc) return molding.customLengthM || 0
      return (room.widthM + room.depthM) * 2
    }
    case '창틀몰딩':
    case '유리칠판테두리': {
      return ((molding.itemWidthM || 0) + (molding.itemHeightM || 0)) * 2 * (molding.qty || 1)
    }
    default:
      return molding.customLengthM || 0
  }
}

export function calcMoldingEA(lengthM) {
  if (lengthM <= 0) return 0
  return Math.ceil((lengthM / WRAPPING_BOARD_LENGTH_M) * 1.05)
}

export default function MoldingSection({ room }) {
  const { addMolding, updateMolding, deleteMolding } = useStore()
  const moldings = room.moldings || []

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>랩핑평판 (몰딩)</span>
        <div style={s.addBtns}>
          {MOLD_TYPES.map(t => (
            <button key={t} onClick={() => addMolding(room.id, t)} style={s.addBtn}>{t}</button>
          ))}
        </div>
      </div>
      {moldings.length > 0 && (
        <div style={s.tableWrap}>
          <div style={s.thead}>
            <span style={{ width: 90 }}>종류</span>
            <span style={{ width: 60 }}>폭(mm)</span>
            <span style={{ flex: 1 }}>치수 / 길이</span>
            <span style={{ width: 55, textAlign: 'right' }}>선형(m)</span>
            <span style={{ width: 55, textAlign: 'right' }}>EA수</span>
            <span style={{ width: 24 }}></span>
          </div>
          {moldings.map((m) => {
            const lengthM = calcMoldingLengthM(m, room)
            const ea = calcMoldingEA(lengthM)
            const isAuto = AUTO_TYPES.includes(m.moldType)
            return (
              <div key={m.id} style={s.row}>
                <span style={{ ...s.typeBadge, width: 90 }}>{m.moldType}</span>
                <select
                  value={m.widthMm}
                  onChange={e => updateMolding(room.id, m.id, { widthMm: Number(e.target.value) })}
                  style={{ ...s.input, width: 60 }}
                >
                  {WRAPPING_WIDTHS.map(w => <option key={w} value={w}>{w}mm</option>)}
                </select>

                {/* 자동계산 타입 (걸레받이/천정몰딩) */}
                {isAuto && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={s.checkLabel}>
                      <input type="checkbox" checked={m.autoCalc}
                        onChange={e => updateMolding(room.id, m.id, { autoCalc: e.target.checked })} />
                      자동
                    </label>
                    {!m.autoCalc && (
                      <label style={s.inlineLabel}>직접입력(m)
                        <input type="number" min="0" step="0.1" value={m.customLengthM || ''}
                          placeholder="0"
                          onChange={e => updateMolding(room.id, m.id, { customLengthM: Number(e.target.value) })}
                          style={{ ...s.input, width: 70 }} />
                      </label>
                    )}
                    {m.autoCalc && (room.widthM <= 0 || room.depthM <= 0) && (
                      <span style={s.warn}>방 치수 필요</span>
                    )}
                  </div>
                )}

                {/* 치수입력 타입 (창틀/유리칠판) */}
                {!isAuto && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label style={s.inlineLabel}>폭(m)
                      <input type="number" min="0" step="0.01" value={m.itemWidthM || ''}
                        placeholder="0"
                        onChange={e => updateMolding(room.id, m.id, { itemWidthM: Number(e.target.value) })}
                        style={{ ...s.input, width: 60 }} />
                    </label>
                    <label style={s.inlineLabel}>높이(m)
                      <input type="number" min="0" step="0.01" value={m.itemHeightM || ''}
                        placeholder="0"
                        onChange={e => updateMolding(room.id, m.id, { itemHeightM: Number(e.target.value) })}
                        style={{ ...s.input, width: 60 }} />
                    </label>
                    <label style={s.inlineLabel}>수량
                      <input type="number" min="1" value={m.qty || 1}
                        onChange={e => updateMolding(room.id, m.id, { qty: Number(e.target.value) })}
                        style={{ ...s.input, width: 45 }} />
                    </label>
                  </div>
                )}

                <span style={{ width: 55, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#1e4078' }}>
                  {lengthM > 0 ? lengthM.toFixed(2) + 'm' : '-'}
                </span>
                <span style={{ width: 55, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#1e4078' }}>
                  {ea > 0 ? ea + 'EA' : '-'}
                </span>
                <button onClick={() => deleteMolding(room.id, m.id)} style={s.delBtn}>✕</button>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, flexWrap: 'wrap', gap: 6 },
  title: { fontSize: 12, fontWeight: 700, color: '#555' },
  addBtns: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  addBtn: { fontSize: 10, padding: '2px 8px', background: '#f0f4fa', border: '1px solid #c8d4e8', borderRadius: 4, cursor: 'pointer', color: '#1e4078' },
  tableWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  thead: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: '#aaa', fontWeight: 600, padding: '0 0 3px' },
  row: { display: 'flex', gap: 6, alignItems: 'center' },
  typeBadge: { fontSize: 11, fontWeight: 700, color: '#1e4078', background: '#eef2f8', borderRadius: 4, padding: '3px 6px', whiteSpace: 'nowrap', textAlign: 'center' },
  input: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '3px 5px', fontSize: 12 },
  checkLabel: { fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', whiteSpace: 'nowrap', color: '#555' },
  inlineLabel: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#888', gap: 2 },
  warn: { fontSize: 10, color: '#e06000' },
  delBtn: { fontSize: 10, padding: '2px 5px', background: '#fee', border: '1px solid #fcc', borderRadius: 3, cursor: 'pointer', color: '#c00', flexShrink: 0 },
}
