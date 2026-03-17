import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import {
  WALLPAPER, TILE, FLOORING, SEOKGO, MDF, HAPAN, INSULATION, LUBA,
  FINISH_TYPES,
} from '../data/materials.js'

// ─── 산출방식 목록 ───────────────────────────────────────
export const CALC_METHODS = [
  { id: 'per_sqm',      label: '㎡ 기준',       desc: '면적(㎡) × 단가',           unit: '㎡'  },
  { id: 'per_sheet',    label: '장 기준',        desc: '면적 ÷ 장당면적',           unit: '장'  },
  { id: 'per_box',      label: 'BOX 기준',       desc: '면적 ÷ BOX당면적',         unit: 'BOX' },
  { id: 'per_roll',     label: '롤 기준',        desc: '평수 ÷ 롤당평수',           unit: '롤'  },
  { id: 'per_pack',     label: '팩 기준',        desc: '면적 ÷ 팩당면적',           unit: '팩'  },
  { id: 'per_tile',     label: '타일 개수 기준', desc: '타일 크기로 BOX 계산',       unit: 'BOX' },
  { id: 'per_linear_m', label: 'm 기준 (선형)',  desc: '폭(m) 기준 선형 계산',       unit: 'm'   },
  { id: 'per_ea',       label: 'EA 기준',        desc: '수량 직접 입력',             unit: 'EA'  },
]

// ─── 카테고리 정의 ───────────────────────────────────────
const CATEGORIES = [
  { id: 'wallpaper',  label: '벽지',    defaultArr: WALLPAPER,  priceKey: 'pricePerRoll',  unit: '롤' },
  { id: 'tile',       label: '타일',    defaultArr: TILE,       priceKey: 'pricePerBox',   unit: 'BOX' },
  { id: 'flooring',   label: '바닥재',  defaultArr: FLOORING,   priceKey: 'pricePerUnit',  unit: '㎡/BOX' },
  { id: 'seokgo',     label: '석고보드',defaultArr: SEOKGO,     priceKey: 'pricePerSheet', unit: '장' },
  { id: 'mdf',        label: 'MDF',     defaultArr: MDF,        priceKey: 'pricePerSheet', unit: '장' },
  { id: 'hapan',      label: '합판',    defaultArr: HAPAN,      priceKey: 'pricePerSheet', unit: '장' },
  { id: 'insulation', label: '흡음재',  defaultArr: INSULATION, priceKey: 'pricePerSqm',  unit: '㎡' },
  { id: 'luba',       label: '루바',    defaultArr: LUBA,       priceKey: 'pricePerPack',  unit: '팩' },
]

// 카테고리별 기본 산출방식
const DEFAULT_CALC_METHOD = {
  wallpaper: 'per_roll', tile: 'per_tile', flooring: 'per_box',
  seokgo: 'per_sheet', mdf: 'per_sheet', hapan: 'per_sheet',
  insulation: 'per_sqm', luba: 'per_pack',
}

const METHOD_CATEGORIES = FINISH_TYPES.filter(ft => ft.id !== 'none')

