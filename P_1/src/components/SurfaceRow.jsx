import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { FINISH_TYPES, SEOKGO, MDF, HAPAN, WALLPAPER, TILE, FLOORING, TEX, INSULATION } from '../data/materials.js'
import { calcSurfaceCost, getSurfaceDimensions } from '../utils/surfaceCost.js'
import { calcFilmSections } from '../utils/calculations.js'

export default function SurfaceRow({ room, sf }) {
  const { updateSurface, addFilmSection, updateFilmSection, deleteFilmSection } = useStore()

  const upd = (fields) => updateSurface(room.id, sf.id, fields)
  const result = calcSurfaceCost(room, sf)
  const { areaSqm } = getSurfaceDimensions(room, sf)

  const isCeiling = sf.direction === 'ceiling'
  const isFloor = sf.direction === 'floor'
  const isWall = !isFloor && !isCeiling

  return (
    <div style={styles.row}>
      {/* 면 라벨 */}
      <div style={styles.labelCell}>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={sf.enabled}
            onChange={e => upd({ enabled: e.target.checked })} />
          <span style={{ fontWeight: 600, fontSize: 13, color: '#1e4078' }}>{sf.label}</span>
        </label>
        <span style={styles.areaBadge}>{areaSqm.toFixed(2)}㎡</span>
      </div>

      {/* 마감재 타입 선택 */}
      <div style={styles.cell}>
        <select value={sf.finishType} onChange={e => upd({ finishType: e.target.value })} style={styles.select}>
          {FINISH_TYPES.filter(ft => {
            if (isFloor) return ['flooring', 'tile', 'none'].includes(ft.id)
            if (isCeiling) return ['wallpaper', 'paint', 'tex', 'none'].includes(ft.id)
            return true
          }).map(ft => (
            <option key={ft.id} value={ft.id}>{ft.label}</option>
          ))}
        </select>
      </div>

      {/* 마감재 세부 선택 */}
      <div style={styles.detailCell}>
        {sf.finishType === 'wallpaper' && (
          <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.select}>
            {WALLPAPER.filter(w => isCeiling ? w.forCeiling : !w.forCeiling).map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.pricePerRoll.toLocaleString()}원/롤)</option>
            ))}
          </select>
        )}
        {sf.finishType === 'tile' && (
          <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.select}>
            {TILE.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.pricePerBox.toLocaleString()}원/BOX)</option>
            ))}
          </select>
        )}
        {sf.finishType === 'flooring' && (
          <select value={sf.finishMaterialId} onChange={e => upd({ finishMaterialId: e.target.value })} style={styles.select}>
            {FLOORING.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.pricePerUnit.toLocaleString()}원/{f.unit})</option>
            ))}
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
        {['wallpaper', 'paint', 'tile'].includes(sf.finishType) && (
          <label style={styles.inlineLabel}>석고보드
            <select value={sf.seokgoType}
              onChange={e => upd({ seokgoType: e.target.value })}
              style={styles.selectSm}
              disabled={sf.finishType === 'tile'}>
              {SEOKGO.map(s => <option key={s.id} value={s.id}>{s.name.replace('900×1800×', '')}</option>)}
            </select>
          </label>
        )}
        {/* 칸막이벽 옵션 (벽면만) */}
        {isWall && sf.finishType !== 'none' && (
          <label style={styles.inlineLabel}>벽 구조
            <select value={sf.wallType || 'normal'} onChange={e => upd({ wallType: e.target.value })} style={styles.selectSm}>
              <option value="normal">일반벽</option>
              <option value="partition">칸막이벽 (합판 포함)</option>
            </select>
          </label>
        )}
        {isWall && sf.wallType === 'partition' && (
          <label style={styles.inlineLabel}>합판 종류
            <select value={sf.hapanId || 'hp_normal_11'} onChange={e => upd({ hapanId: e.target.value })} style={styles.selectSm}>
              {HAPAN.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
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
  )
}

// ── 필름 구간 편집기 ────────────────────────────────
function FilmSectionEditor({ room, sf, addFilmSection, updateFilmSection, deleteFilmSection, upd }) {
  const sections = sf.filmSections || []
  const { sectionResults, totalM } = calcFilmSections(sections, room.heightM * 1000, sf.filmPricePerM || 0)
  const [bulkInput, setBulkInput] = useState('')  // "1000, 800, 900, 1000"
  const [globalPattern, setGlobalPattern] = useState(0)

  // 콤마 구분 폭 목록으로 구간 일괄 생성
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
  const wallWidthMm = (sf.direction === 'wallE' || sf.direction === 'wallW')
    ? room.depthM * 1000 : room.widthM * 1000
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
            입력 합계: {(wallTotalMm / 1000).toFixed(3)}m
            {wallWidthMm > 0 && ` / 벽 ${(wallWidthMm / 1000).toFixed(3)}m`}
            {wallDiffMm !== null && wallDiffMm !== 0 && (
              <span> ({wallDiffMm > 0 ? '+' : ''}{(wallDiffMm / 1000).toFixed(3)}m)</span>
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
  row: {
    display: 'grid',
    gridTemplateColumns: '110px 140px 1fr 120px',
    gap: 8,
    alignItems: 'start',
    padding: '8px 10px',
    borderBottom: '1px solid #f0f2f5',
    background: '#fafbfd',
    borderRadius: 4,
    marginBottom: 4,
  },
  labelCell: { display: 'flex', flexDirection: 'column', gap: 4 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  areaBadge: {
    fontSize: 11, color: '#888', background: '#eef2f8',
    borderRadius: 3, padding: '1px 5px', width: 'fit-content',
  },
  cell: {},
  detailCell: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  costCell: { textAlign: 'right', paddingTop: 4 },
  cost: { fontSize: 13, fontWeight: 700, color: '#1e4078' },
  select: {
    border: '1px solid #d0d7e3', borderRadius: 4,
    padding: '4px 6px', fontSize: 12, width: '100%',
  },
  selectSm: {
    border: '1px solid #d0d7e3', borderRadius: 4,
    padding: '3px 5px', fontSize: 11,
  },
  inputSm: {
    border: '1px solid #d0d7e3', borderRadius: 4,
    padding: '3px 5px', fontSize: 11, width: 80,
  },
  inputTiny: {
    border: '1px solid #d0d7e3', borderRadius: 4,
    padding: '3px 5px', fontSize: 11, width: 60,
  },
  inlineLabel: { display: 'flex', flexDirection: 'column', fontSize: 10, color: '#888', gap: 2 },
  filmOptions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  openingCell: { position: 'relative' },
  openingPanel: {
    position: 'absolute', top: 24, left: 0, zIndex: 10,
    background: '#fff', border: '1px solid #d0d7e3',
    borderRadius: 6, padding: 10, minWidth: 220,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  },
  openingItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f0f2f5',
  },
  openingAdd: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 },
  btnSmall: {
    fontSize: 11, padding: '3px 8px', background: '#eef2f8',
    border: '1px solid #c8d4e8', borderRadius: 4, cursor: 'pointer', color: '#1e4078',
  },
  btnDel: {
    fontSize: 10, padding: '1px 5px', background: '#fee', border: '1px solid #fcc',
    borderRadius: 3, cursor: 'pointer', color: '#c00',
  },
  btnAdd: {
    fontSize: 11, padding: '3px 8px', background: '#1e4078',
    border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff',
  },
}
