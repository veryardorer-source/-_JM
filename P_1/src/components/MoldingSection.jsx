import { useStore } from '../store/useStore.js'
import { WRAPPING_WIDTHS, WRAPPING_BOARD_LENGTH_M } from '../data/materials.js'

const MOLD_TYPES = ['걸레받이', '천정몰딩', '창틀몰딩', '유리칠판테두리']
const AUTO_TYPES = ['걸레받이', '천정몰딩']  // 면 길이 자동 적용

// 면의 선형 길이(m) 반환
function getSurfaceLinearM(room, sf) {
  switch (sf.direction) {
    case 'floor':
    case 'ceiling':
      return (room.widthM + room.depthM) * 2
    case 'wallA': case 'wallB': case 'wallN': case 'wallS':
      return room.widthM
    case 'wallC': case 'wallD': case 'wallE': case 'wallW':
      return room.depthM
    case 'wallExtra':
      return sf.extraWidthM || 0
    default:
      return 0
  }
}

export function calcMoldingLengthM(molding, room, sf) {
  if (AUTO_TYPES.includes(molding.moldType)) {
    return getSurfaceLinearM(room, sf)
  }
  // 창틀몰딩/유리칠판: (폭+높이)×2×수량
  return ((molding.itemWidthM || 0) + (molding.itemHeightM || 0)) * 2 * (molding.qty || 1)
}

export function calcMoldingEA(lengthM) {
  if (lengthM <= 0) return 0
  return Math.ceil(lengthM / WRAPPING_BOARD_LENGTH_M)
}

// 창틀/칠판 몰딩: 이어붙이기 없이 각 면마다 ceil(길이/2400)
// 상하(가로) × 2 + 좌우(세로) × 2
export function calcFrameMoldingEA(itemWidthM, itemHeightM, qty) {
  const horizontal = Math.ceil((itemWidthM || 0) / WRAPPING_BOARD_LENGTH_M) * 2
  const vertical   = Math.ceil((itemHeightM || 0) / WRAPPING_BOARD_LENGTH_M) * 2
  return (horizontal + vertical) * (qty || 1)
}

export default function MoldingSection({ room, sf }) {
  const { addMolding, updateMolding, deleteMolding } = useStore()
  const moldings = sf.moldings || []

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>래핑몰딩</span>
        <div style={s.addBtns}>
          {MOLD_TYPES.map(t => (
            <button key={t} onClick={() => addMolding(room.id, sf.id, t)} style={s.addBtn}>{t}</button>
          ))}
        </div>
      </div>
      {moldings.length > 0 && (
        <div style={s.rows}>
          {moldings.map((m) => {
            const lengthM = calcMoldingLengthM(m, room, sf)
            const isAuto = AUTO_TYPES.includes(m.moldType)
            const ea = isAuto ? calcMoldingEA(lengthM) : calcFrameMoldingEA(m.itemWidthM, m.itemHeightM, m.qty)
            return (
              <div key={m.id} style={s.row}>
                <span style={s.typeBadge}>{m.moldType}</span>
                <label style={s.inlineLabel}>폭(mm)
                  <select
                    value={m.widthMm}
                    onChange={e => updateMolding(room.id, sf.id, m.id, { widthMm: Number(e.target.value) })}
                    style={s.select}
                  >
                    {WRAPPING_WIDTHS.map(w => <option key={w} value={w}>{w}mm</option>)}
                  </select>
                </label>

                {/* 자동: 면 길이 표시 */}
                {isAuto && (
                  <span style={s.autoLength}>{lengthM > 0 ? `${Math.round(lengthM * 1000)}mm` : '치수 필요'}</span>
                )}

                {/* 수동: 폭×높이×수량 입력 */}
                {!isAuto && (
                  <>
                    <label style={s.inlineLabel}>폭(mm)
                      <input type="number" min="0" step="1" value={m.itemWidthM ? Math.round(m.itemWidthM * 1000) : ''}
                        placeholder="0"
                        onChange={e => updateMolding(room.id, sf.id, m.id, { itemWidthM: Number(e.target.value) / 1000 })}
                        style={s.input} />
                    </label>
                    <label style={s.inlineLabel}>높이(mm)
                      <input type="number" min="0" step="1" value={m.itemHeightM ? Math.round(m.itemHeightM * 1000) : ''}
                        placeholder="0"
                        onChange={e => updateMolding(room.id, sf.id, m.id, { itemHeightM: Number(e.target.value) / 1000 })}
                        style={s.input} />
                    </label>
                    <label style={s.inlineLabel}>수량
                      <input type="number" min="1" value={m.qty || 1}
                        onChange={e => updateMolding(room.id, sf.id, m.id, { qty: Number(e.target.value) })}
                        style={{ ...s.input, width: 45 }} />
                    </label>
                  </>
                )}

                <span style={s.ea}>{ea > 0 ? `${ea} EA` : '-'}</span>
                <button onClick={() => deleteMolding(room.id, sf.id, m.id)} style={s.delBtn}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { marginTop: 6, borderTop: '1px dashed #e8edf5', paddingTop: 6, paddingLeft: 10 },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  title: { fontSize: 11, fontWeight: 700, color: '#555' },
  addBtns: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  addBtn: { fontSize: 10, padding: '2px 8px', background: '#f0f4fa', border: '1px solid #c8d4e8', borderRadius: 4, cursor: 'pointer', color: '#1e4078' },
  rows: { display: 'flex', flexDirection: 'column', gap: 5 },
  row: { display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  typeBadge: { fontSize: 11, fontWeight: 700, color: '#1e4078', background: '#eef2f8', borderRadius: 4, padding: '3px 6px', whiteSpace: 'nowrap', alignSelf: 'flex-end', marginBottom: 2 },
  inlineLabel: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#888', gap: 2 },
  select: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '3px 5px', fontSize: 12 },
  input: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '3px 5px', fontSize: 12, width: 65 },
  autoLength: { fontSize: 12, fontWeight: 600, color: '#1e4078', alignSelf: 'flex-end', paddingBottom: 4 },
  ea: { fontSize: 12, fontWeight: 700, color: '#c44000', alignSelf: 'flex-end', paddingBottom: 4, minWidth: 45 },
  delBtn: { fontSize: 10, padding: '2px 5px', background: '#fee', border: '1px solid #fcc', borderRadius: 3, cursor: 'pointer', color: '#c00', marginBottom: 2 },
}