// ─── 산출방식별 입력 필드 ────────────────────────────────
function CalcMethodFields({ form, upd }) {
  switch (form.calcMethod) {
    case 'per_sqm':
      return (
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.1) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
      )
    case 'per_sheet':
      return <>
        <label style={s.formLabel}>장당 면적(㎡)
          <input type="number" step="0.001" value={form.areaPerSheet ?? 2.977}
            onChange={e => upd({ areaPerSheet: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.1) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
      </>
    case 'per_box':
      return <>
        <label style={s.formLabel}>BOX당 면적(㎡)
          <input type="number" step="0.001" value={form.areaPerBox ?? 1.44}
            onChange={e => upd({ areaPerBox: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.1) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
      </>
    case 'per_roll':
      return <>
        <label style={s.formLabel}>롤당 평수
          <input type="number" step="0.1" value={form.pyungPerRoll ?? 5}
            onChange={e => upd({ pyungPerRoll: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.1) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
        <label style={{ ...s.formLabel, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={!!form.forCeiling}
            onChange={e => upd({ forCeiling: e.target.checked })} />
          천장용
        </label>
      </>
    case 'per_pack':
      return <>
        <label style={s.formLabel}>팩당 면적(㎡)
          <input type="number" step="0.01" value={form.areaPerPack ?? 2.4}
            onChange={e => upd({ areaPerPack: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.1) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
      </>
    case 'per_tile':
      return <>
        <label style={s.formLabel}>타일 가로(mm)
          <input type="number" value={form.tileW ?? 600}
            onChange={e => upd({ tileW: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>타일 세로(mm)
          <input type="number" value={form.tileH ?? 600}
            onChange={e => upd({ tileH: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>BOX당 장수
          <input type="number" value={form.tilesPerBox ?? 4}
            onChange={e => upd({ tilesPerBox: +e.target.value })} style={s.input} />
        </label>
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.1) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
      </>
    case 'per_linear_m':
      return <>
        <label style={s.formLabel}>기준 치수
          <select value={form.linearBase ?? 'width'} onChange={e => upd({ linearBase: e.target.value })} style={s.input}>
            <option value="width">가로(폭)</option>
            <option value="depth">세로(깊이)</option>
            <option value="perimeter">둘레(가로+세로×2)</option>
            <option value="height">높이</option>
          </select>
        </label>
        <label style={s.formLabel}>손실률(%)
          <input type="number" min="0" max="100" value={Math.round((form.wasteFactor ?? 0.05) * 100)}
            onChange={e => upd({ wasteFactor: +e.target.value / 100 })} style={s.input} />
        </label>
      </>
    case 'per_ea':
      return (
        <label style={s.formLabel}>기본 수량(EA)
          <input type="number" value={form.defaultQty ?? 1}
            onChange={e => upd({ defaultQty: +e.target.value })} style={s.input} />
        </label>
      )
    default:
      return null
  }
}

// ─── 자재 추가 폼 ───────────────────────────────────────
function AddMaterialForm({ category, onSave, onCancel }) {
  const [form, setForm] = useState({
    category: category.id,
    company: '',
    name: '',
    spec: '',
    calcMethod: DEFAULT_CALC_METHOD[category.id] || 'per_sqm',
    wasteFactor: 0.1,
    price: 0,
    // per_sheet / per_box / per_pack / per_tile defaults
    areaPerSheet: 2.977, areaPerBox: 1.44, areaPerPack: 2.4,
    pyungPerRoll: 5, tileW: 600, tileH: 600, tilesPerBox: 4,
    forCeiling: false, linearBase: 'width', defaultQty: 1,
  })
  const upd = (f) => setForm(p => ({ ...p, ...f }))
  const calcM = CALC_METHODS.find(m => m.id === form.calcMethod)

  return (
    <div style={s.formBox}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e4078', marginBottom: 12 }}>새 자재 추가 — {category.label}</div>
      <div style={s.formGrid}>
        {/* 기본 정보 */}
        <label style={s.formLabel}>회사명
          <input value={form.company} onChange={e => upd({ company: e.target.value })}
            style={s.input} placeholder="예: LG하우시스" />
        </label>
        <label style={s.formLabel}>제품명 *
          <input value={form.name} onChange={e => upd({ name: e.target.value })}
            style={s.input} placeholder="제품명 입력" />
        </label>
        <label style={s.formLabel}>규격·비고
          <input value={form.spec} onChange={e => upd({ spec: e.target.value })}
            style={s.input} placeholder="예: 900×1800×9T" />
        </label>

        {/* 산출방식 */}
        <label style={{ ...s.formLabel, minWidth: 200 }}>산출방식 *
          <select value={form.calcMethod} onChange={e => upd({ calcMethod: e.target.value })} style={s.input}>
            {CALC_METHODS.map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>
            ))}
          </select>
        </label>

        {/* 산출방식별 필드 */}
        <CalcMethodFields form={form} upd={upd} />

        {/* 단가 */}
        <label style={s.formLabel}>
          {`단가 (원/${calcM?.unit || '단위'})`}
          <input type="number" min="0" value={form.price}
            onChange={e => upd({ price: +e.target.value })} style={s.input} />
        </label>
      </div>

      {/* 산출방식 설명 */}
      {calcM && (
        <div style={s.methodHint}>
          <strong>{calcM.label}</strong>: {calcM.desc}
          {form.calcMethod === 'per_sqm' && ` → 수량 = 면적 × ${1 + (form.wasteFactor ?? 0.1)}`}
          {form.calcMethod === 'per_sheet' && ` → 수량 = ceil(면적 × ${1 + (form.wasteFactor ?? 0.1)} ÷ ${form.areaPerSheet})`}
          {form.calcMethod === 'per_box' && ` → 수량 = ceil(면적 × ${1 + (form.wasteFactor ?? 0.1)} ÷ ${form.areaPerBox})`}
          {form.calcMethod === 'per_roll' && ` → 수량 = ceil(평수 ÷ ${(form.pyungPerRoll ?? 5) * (1 - (form.wasteFactor ?? 0.1))})`}
          {form.calcMethod === 'per_tile' && ` → BOX당 면적 = ${((form.tileW ?? 600) * (form.tileH ?? 600) * (form.tilesPerBox ?? 4) / 1e6).toFixed(3)}㎡`}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => {
          if (!form.name.trim()) return alert('제품명을 입력하세요')
          onSave(form)
        }} style={s.btnSave}>저장</button>
        <button onClick={onCancel} style={s.btnCancel}>취소</button>
      </div>
    </div>
  )
}

// ─── 자재 단가 탭 ─────────────────────────────────────────
function MaterialTab() {
  const {
    customMaterials, priceOverrides,
    addCustomMaterial, updateCustomMaterial, deleteCustomMaterial,
    setPriceOverride, clearPriceOverride,
  } = useStore()
  const [activeCat, setActiveCat] = useState('wallpaper')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPrice, setEditingPrice] = useState({})

  const cat = CATEGORIES.find(c => c.id === activeCat)
  const customOfCat = customMaterials.filter(m => m.category === activeCat)

  const handlePriceSave = (matId, isCustom) => {
    const val = Number(editingPrice[matId])
    if (!isNaN(val) && val >= 0) {
      if (isCustom) updateCustomMaterial(matId, { price: val })
      else val === 0 ? clearPriceOverride(matId) : setPriceOverride(matId, val)
    }
    setEditingPrice(prev => { const n = { ...prev }; delete n[matId]; return n })
  }

  const getPriceDisplay = (mat, isCustom) => {
    if (isCustom) {
      const override = priceOverrides[mat.id]
      return { price: override ?? mat.price ?? 0, overridden: override !== undefined }
    }
    const override = priceOverrides[mat.id]
    return { price: override ?? mat[cat.priceKey] ?? 0, overridden: override !== undefined }
  }

  const getCalcMethodLabel = (mat) => {
    if (!mat.calcMethod) return DEFAULT_CALC_METHOD[mat.category] || ''
    return CALC_METHODS.find(m => m.id === mat.calcMethod)?.label || mat.calcMethod
  }

  return (
    <div style={s.tabContent}>
      {/* 카테고리 사이드바 */}
      <div style={s.catSidebar}>
        {CATEGORIES.map(c => (
          <button key={c.id}
            onClick={() => { setActiveCat(c.id); setShowAddForm(false) }}
            style={activeCat === c.id ? { ...s.catBtn, ...s.catBtnActive } : s.catBtn}>
            {c.label}
            {customMaterials.filter(m => m.category === c.id).length > 0 && (
              <span style={s.badge}>{customMaterials.filter(m => m.category === c.id).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* 자재 목록 */}
      <div style={s.matList}>
        <div style={s.matListHeader}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e4078' }}>{cat.label} 자재 목록</span>
          <button onClick={() => setShowAddForm(v => !v)} style={s.btnAdd}>
            {showAddForm ? '✕ 닫기' : '+ 자재 추가'}
          </button>
        </div>

        {showAddForm && (
          <AddMaterialForm
            category={cat}
            onSave={(form) => { addCustomMaterial(form); setShowAddForm(false) }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>구분</th>
              <th style={s.th}>회사</th>
              <th style={s.th}>제품명</th>
              <th style={s.th}>산출방식</th>
              <th style={{ ...s.th, textAlign: 'right' }}>단가</th>
              <th style={s.th}>작업</th>
            </tr>
          </thead>
          <tbody>
            {/* 기본 자재 */}
            {cat.defaultArr.map(mat => {
              const { price, overridden } = getPriceDisplay(mat, false)
              const isEditing = editingPrice[mat.id] !== undefined
              return (
                <tr key={mat.id} style={s.trDefault}>
                  <td style={s.td}><span style={s.tagDefault}>기본</span></td>
                  <td style={s.td}>-</td>
                  <td style={s.td}>{mat.name}</td>
                  <td style={s.td}><span style={s.methodTag}>{CALC_METHODS.find(m => m.id === DEFAULT_CALC_METHOD[activeCat])?.label}</span></td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <input type="number" value={editingPrice[mat.id]}
                          onChange={e => setEditingPrice(p => ({ ...p, [mat.id]: e.target.value }))}
                          style={{ ...s.input, width: 90, textAlign: 'right' }} autoFocus />
                        <button onClick={() => handlePriceSave(mat.id, false)} style={s.btnSaveSm}>저장</button>
                        <button onClick={() => setEditingPrice(p => { const n = { ...p }; delete n[mat.id]; return n })} style={s.btnCancelSm}>✕</button>
                      </div>
                    ) : (
                      <span style={{ color: overridden ? '#e06000' : '#222', fontWeight: overridden ? 700 : 400 }}>
                        {price.toLocaleString()}원/{cat.unit}
                        {overridden && <span style={s.overrideBadge}>수정됨</span>}
                      </span>
                    )}
                  </td>
                  <td style={s.td}>
                    {!isEditing && (
                      <button onClick={() => setEditingPrice(p => ({ ...p, [mat.id]: String(price) }))} style={s.btnEdit}>단가수정</button>
                    )}
                    {overridden && !isEditing && (
                      <button onClick={() => clearPriceOverride(mat.id)} style={{ ...s.btnEdit, marginLeft: 4, color: '#c00' }}>초기화</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {/* 커스텀 자재 */}
            {customOfCat.map(mat => {
              const { price } = getPriceDisplay(mat, true)
              const isEditing = editingPrice[mat.id] !== undefined
              return (
                <tr key={mat.id} style={s.trCustom}>
                  <td style={s.td}><span style={s.tagCustom}>추가</span></td>
                  <td style={s.td}>{mat.company || '-'}</td>
                  <td style={s.td}>
                    {mat.name}
                    {mat.spec ? <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>{mat.spec}</span> : null}
                  </td>
                  <td style={s.td}><span style={{ ...s.methodTag, background: '#d0f0e8', color: '#0a6644' }}>{getCalcMethodLabel(mat)}</span></td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <input type="number" value={editingPrice[mat.id]}
                          onChange={e => setEditingPrice(p => ({ ...p, [mat.id]: e.target.value }))}
                          style={{ ...s.input, width: 90, textAlign: 'right' }} autoFocus />
                        <button onClick={() => handlePriceSave(mat.id, true)} style={s.btnSaveSm}>저장</button>
                        <button onClick={() => setEditingPrice(p => { const n = { ...p }; delete n[mat.id]; return n })} style={s.btnCancelSm}>✕</button>
                      </div>
                    ) : (
                      <span>{price.toLocaleString()}원/{CALC_METHODS.find(m => m.id === mat.calcMethod)?.unit || '단위'}</span>
                    )}
                  </td>
                  <td style={s.td}>
                    {!isEditing && (
                      <>
                        <button onClick={() => setEditingPrice(p => ({ ...p, [mat.id]: String(price) }))} style={s.btnEdit}>단가수정</button>
                        <button onClick={() => { if (confirm(`'${mat.name}' 을 삭제할까요?`)) deleteCustomMaterial(mat.id) }}
                          style={{ ...s.btnEdit, marginLeft: 4, color: '#c00' }}>삭제</button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── 도어 종류 설정 탭 ─────────────────────────────────────
function DoorTypeTab() {
  const { doorTypes, setDoorTypes } = useStore()
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  // doorTypes 항목을 항상 {name, defaultPrice} 형태로 정규화
  const normalized = (doorTypes || []).map(t => typeof t === 'string' ? { name: t, defaultPrice: 0 } : t)

  const handleAdd = () => {
    const v = newName.trim()
    if (!v || normalized.some(t => t.name === v)) return
    setDoorTypes([...normalized, { name: v, defaultPrice: Number(newPrice) || 0 }])
    setNewName(''); setNewPrice('')
  }
  const handleUpdate = (i, fields) => {
    const next = normalized.map((t, idx) => idx === i ? { ...t, ...fields } : t)
    setDoorTypes(next)
  }
  const handleDelete = (i) => setDoorTypes(normalized.filter((_, idx) => idx !== i))
  const handleMove = (i, dir) => {
    const next = [...normalized]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setDoorTypes(next)
  }

  return (
    <div style={s.methodWrap}>
      <p style={s.methodDesc}>
        도어 종류와 기본 단가를 설정합니다. 기본 단가는 도어 추가 시 자동 적용됩니다.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#eef2f8', borderBottom: '2px solid #dde4f0' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#555' }}>도어 종류</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#555' }}>기본 단가(원/짝)</th>
            <th style={{ padding: '8px 6px', width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {normalized.map((t, i) => (
            <tr key={t.name} style={{ borderBottom: '1px solid #eef1f7', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
              <td style={{ padding: '6px 12px' }}>
                <input value={t.name}
                  onChange={e => handleUpdate(i, { name: e.target.value })}
                  style={{ border: '1px solid #d0d7e3', borderRadius: 4, padding: '4px 8px', fontSize: 13, width: 140 }} />
              </td>
              <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                <input type="number" min="0" value={t.defaultPrice || ''}
                  placeholder="0"
                  onChange={e => handleUpdate(i, { defaultPrice: Number(e.target.value) })}
                  style={{ border: '1px solid #d0d7e3', borderRadius: 4, padding: '4px 8px', fontSize: 13, width: 110, textAlign: 'right' }} />
              </td>
              <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                <button onClick={() => handleMove(i, -1)} disabled={i === 0}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12 }}>▲</button>
                <button onClick={() => handleMove(i, 1)} disabled={i === normalized.length - 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12 }}>▼</button>
                <button onClick={() => handleDelete(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, marginLeft: 4 }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="새 도어 종류명"
          style={{ border: '1px solid #d0d7e3', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 140 }} />
        <input type="number" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)}
          placeholder="기본 단가(원)"
          style={{ border: '1px solid #d0d7e3', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 120, textAlign: 'right' }} />
        <button onClick={handleAdd}
          style={{ padding: '6px 16px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          추가
        </button>
      </div>
    </div>
  )
}

// ─── 시공방법 설정 탭 ─────────────────────────────────────
function MethodTab() {
  const { methodDefaults, setMethodDefault, customMaterials } = useStore()

  return (
    <div style={s.methodWrap}>
      <p style={s.methodDesc}>
        마감재 종류를 선택할 때 자동으로 적용되는 기본 설정값입니다.<br />
        각 현장·면별로 개별 변경도 가능합니다.
      </p>
      {METHOD_CATEGORIES.map(ft => {
        const def = methodDefaults[ft.id] || {}
        return (
          <div key={ft.id} style={s.methodCard}>
            <div style={s.methodCardTitle}>{ft.label}</div>
            <div style={s.methodCardBody}>
              <label style={s.methodLabel}>기본 가로상 단수
                <select value={def.gakjaeRows ?? 'auto'}
                  onChange={e => setMethodDefault(ft.id, { gakjaeRows: e.target.value === 'auto' ? null : Number(e.target.value) })}
                  style={s.methodSelect}>
                  <option value="auto">자동 (H≤2.4m→2단)</option>
                  <option value="2">2단 고정</option>
                  <option value="3">3단 고정</option>
                </select>
              </label>
              {!['flooring', 'tex', 'wood'].includes(ft.id) && (
                <label style={s.methodLabel}>기본 석고보드
                  <select value={def.seokgoType || 'sg_normal'}
                    onChange={e => setMethodDefault(ft.id, { seokgoType: e.target.value })}
                    style={s.methodSelect}>
                    {[...SEOKGO, ...customMaterials.filter(m => m.category === 'seokgo')].map(sg => (
                      <option key={sg.id} value={sg.id}>{sg.name.replace('900×1800×', '')}</option>
                    ))}
                  </select>
                </label>
              )}
              {['film'].includes(ft.id) && (
                <label style={s.methodLabel}>기본 MDF
                  <select value={def.mdfId || 'mdf_9'}
                    onChange={e => setMethodDefault(ft.id, { mdfId: e.target.value })}
                    style={s.methodSelect}>
                    {[...MDF, ...customMaterials.filter(m => m.category === 'mdf')].map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {!['flooring', 'tex'].includes(ft.id) && (
                <label style={s.methodLabel}>기본 흡음재
                  <select value={def.insulationType || 'none'}
                    onChange={e => setMethodDefault(ft.id, { insulationType: e.target.value })}
                    style={s.methodSelect}>
                    <option value="none">없음</option>
                    {[...INSULATION, ...customMaterials.filter(m => m.category === 'insulation')].map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────
export default function MaterialManager() {
  const [activeTab, setActiveTab] = useState('material')

  return (
    <div style={s.wrap}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>자재·시공방법 관리</h2>
        <p style={s.pageDesc}>자재 단가를 수정하거나 새 자재를 등록하고, 시공방법별 기본값을 설정하세요.</p>
      </div>

      <div style={s.tabBar}>
        <button onClick={() => setActiveTab('material')} style={activeTab === 'material' ? { ...s.tab, ...s.tabActive } : s.tab}>
          자재 단가 관리
        </button>
        <button onClick={() => setActiveTab('method')} style={activeTab === 'method' ? { ...s.tab, ...s.tabActive } : s.tab}>
          시공방법 기본 설정
        </button>
        <button onClick={() => setActiveTab('doortype')} style={activeTab === 'doortype' ? { ...s.tab, ...s.tabActive } : s.tab}>
          도어 종류 관리
        </button>
      </div>

      {activeTab === 'material' ? <MaterialTab /> : activeTab === 'method' ? <MethodTab /> : <DoorTypeTab />}
    </div>
  )
}

// ─── 스타일 ───────────────────────────────────────────────
const s = {
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '0 12px 40px' },
  pageHeader: { padding: '20px 0 8px' },
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#1e4078', margin: 0 },
  pageDesc: { fontSize: 13, color: '#666', margin: '4px 0 0' },

  tabBar: { display: 'flex', gap: 4, borderBottom: '2px solid #dde4f0', marginBottom: 20, marginTop: 12 },
  tab: { padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#666', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#1e4078', fontWeight: 700, borderBottom: '2px solid #1e4078' },

  tabContent: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  catSidebar: { display: 'flex', flexDirection: 'column', gap: 2, width: 100, flexShrink: 0 },
  catBtn: { padding: '8px 10px', border: '1px solid #dde4f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#444', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  catBtnActive: { background: '#1e4078', color: '#fff', borderColor: '#1e4078', fontWeight: 700 },
  badge: { background: '#e05c00', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 },

  matList: { flex: 1, minWidth: 0 },
  matListHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  formBox: { background: '#f0f4fa', border: '1px solid #c8d4e8', borderRadius: 8, padding: 16, marginBottom: 16 },
  formGrid: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  formLabel: { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: '#555', fontWeight: 600 },
  input: { padding: '5px 8px', border: '1px solid #c8d4e8', borderRadius: 4, fontSize: 13, width: 150 },
  methodHint: { marginTop: 10, padding: '8px 12px', background: '#e8f0fe', borderRadius: 6, fontSize: 12, color: '#1e4078' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '7px 10px', background: '#f0f4fa', borderBottom: '1px solid #dde4f0', fontWeight: 700, color: '#444', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid #eef1f7', verticalAlign: 'middle' },
  trDefault: { background: '#fff' },
  trCustom: { background: '#fafffe' },
  tagDefault: { background: '#e8ecf4', color: '#555', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 },
  tagCustom: { background: '#d0f0e8', color: '#0a6644', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 },
  overrideBadge: { background: '#ffe0c0', color: '#b04000', borderRadius: 4, padding: '1px 5px', fontSize: 10, marginLeft: 5, fontWeight: 700 },
  methodTag: { background: '#e8ecf4', color: '#444', borderRadius: 4, padding: '1px 6px', fontSize: 11 },

  btnAdd: { padding: '6px 14px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnEdit: { padding: '3px 8px', background: '#f0f4fa', color: '#1e4078', border: '1px solid #c8d4e8', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  btnSave: { padding: '7px 18px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700 },
  btnCancel: { padding: '7px 14px', background: '#e8ecf4', color: '#444', border: 'none', borderRadius: 5, cursor: 'pointer' },
  btnSaveSm: { padding: '3px 8px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  btnCancelSm: { padding: '3px 7px', background: '#e8ecf4', color: '#444', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 },

  methodWrap: { maxWidth: 700 },
  methodDesc: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 },
  methodCard: { background: '#fff', border: '1px solid #dde4f0', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  methodCardTitle: { background: '#f0f4fa', padding: '8px 14px', fontWeight: 700, fontSize: 14, color: '#1e4078', borderBottom: '1px solid #dde4f0' },
  methodCardBody: { padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 16 },
  methodLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#555', fontWeight: 600 },
  methodSelect: { padding: '5px 8px', border: '1px solid #c8d4e8', borderRadius: 4, fontSize: 13, marginTop: 2 },
}
