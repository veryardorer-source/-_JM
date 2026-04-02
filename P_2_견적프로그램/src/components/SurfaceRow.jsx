import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { FINISH_TYPES, SEOKGO, MDF, HAPAN, WALLPAPER, TILE, FLOORING, TEX, INSULATION, WRAPPING } from '../data/materials.js'
import { calcSurfaceCost, getSurfaceDimensions } from '../utils/surfaceCost.js'
import { calcFilmSections } from '../utils/calculations.js'

// ── 하부 마감 편집기 (분리 시공 - 필름/도배/도장/템파보드) ──────────────────────────
const LOWER_FINISH_TYPES = [
  { id: 'film',       label: '인테리어필름' },
  { id: 'wallpaper',  label: '도배' },
  { id: 'paint',      label: '도장(페인트)' },
  { id: 'tempaboard', label: '템파보드(MDF마감)' },
]

function LowerFinishEditor({ room, sf, upd }) {
  const { customMaterials, priceOverrides } = useStore()
  const lowerType = sf.lowerFinishType || 'film'
  const lowerSections = sf.lowerFilmSections || []
  const lowerHMm = sf.lowerHeightMm || 0
  const { sectionResults } = calcFilmSections(lowerSections, lowerHMm, sf.lowerFilmPricePerM || 0)
  const [bulkInput, setBulkInput] = useState('')

  const addSec = () => {
    upd({ lowerFilmSections: [...lowerSections, {
      id: `lfs_${Date.now()}_${Math.random()}`,
      label: `구간${lowerSections.length + 1}`,
      widthMm: 600, patternRepeatMm: 0, heightOverrideMm: 0, filmName: '', pricePerM: 0,
    }] })
  }
  const updSec = (id, fields) => upd({ lowerFilmSections: lowerSections.map(s => s.id === id ? { ...s, ...fields } : s) })
  const delSec = (id) => upd({ lowerFilmSections: lowerSections.filter(s => s.id !== id) })
  const handleBulk = () => {
    const widths = bulkInput.split(/[,\s]+/).map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v > 0)
    if (!widths.length) return
    upd({ lowerFilmSections: [...lowerSections, ...widths.map((w, i) => ({
      id: `lfs_${Date.now()}_${i}_${Math.random()}`, label: `구간${lowerSections.length + i + 1}`,
      widthMm: w, patternRepeatMm: 0, heightOverrideMm: 0, filmName: '', pricePerM: 0,
    }))] })
    setBulkInput('')
  }

  return (
    <div style={lf.wrap}>
      {/* 공통 헤더 */}
      <div style={lf.header}>
        <span style={lf.title}>▼ 하부 마감</span>
        <label style={lf.label}>마감 종류
          <select value={lowerType} onChange={e => upd({ lowerFinishType: e.target.value })} style={lf.select}>
            {LOWER_FINISH_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label style={lf.label}>높이(mm)
          <input type="number" min="0" value={sf.lowerHeightMm || ''}
            onChange={e => upd({ lowerHeightMm: Number(e.target.value) })}
            style={{ ...lf.input, width: 70 }} placeholder="예)900" />
        </label>

        {/* 필름/템파보드: MDF 종류 */}
        {['film', 'tempaboard'].includes(lowerType) && (
          <label style={lf.label}>MDF 종류
            <select value={sf.lowerMdfId || 'mdf_9'} onChange={e => upd({ lowerMdfId: e.target.value })} style={lf.select}>
              {[...MDF, ...customMaterials.filter(m => m.category === 'mdf')].map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        )}

        {/* 필름: 기본 단가 */}
        {lowerType === 'film' && (
          <label style={lf.label}>기본단가(원/m)
            <input type="number" min="0" value={sf.lowerFilmPricePerM || ''}
              onChange={e => upd({ lowerFilmPricePerM: Number(e.target.value) })}
              style={{ ...lf.input, width: 80 }} placeholder="0" />
          </label>
        )}

        {/* 도배: 도배지 선택 */}
        {lowerType === 'wallpaper' && (
          <>
            <label style={lf.label}>석고보드
              <select value={sf.lowerSeokgoId || SEOKGO[0]?.id} onChange={e => upd({ lowerSeokgoId: e.target.value })} style={lf.select}>
                {[...SEOKGO, ...customMaterials.filter(m => m.category === 'seokgo')].map(s => (
                  <option key={s.id} value={s.id}>{s.name.replace('900×1800×', '')}</option>
                ))}
              </select>
            </label>
            <label style={lf.label}>도배지
              <select value={sf.lowerWallpaperId || ''} onChange={e => upd({ lowerWallpaperId: e.target.value })} style={lf.select}>
                {[...WALLPAPER, ...customMaterials.filter(m => m.category === 'wallpaper')]
                  .filter(w => !w.forCeiling)
                  .map(w => {
                    const price = priceOverrides[w.id] ?? w.pricePerRoll
                    return <option key={w.id} value={w.id}>{w.company ? `[${w.company}] ` : ''}{w.name} ({price.toLocaleString()}원/롤)</option>
                  })}
              </select>
            </label>
          </>
        )}

        {/* 도장: 단가 입력 */}
        {lowerType === 'paint' && (
          <>
            <label style={lf.label}>석고보드
              <select value={sf.lowerSeokgoId || SEOKGO[0]?.id} onChange={e => upd({ lowerSeokgoId: e.target.value })} style={lf.select}>
                {[...SEOKGO, ...customMaterials.filter(m => m.category === 'seokgo')].map(s => (
                  <option key={s.id} value={s.id}>{s.name.replace('900×1800×', '')}</option>
                ))}
              </select>
            </label>
            <label style={lf.label}>도장 단가(원/㎡)
              <input type="number" min="0" value={sf.lowerPaintPricePerSqm || ''}
                onChange={e => upd({ lowerPaintPricePerSqm: Number(e.target.value) })}
                style={{ ...lf.input, width: 90 }} placeholder="0" />
            </label>
          </>
        )}
      </div>

      {/* 필름 구간 입력 */}
      {lowerType === 'film' && (
        <>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#888' }}>폭 목록(mm):</span>
            <input value={bulkInput} onChange={e => setBulkInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBulk()}
              placeholder="예) 1000, 800, 600" style={{ ...lf.input, width: 200 }} />
            <button onClick={handleBulk} style={lf.btnSmall}>구간 생성</button>
            <button onClick={addSec} style={lf.btnSmall}>+ 1개 추가</button>
          </div>
          {lowerSections.length > 0 && (
            <table style={lf.table}>
              <thead>
                <tr style={{ background: '#f0f4fb' }}>
                  {['#','필름명','폭(mm)','패턴(mm)','단가(/m)','소요(m)','금액',''].map((h,i) => (
                    <th key={i} style={lf.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowerSections.map((sec, i) => {
                  const res = sectionResults.find(r => r.id === sec.id)
                  return (
                    <tr key={sec.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                      <td style={lf.td}>{i + 1}</td>
                      <td style={lf.td}><input value={sec.filmName || ''} onChange={e => updSec(sec.id, { filmName: e.target.value })} style={{ ...lf.inputTiny, width: 80, textAlign: 'left' }} placeholder="필름명" /></td>
                      <td style={lf.td}><input type="number" value={sec.widthMm} onChange={e => updSec(sec.id, { widthMm: Number(e.target.value) })} style={lf.inputTiny} /></td>
                      <td style={lf.td}><input type="number" value={sec.patternRepeatMm} onChange={e => updSec(sec.id, { patternRepeatMm: Number(e.target.value) })} style={lf.inputTiny} /></td>
                      <td style={lf.td}><input type="number" value={sec.pricePerM || ''} placeholder={sf.lowerFilmPricePerM || '0'} onChange={e => updSec(sec.id, { pricePerM: Number(e.target.value) })} style={lf.inputTiny} /></td>
                      <td style={{ ...lf.td, fontWeight: 600, color: '#1e4078' }}>{res ? res.sectionM : '-'}m</td>
                      <td style={{ ...lf.td, color: '#333' }}>{res && res.sectionCost > 0 ? Math.round(res.sectionCost).toLocaleString() : '-'}</td>
                      <td style={lf.td}><button onClick={() => delSec(sec.id)} style={lf.btnDel}>✕</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
const lf = {
  wrap: { padding: '8px 14px 10px', background: '#fffbf0', borderTop: '1px dashed #e8c87a' },
  header: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 },
  title: { fontSize: 12, fontWeight: 700, color: '#8b5e00', marginRight: 4, alignSelf: 'center' },
  label: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#888', gap: 2 },
  input: { border: '1px solid #d0c090', borderRadius: 4, padding: '3px 5px', fontSize: 11, background: '#fff' },
  select: { border: '1px solid #d0c090', borderRadius: 4, padding: '3px 5px', fontSize: 11, background: '#fff' },
  btnSmall: { fontSize: 11, padding: '3px 10px', background: '#8b5e00', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 6 },
  th: { padding: '4px 6px', color: '#666', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #e8d8a0' },
  td: { padding: '3px 5px', textAlign: 'center' },
  inputTiny: { border: '1px solid #d0d7e3', borderRadius: 3, padding: '2px 4px', fontSize: 11, width: 60, textAlign: 'right' },
  btnDel: { background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 12 },
}

const WRAPPING_PURPOSES = ['걸레받이', '천정몰딩', '창틀', '칠판몰딩', '문틀', '코너몰딩', '기타']

export default function SurfaceRow({ room, sf }) {
  const { updateSurface, addFilmSection, updateFilmSection, deleteFilmSection, deleteSurface,
    customMaterials, priceOverrides,
    addCustomItem, updateCustomItem, deleteCustomItem,
    addWrapping, updateWrapping, deleteWrapping,
  } = useStore()

  const upd = (fields) => updateSurface(room.id, sf.id, fields)
  const matOpts = { customMaterials, priceOverrides }
  const result = calcSurfaceCost(room, sf, matOpts)
  const { areaSqm } = getSurfaceDimensions(room, sf)

  const isCeiling = sf.direction === 'ceiling'
  const isFloor = sf.direction === 'floor'
  const isExtra = sf.direction === 'wallExtra'
  const isWall = !isFloor && !isCeiling

  return (
    <div style={styles.surfaceBlock}><div style={styles.row}>
      {/* 면 라벨 */}
      <div style={styles.labelCell}>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={sf.enabled}
            onChange={e => upd({ enabled: e.target.checked })} />
          <input
            value={sf.label}
            onChange={e => upd({ label: e.target.value })}
            style={{ fontWeight: 600, fontSize: 13, color: '#1e4078', border: 'none', background: 'transparent', borderBottom: '1px solid #c8d4e8', width: 60, outline: 'none' }}
          />
          {isExtra && (
            <button onClick={() => deleteSurface(room.id, sf.id)} style={{ ...styles.btnDel, marginLeft: 4, fontSize: 9, padding: '1px 4px' }}>✕</button>
          )}
        </label>
        {/* 추가 벽: 치수 직접 입력 */}
        {isExtra ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 3 }}>
            <input type="number" min="0" step="1" value={sf.extraWidthM ? Math.round(sf.extraWidthM * 1000) : ''}
              placeholder="폭(mm)" onChange={e => upd({ extraWidthM: Number(e.target.value) / 1000 })}
              style={{ width: 60, border: '1px solid #d0d7e3', borderRadius: 3, padding: '2px 4px', fontSize: 11 }} />
            <span style={{ fontSize: 10, color: '#888' }}>×</span>
            <input type="number" min="0" step="1" value={sf.extraHeightM ? Math.round(sf.extraHeightM * 1000) : ''}
              placeholder={`H${Math.round(room.heightM * 1000)}`} onChange={e => upd({ extraHeightM: Number(e.target.value) / 1000 })}
              style={{ width: 60, border: '1px solid #d0d7e3', borderRadius: 3, padding: '2px 4px', fontSize: 11 }} />
            <span style={styles.areaBadge}>{areaSqm.toFixed(2)}㎡</span>
          </div>
        ) : (
          <span style={styles.areaBadge}>{areaSqm.toFixed(2)}㎡</span>
        )}
      </div>

      {/* 마감재 타입 선택 */}
      <div style={styles.cell}>
        <select value={sf.finishType} onChange={e => {
          const ft = e.target.value
          upd({ finishType: ft })
        }} style={styles.select}>
          {FINISH_TYPES.filter(ft => {
            if (isFloor) return ['flooring', 'tile', 'none'].includes(ft.id)
            if (isCeiling) return ['wallpaper', 'paint', 'tex', 'none'].includes(ft.id)
            return !['tex', 'flooring'].includes(ft.id)
          }).map(ft => (
            <option key={ft.id} value={ft.id}>{ft.label}</option>
          ))}
        </select>
      </div>

      {/* 마감재 세부 선택 */}
      <div style={styles.detailCell}>
        {sf.finishType === 'wallpaper' && (
          <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.select}>
            {[...WALLPAPER, ...customMaterials.filter(m => m.category === 'wallpaper')]
              .filter(w => isCeiling ? w.forCeiling : !w.forCeiling)
              .map(w => {
                const price = priceOverrides[w.id] ?? w.pricePerRoll
                return <option key={w.id} value={w.id}>{w.company ? `[${w.company}] ` : ''}{w.name} ({price.toLocaleString()}원/롤)</option>
              })}
          </select>
        )}
        {sf.finishType === 'tile' && (
          <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.select}>
            {[...TILE, ...customMaterials.filter(m => m.category === 'tile')].map(t => {
              const price = priceOverrides[t.id] ?? t.pricePerBox
              return <option key={t.id} value={t.id}>{t.company ? `[${t.company}] ` : ''}{t.name} ({price.toLocaleString()}원/BOX)</option>
            })}
          </select>
        )}
        {sf.finishType === 'flooring' && (
          <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.select}>
            {[...FLOORING, ...customMaterials.filter(m => m.category === 'flooring')].map(f => {
              const price = priceOverrides[f.id] ?? f.pricePerUnit
              return <option key={f.id} value={f.id}>{f.company ? `[${f.company}] ` : ''}{f.name} ({price.toLocaleString()}원/{f.unit})</option>
            })}
          </select>
        )}
        {sf.finishType === 'tex' && (
          <div style={styles.filmOptions}>
            <label style={styles.inlineLabel}>텍스 규격
              <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.selectSm}>
                {TEX.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label style={styles.inlineLabel}>단가(원/BOX)
              <input type="number" min="0" value={sf.texPricePerBox || ''}
                placeholder="단가 입력"
                onChange={e => upd({ texPricePerBox: Number(e.target.value) })}
                style={styles.inputSm} />
            </label>
          </div>
        )}
        {sf.finishType === 'film' && (
          <FilmSectionEditor room={room} sf={sf}
            addFilmSection={addFilmSection}
            updateFilmSection={updateFilmSection}
            deleteFilmSection={deleteFilmSection}
            upd={upd} />
        )}
        {sf.finishType === 'paint' && (
          <label style={styles.inlineLabel}>도장 단가(원/㎡)
            <input type="number" min="0" value={sf.paintPricePerSqm || ''}
              placeholder="단가 입력"
              onChange={e => upd({ paintPricePerSqm: Number(e.target.value) })}
              style={styles.inputSm} />
          </label>
        )}
        {sf.finishType === 'none' && (
          <>
            <label style={styles.inlineLabel}>석고보드
              <select value={sf.noneSeokgoType || 'none'}
                onChange={e => upd({ noneSeokgoType: e.target.value })}
                style={styles.selectSm}>
                <option value="none">없음</option>
                {[...SEOKGO, ...customMaterials.filter(m => m.category === 'seokgo')].map(s => (
                  <option key={s.id} value={s.id}>{s.name.replace('900×1800×', '')}</option>
                ))}
              </select>
            </label>
            <label style={styles.inlineLabel}>합판
              <select value={sf.noneHapanId || 'none'}
                onChange={e => upd({ noneHapanId: e.target.value })}
                style={styles.selectSm}>
                <option value="none">없음</option>
                {[...HAPAN, ...customMaterials.filter(m => m.category === 'hapan')].map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {['wallpaper', 'paint', 'tile'].includes(sf.finishType) && (
          <label style={styles.inlineLabel}>석고보드
            <select value={sf.seokgoType}
              onChange={e => upd({ seokgoType: e.target.value })}
              style={styles.selectSm}
              disabled={sf.finishType === 'tile'}>
              {[...SEOKGO, ...customMaterials.filter(m => m.category === 'seokgo')].map(s => (
                <option key={s.id} value={s.id}>{s.company ? `[${s.company}] ` : ''}{s.name.replace('900×1800×', '')}</option>
              ))}
            </select>
          </label>
        )}
        {/* 벽 종류 (벽면만) */}
        {isWall && sf.finishType !== 'none' && (
          <label style={styles.inlineLabel}>벽 종류
            <select value={sf.wallType || 'existing'}
              onChange={e => upd({ wallType: e.target.value })}
              style={styles.selectSm}>
              <option value="existing">기존벽</option>
              <option value="new">신설벽</option>
            </select>
          </label>
        )}
        {/* 신설벽 합판 선택 */}
        {isWall && sf.finishType !== 'none' && sf.wallType === 'new' && (
          <label style={styles.inlineLabel}>바탕합판
            <select value={sf.newWallHapanId || 'hp_normal_4'}
              onChange={e => upd({ newWallHapanId: e.target.value })}
              style={styles.selectSm}>
              {[...HAPAN, ...customMaterials.filter(m => m.category === 'hapan')].map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
        )}
        {/* 각재 가로단수 (벽면만) */}
        {isWall && sf.finishType !== 'none' && (
          <label style={styles.inlineLabel}>가로상 단수
            <select value={sf.gakjaeRows ?? 'auto'} onChange={e => upd({ gakjaeRows: e.target.value === 'auto' ? null : Number(e.target.value) })} style={styles.selectSm}>
              <option value="auto">자동 (H≤2.4m→2단)</option>
              <option value="2">2단</option>
              <option value="3">3단</option>
            </select>
          </label>
        )}
        {/* 흡음재 옵션 (벽면만) */}
        {isWall && sf.finishType !== 'none' && (
          <label style={styles.inlineLabel}>흡음재
            <select value={sf.insulationType || 'none'} onChange={e => upd({ insulationType: e.target.value })} style={styles.selectSm}>
              <option value="none">없음</option>
              {INSULATION.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
        )}
        {/* 래핑평판 (벽면만) */}
        {isWall && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>래핑평판</span>
              <button onClick={() => addWrapping(room.id, sf.id)} style={styles.btnAdd}>+ 추가</button>
            </div>
            {(sf.wrappings || []).map(wr => {
              const wrap = WRAPPING.find(w => w.id === wr.wrappingId)
              const wallW = getSurfaceDimensions(room, sf).widthMm
              const useMm = wr.lengthOverrideMm > 0 ? wr.lengthOverrideMm : wallW
              const boardLen = wrap ? wrap.lengthMm : 2400
              const qty = useMm > 0 ? Math.ceil(useMm / boardLen) : 0
              return (
                <div key={wr.id} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
                  <select value={wr.purpose || '걸레받이'}
                    onChange={e => updateWrapping(room.id, sf.id, wr.id, { purpose: e.target.value })}
                    style={{ ...styles.selectSm, width: 85 }}>
                    {WRAPPING_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={wr.wrappingId || 'wrap_60'}
                    onChange={e => updateWrapping(room.id, sf.id, wr.id, { wrappingId: e.target.value })}
                    style={{ ...styles.selectSm, width: 130 }}>
                    {WRAPPING.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <input type="number" min="0" value={wr.lengthOverrideMm || ''}
                    placeholder={`${wallW}mm`}
                    onChange={e => updateWrapping(room.id, sf.id, wr.id, { lengthOverrideMm: Number(e.target.value) })}
                    title="길이 직접입력 (0=벽폭 자동)"
                    style={{ ...styles.inputTiny, width: 65 }} />
                  <span style={{ color: '#1e4078', fontWeight: 600, whiteSpace: 'nowrap' }}>{qty}EA</span>
                  <button onClick={() => deleteWrapping(room.id, sf.id, wr.id)}
                    style={{ ...styles.btnDel, fontSize: 9, padding: '1px 4px' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}
        {/* 하부 마감 분리 시공 토글 (벽 + 도배/페인트만) */}
        {isWall && ['wallpaper', 'paint'].includes(sf.finishType) && (
          <label style={{ ...styles.inlineLabel, cursor: 'pointer' }}>
            <span style={{ color: sf.lowerEnabled ? '#8b5e00' : undefined, fontWeight: sf.lowerEnabled ? 700 : undefined }}>하부 마감</span>
            <input type="checkbox" checked={!!sf.lowerEnabled}
              onChange={e => {
                const checked = e.target.checked
                upd({
                  lowerEnabled: checked,
                  ...(checked && !(sf.lowerHeightMm > 0) ? { lowerHeightMm: 900 } : {}),
                })
              }}
              style={{ marginTop: 2 }} />
          </label>
        )}
      </div>

      {/* 금액 */}
      <div style={styles.costCell}>
        {result.total > 0 ? (
          <span style={styles.cost}>{result.total.toLocaleString()}원</span>
        ) : (
          <span style={{ color: '#bbb', fontSize: 12 }}>-</span>
        )}
      </div>
    </div>
    {/* 하부 마감 편집기 */}
    {isWall && sf.lowerEnabled && ['wallpaper', 'paint'].includes(sf.finishType) && (
      <LowerFinishEditor room={room} sf={sf} upd={upd} />
    )}
    {sf.finishType === 'none' && (
      <CustomItemsEditor room={room} sf={sf}
        addCustomItem={addCustomItem}
        updateCustomItem={updateCustomItem}
        deleteCustomItem={deleteCustomItem} />
    )}
    </div>
  )
}

// ── 직접설정 항목 편집기 ─────────────────────────────
const COMMON_UNITS = ['식', '㎡', 'm', '장', 'BOX', '롤', '팩', 'EA', '단', '인']

function CustomItemsEditor({ room, sf, addCustomItem, updateCustomItem, deleteCustomItem }) {
  const items = sf.customItems || []
  const total = items.reduce((s, ci) => s + (ci.qty || 0) * (ci.unitPrice || 0), 0)
  const { widthMm, heightMm, areaSqm } = getSurfaceDimensions(room, sf)
  const isWall = !['floor', 'ceiling'].includes(sf.direction)
  const perimeterM = isWall ? (widthMm / 1000) : ((widthMm + heightMm) * 2 / 1000)

  return (
    <div style={ciStyles.wrap}>
      <div style={ciStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={ciStyles.title}>직접 항목 입력</span>
          <span style={ciStyles.areaBadge}>면적: {areaSqm.toFixed(2)}㎡</span>
          <span style={ciStyles.areaBadge}>{isWall ? '폭' : '가로'}: {(widthMm/1000).toFixed(2)}m</span>
          <span style={ciStyles.areaBadge}>{isWall ? '높이' : '세로'}: {(heightMm/1000).toFixed(2)}m</span>
          {isWall && <span style={ciStyles.areaBadge}>둘레: {perimeterM.toFixed(2)}m</span>}
        </div>
        <button onClick={() => addCustomItem(room.id, sf.id)} style={ciStyles.addBtn}>+ 항목 추가</button>
      </div>
      {items.length === 0 ? (
        <div style={ciStyles.empty}>항목을 추가해 직접 물량을 입력하세요.</div>
      ) : (
        <table style={ciStyles.table}>
          <thead>
            <tr>
              <th style={ciStyles.th}>자재명</th>
              <th style={ciStyles.th}>규격</th>
              <th style={{ ...ciStyles.th, width: 60 }}>수량</th>
              <th style={{ ...ciStyles.th, width: 60 }}>단위</th>
              <th style={{ ...ciStyles.th, width: 100 }}>단가(원)</th>
              <th style={{ ...ciStyles.th, width: 90, textAlign: 'right' }}>금액</th>
              <th style={{ ...ciStyles.th, width: 24 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(ci => (
              <tr key={ci.id}>
                <td style={ciStyles.td}>
                  <input value={ci.name} placeholder="자재명"
                    onChange={e => updateCustomItem(room.id, sf.id, ci.id, { name: e.target.value })}
                    style={ciStyles.input} />
                </td>
                <td style={ciStyles.td}>
                  <input value={ci.spec || ''} placeholder="규격"
                    onChange={e => updateCustomItem(room.id, sf.id, ci.id, { spec: e.target.value })}
                    style={{ ...ciStyles.input, width: 80 }} />
                </td>
                <td style={ciStyles.td}>
                  <input type="number" min="0" step="0.1" value={ci.qty || ''}
                    onChange={e => updateCustomItem(room.id, sf.id, ci.id, { qty: +e.target.value })}
                    style={{ ...ciStyles.input, width: 55, textAlign: 'right' }} />
                </td>
                <td style={ciStyles.td}>
                  <select value={ci.unit || '식'}
                    onChange={e => updateCustomItem(room.id, sf.id, ci.id, { unit: e.target.value })}
                    style={{ ...ciStyles.input, width: 55, padding: '3px 2px' }}>
                    {COMMON_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td style={ciStyles.td}>
                  <input type="number" min="0" value={ci.unitPrice || ''}
                    onChange={e => updateCustomItem(room.id, sf.id, ci.id, { unitPrice: +e.target.value })}
                    style={{ ...ciStyles.input, width: 90, textAlign: 'right' }} />
                </td>
                <td style={{ ...ciStyles.td, textAlign: 'right', fontWeight: 600, color: '#1e4078' }}>
                  {((ci.qty || 0) * (ci.unitPrice || 0)).toLocaleString()}원
                </td>
                <td style={ciStyles.td}>
                  <button onClick={() => deleteCustomItem(room.id, sf.id, ci.id)} style={ciStyles.delBtn}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ ...ciStyles.td, textAlign: 'right', fontWeight: 700, color: '#555' }}>합계</td>
              <td style={{ ...ciStyles.td, textAlign: 'right', fontWeight: 700, color: '#1e4078' }}>{total.toLocaleString()}원</td>
              <td style={ciStyles.td}></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}

const ciStyles = {
  wrap: { margin: '0 0 0 0', padding: '8px 14px 10px', background: '#f8faff', borderTop: '1px dashed #c8d4e8' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 12, fontWeight: 700, color: '#555' },
  addBtn: { fontSize: 11, padding: '3px 10px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  empty: { fontSize: 12, color: '#aaa', padding: '6px 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '4px 6px', background: '#eef1f7', borderBottom: '1px solid #dde4f0', fontWeight: 700, color: '#555', textAlign: 'left' },
  td: { padding: '4px 4px', borderBottom: '1px solid #eef1f7', verticalAlign: 'middle' },
  input: { padding: '3px 5px', border: '1px solid #c8d4e8', borderRadius: 3, fontSize: 12, width: '100%' },
  delBtn: { background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 12, padding: '0 2px' },
  areaBadge: { fontSize: 11, color: '#1e4078', background: '#e8f0fc', borderRadius: 4, padding: '2px 8px', fontWeight: 600 },
}

// ── 필름 구간 편집기 ────────────────────────────────
function FilmSectionEditor({ room, sf, addFilmSection, updateFilmSection, deleteFilmSection, upd }) {
  const sections = sf.filmSections || []
  const { sectionResults, totalM } = calcFilmSections(sections, room.heightM * 1000, sf.filmPricePerM || 0)
  const [bulkInput, setBulkInput] = useState('')
  const [globalPattern, setGlobalPattern] = useState(0)

  const handleBulkGenerate = () => {
    const widths = bulkInput
      .split(/[,\s]+/)
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v) && v > 0)
    if (widths.length === 0) return
    widths.forEach((w, i) => {
      addFilmSection(room.id, sf.id, {
        label: `구간${sections.length + i + 1}`,
        widthMm: w,
        patternRepeatMm: globalPattern,
        heightOverrideMm: 0,
        filmName: '',
        pricePerM: 0,
      })
    })
    setBulkInput('')
  }

  const totalLossM = Math.round(sectionResults.reduce((s, r) => s + r.lossM, 0) * 10) / 10
  const wallTotalMm = sections.reduce((s, sec) => s + (sec.widthMm || 0), 0)
  const wallWidthMm = (sf.direction === 'wallC' || sf.direction === 'wallD' || sf.direction === 'wallE' || sf.direction === 'wallW')
    ? room.depthM * 1000
    : sf.direction === 'wallExtra'
    ? (sf.extraWidthM || 0) * 1000
    : room.widthM * 1000
  const wallDiffMm = wallWidthMm > 0 ? wallTotalMm - wallWidthMm : null

  return (
    <div style={fs.wrap}>
      {/* 공통 설정 */}
      <div style={fs.topRow}>
        <span style={fs.rollBadge}>롤폭 1200mm 고정</span>
        <label style={fs.inlineLabel}>기본 단가(원/m)
          <input type="number" min="0" value={sf.filmPricePerM || ''}
            placeholder="0"
            onChange={e => upd({ filmPricePerM: Number(e.target.value) })}
            style={fs.inputSm} />
        </label>
        <label style={fs.inlineLabel}>MDF 종류
          <select value={sf.mdfId} onChange={e => upd({ mdfId: e.target.value })} style={fs.selectSm}>
            {MDF.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <span style={fs.defaultHint}>※ 구간별 단가 미입력 시 기본 단가 적용</span>
      </div>

      {/* 빠른 입력 */}
      <div style={fs.bulkRow}>
        <span style={fs.bulkLabel}>폭 목록(mm):</span>
        <input
          value={bulkInput}
          onChange={e => setBulkInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleBulkGenerate()}
          placeholder="예) 1000, 800, 900, 1000, 600"
          style={fs.bulkInput}
        />
        <label style={fs.inlineLabel}>공통패턴(mm)
          <input type="number" min="0" value={globalPattern}
            onChange={e => setGlobalPattern(Number(e.target.value))}
            style={{ ...fs.inputSm, width: 60 }} />
        </label>
        <button onClick={handleBulkGenerate} style={fs.btnGenerate}>구간 생성</button>
        {sections.length > 0 && (
          <span style={{
            ...fs.wallSum,
            color: wallDiffMm === null ? '#888'
              : wallDiffMm === 0 ? '#1a7a3a'
              : '#c44000',
            fontWeight: wallDiffMm !== null && wallDiffMm !== 0 ? 700 : 400,
          }}>
            입력 합계: {wallTotalMm}mm
            {wallWidthMm > 0 && ` / 벽 ${wallWidthMm}mm`}
            {wallDiffMm !== null && wallDiffMm !== 0 && (
              <span> ({wallDiffMm > 0 ? '+' : ''}{wallDiffMm}mm)</span>
            )}
            {wallDiffMm === 0 && ' ✓'}
          </span>
        )}
      </div>

      {/* 구간 목록 */}
      {sections.length > 0 && (
        <div style={fs.tableWrap}>
          <table style={fs.table}>
            <thead>
              <tr style={fs.thead}>
                <th style={fs.th}>#</th>
                <th style={{...fs.th, minWidth: 90}}>필름명</th>
                <th style={fs.th}>폭(mm)</th>
                <th style={fs.th}>패턴간격(mm)</th>
                <th style={fs.th}>높이(mm)<br/><span style={{fontWeight:400,fontSize:9}}>0=벽높이</span></th>
                <th style={fs.th}>단가(원/m)<br/><span style={{fontWeight:400,fontSize:9}}>0=기본단가</span></th>
                <th style={fs.th}>소요(m)</th>
                <th style={fs.th}>금액</th>
                <th style={fs.th}>로스(m)</th>
                <th style={fs.th}></th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec, i) => {
                const res = sectionResults.find(r => r.id === sec.id)
                return (
                  <tr key={sec.id} style={i % 2 === 0 ? fs.trEven : fs.trOdd}>
                    <td style={{ ...fs.td, color: '#aaa', fontSize: 11 }}>{i + 1}</td>
                    <td style={fs.td}>
                      <input value={sec.filmName || ''}
                        onChange={e => updateFilmSection(room.id, sf.id, sec.id, { filmName: e.target.value })}
                        style={{...fs.inputNum, width: 88, textAlign: 'left'}}
                        placeholder="예) 화이트무광" />
                    </td>
                    <td style={fs.td}>
                      <input type="number" min="0" value={sec.widthMm}
                        onChange={e => updateFilmSection(room.id, sf.id, sec.id, { widthMm: Number(e.target.value) })}
                        style={fs.inputNum} />
                    </td>
                    <td style={fs.td}>
                      <input type="number" min="0" value={sec.patternRepeatMm}
                        onChange={e => updateFilmSection(room.id, sf.id, sec.id, { patternRepeatMm: Number(e.target.value) })}
                        style={fs.inputNum} />
                    </td>
                    <td style={fs.td}>
                      <input type="number" min="0" value={sec.heightOverrideMm}
                        onChange={e => updateFilmSection(room.id, sf.id, sec.id, { heightOverrideMm: Number(e.target.value) })}
                        style={fs.inputNum} />
                    </td>
                    <td style={fs.td}>
                      <input type="number" min="0" value={sec.pricePerM || ''}
                        placeholder={sf.filmPricePerM || '0'}
                        onChange={e => updateFilmSection(room.id, sf.id, sec.id, { pricePerM: Number(e.target.value) })}
                        style={fs.inputNum} />
                    </td>
                    <td style={{ ...fs.td, textAlign: 'right', fontWeight: 600, color: '#1e4078' }}>
                      {res ? res.sectionM : '-'}m
                    </td>
                    <td style={{ ...fs.td, textAlign: 'right', fontSize: 11, color: '#333' }}>
                      {res && res.sectionCost > 0 ? Math.round(res.sectionCost).toLocaleString() : '-'}
                    </td>
                    <td style={{ ...fs.td, textAlign: 'right', color: '#e06000', fontSize: 11 }}>
                      {res ? res.lossM : '-'}m
                    </td>
                    <td style={fs.td}>
                      <button onClick={() => deleteFilmSection(room.id, sf.id, sec.id)} style={fs.btnDel}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={fs.totalRow}>
            <span style={{ color: '#e06000', fontSize: 11 }}>총 로스: {totalLossM}m</span>
            <span>합계 {totalM}m</span>
            <span style={fs.totalCost}>
              {sectionResults.reduce((s, r) => s + r.sectionCost, 0) > 0
                ? Math.round(sectionResults.reduce((s, r) => s + r.sectionCost, 0)).toLocaleString() + '원'
                : '-'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => addFilmSection(room.id, sf.id, { label: `구간${sections.length + 1}`, widthMm: 600, patternRepeatMm: 0, heightOverrideMm: 0, filmName: '', pricePerM: 0 })}
        style={fs.btnAdd}>
        + 구간 1개 추가
      </button>
    </div>
  )
}

const fs = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 6, width: '100%' },
  topRow: { display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' },
  bulkRow: { display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', background: '#f5f8ff', padding: '6px 8px', borderRadius: 5 },
  bulkLabel: { fontSize: 11, color: '#555', fontWeight: 600, whiteSpace: 'nowrap' },
  bulkInput: { flex: 1, minWidth: 180, border: '1px solid #b0c4de', borderRadius: 4, padding: '4px 8px', fontSize: 12 },
  btnGenerate: { fontSize: 11, padding: '4px 12px', background: '#2563c0', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' },
  wallSum: { fontSize: 11, color: '#888', whiteSpace: 'nowrap' },
  rollBadge: {
    fontSize: 11, background: '#dde8f8', color: '#1e4078',
    padding: '3px 8px', borderRadius: 4, fontWeight: 600,
  },
  defaultHint: { fontSize: 10, color: '#aaa', whiteSpace: 'nowrap', alignSelf: 'flex-end' },
  inlineLabel: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#888', gap: 2 },
  inputSm: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '3px 5px', fontSize: 11, width: 80 },
  selectSm: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '3px 5px', fontSize: 11 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead: { background: '#eef2f8' },
  th: { padding: '5px 8px', color: '#555', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #dde4f0', fontSize: 11 },
  td: { padding: '4px 6px', textAlign: 'center' },
  trEven: { background: '#fff' },
  trOdd: { background: '#fafbfd' },
  inputTiny: { border: '1px solid #d0d7e3', borderRadius: 3, padding: '2px 4px', fontSize: 11, width: 55 },
  inputNum: { border: '1px solid #d0d7e3', borderRadius: 3, padding: '2px 4px', fontSize: 11, width: 60, textAlign: 'right' },
  totalRow: {
    display: 'flex', justifyContent: 'flex-end', gap: 16,
    padding: '5px 8px', background: '#eef2f8', borderRadius: '0 0 4px 4px',
    fontWeight: 700, fontSize: 12, color: '#1e4078',
  },
  totalNum: { fontSize: 13 },
  totalCost: { fontSize: 13, color: '#c44000' },
  btnAdd: {
    fontSize: 11, padding: '4px 12px', background: '#1e4078',
    border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff',
    alignSelf: 'flex-start',
  },
  btnDel: {
    fontSize: 10, padding: '1px 5px', background: '#fee',
    border: '1px solid #fcc', borderRadius: 3, cursor: 'pointer', color: '#c00',
  },
}

const styles = {
  surfaceBlock: {
    background: '#fff',
    borderRadius: 8,
    marginBottom: 5,
    border: '1px solid #edf0f7',
    boxShadow: '0 1px 3px rgba(30,64,120,0.04)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '110px 140px 1fr 120px',
    gap: 8,
    alignItems: 'start',
    padding: '9px 12px',
  },
  labelCell: { display: 'flex', flexDirection: 'column', gap: 4 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  areaBadge: {
    fontSize: 10, color: '#64748b', background: '#f1f5f9',
    borderRadius: 6, padding: '2px 6px', width: 'fit-content',
    fontWeight: 600,
  },
  cell: {},
  detailCell: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  costCell: { textAlign: 'right', paddingTop: 4 },
  cost: {
    fontSize: 13, fontWeight: 700, color: '#1e4078',
    background: 'rgba(30,64,120,0.06)',
    padding: '2px 8px', borderRadius: 8, display: 'inline-block',
  },
  select: {
    border: '1px solid #d0d7e3', borderRadius: 6,
    padding: '5px 6px', fontSize: 12, width: '100%',
    background: '#fff',
  },
  selectSm: {
    border: '1px solid #d0d7e3', borderRadius: 5,
    padding: '3px 5px', fontSize: 11, background: '#fff',
  },
  inputSm: {
    border: '1px solid #d0d7e3', borderRadius: 5,
    padding: '3px 5px', fontSize: 11, width: 80, background: '#fff',
  },
  inputTiny: {
    border: '1px solid #d0d7e3', borderRadius: 5,
    padding: '3px 5px', fontSize: 11, width: 60, background: '#fff',
  },
  inlineLabel: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#64748b', gap: 2, fontWeight: 600 },
  filmOptions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  openingCell: { position: 'relative' },
  openingPanel: {
    position: 'absolute', top: 26, left: 0, zIndex: 10,
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 10, padding: 12, minWidth: 220,
    boxShadow: '0 8px 24px rgba(30,64,120,0.14)',
  },
  openingItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f1f5f9',
  },
  openingAdd: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 },
  btnSmall: {
    fontSize: 11, padding: '4px 10px', background: '#f1f5f9',
    border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#1e4078',
  },
  btnDel: {
    fontSize: 10, padding: '2px 6px', background: '#fff', border: '1px solid #fca5a5',
    borderRadius: 5, cursor: 'pointer', color: '#dc2626',
  },
  btnAdd: {
    fontSize: 11, padding: '4px 10px', background: '#1e4078',
    border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff',
    fontWeight: 600,
  },
}
