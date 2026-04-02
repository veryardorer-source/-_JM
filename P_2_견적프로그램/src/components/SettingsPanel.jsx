import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import {
  GAKJAE, SEOKGO, HAPAN, MDF, WALLPAPER, TILE, FLOORING, LUBA,
  INSULATION, TEX, KAKGWAN, ETC_WOOD, WOOD_PANEL,
  WRAPPING, FILM, DOOR, LIGHTING,
} from '../data/materials.js'

const CATEGORIES = [
  { id: 'gakjae',     label: '각재',         items: GAKJAE,     priceKey: 'pricePerDan',   unit: '단',  fields: ['length', 'countPerDan'] },
  { id: 'seokgo',     label: '석고보드',     items: SEOKGO,     priceKey: 'pricePerSheet', unit: '장',  fields: ['areaPerSheet'] },
  { id: 'hapan',      label: '합판',         items: HAPAN,      priceKey: 'pricePerSheet', unit: '장',  fields: ['areaPerSheet', 'type', 'thickness'] },
  { id: 'mdf',        label: 'MDF',          items: MDF,        priceKey: 'pricePerSheet', unit: '장',  fields: ['areaPerSheet', 'thickness'] },
  { id: 'wrapping',   label: '래핑평판',     items: WRAPPING,   priceKey: 'pricePerEa',    unit: 'EA',  fields: ['widthMm', 'lengthMm'] },
  { id: 'film',       label: '인테리어필름', items: FILM,       priceKey: 'pricePerM',     unit: 'm',   fields: ['widthMm'] },
  { id: 'wallpaper',  label: '벽지',         items: WALLPAPER,  priceKey: 'pricePerRoll',  unit: '롤',  fields: ['pyungPerRoll'] },
  { id: 'tile',       label: '타일',         items: TILE,       priceKey: 'pricePerBox',   unit: 'BOX', fields: ['tileW', 'tileH', 'tilesPerBox'] },
  { id: 'flooring',   label: '바닥재',       items: FLOORING,   priceKey: 'pricePerUnit',  unit: '',    fields: ['areaPerUnit'] },
  { id: 'luba',       label: '루바',         items: LUBA,       priceKey: 'pricePerPack',  unit: '팩',  fields: ['areaPerPack'] },
  { id: 'insulation', label: '흡음재',       items: INSULATION, priceKey: 'pricePerSqm',   unit: '㎡',  fields: [] },
  { id: 'tex',        label: '텍스',         items: TEX,        priceKey: 'pricePerBox',   unit: 'BOX', fields: ['areaPerBox'] },
  { id: 'kakgwan',    label: '각관',         items: KAKGWAN,    priceKey: 'pricePerEa',    unit: 'EA',  fields: ['length'] },
  { id: 'wood_panel', label: '집성목',       items: WOOD_PANEL, priceKey: 'pricePerSheet', unit: '장',  fields: ['areaPerSheet'] },
  { id: 'etc_wood',   label: '기타목재',     items: ETC_WOOD,   priceKey: 'pricePerSheet', unit: '장',  fields: [] },
  { id: 'door',       label: '도어',         items: DOOR,       priceKey: 'pricePerEa',    unit: '짝',  fields: [] },
  { id: 'lighting',   label: '조명',         items: LIGHTING,   priceKey: 'pricePerEa',    unit: 'EA',  fields: [] },
]

const FIELD_LABELS = {
  length: '길이(mm)', countPerDan: '단당 수량', areaPerSheet: '장당 면적(㎡)',
  type: '종류', thickness: '두께(T)', pyungPerRoll: '롤당 평수',
  tileW: '타일폭(mm)', tileH: '타일높이(mm)', tilesPerBox: '박스당 장수',
  areaPerUnit: '단위면적(㎡)', areaPerPack: '팩당 면적(㎡)', areaPerBox: '박스당 면적(㎡)',
  widthMm: '폭(mm)', lengthMm: '길이(mm)',
}

export default function SettingsPanel({ onClose }) {
  const { priceOverrides, setPriceOverride, customMaterials, addCustomMaterial, updateCustomMaterial, deleteCustomMaterial } = useStore()
  const [activeTab, setActiveTab] = useState('gakjae')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({})

  const cat = CATEGORIES.find(c => c.id === activeTab)
  const customs = customMaterials.filter(m => m.category === activeTab)
  const allItems = [...cat.items, ...customs]

  const getPrice = (item) => {
    if (priceOverrides[item.id] !== undefined) return priceOverrides[item.id]
    return item[cat.priceKey] ?? item.price ?? 0
  }

  const handleAddNew = () => {
    if (!newItem.name) return
    const id = `custom_${activeTab}_${Date.now()}`
    addCustomMaterial({
      id,
      category: activeTab,
      name: newItem.name,
      [cat.priceKey]: Number(newItem.price) || 0,
      ...Object.fromEntries(cat.fields.map(f => [f, Number(newItem[f]) || (f === 'type' ? newItem[f] || '' : 0)])),
      // 기본값 설정
      ...(activeTab === 'seokgo' ? { areaPerSheet: Number(newItem.areaPerSheet) || 1.62 } : {}),
      ...(activeTab === 'hapan' || activeTab === 'mdf' || activeTab === 'wood_panel' ? { areaPerSheet: Number(newItem.areaPerSheet) || 2.977 } : {}),
      ...(activeTab === 'wallpaper' ? { pyungPerRoll: Number(newItem.pyungPerRoll) || 5, forCeiling: !!newItem.forCeiling } : {}),
      ...(activeTab === 'flooring' ? { unit: newItem.unit || 'BOX', areaPerUnit: Number(newItem.areaPerUnit) || 3.24 } : {}),
      ...(activeTab === 'luba' ? { areaPerPack: Number(newItem.areaPerPack) || 2.4 } : {}),
      ...(activeTab === 'tile' ? { areaPerBox: Number(newItem.areaPerBox) || 1.44 } : {}),
    })
    setNewItem({})
    setShowAddForm(false)
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>설정 - 자재 관리</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* 탭 */}
        <div style={s.tabs}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => { setActiveTab(c.id); setShowAddForm(false); setNewItem({}) }}
              style={activeTab === c.id ? { ...s.tab, ...s.tabActive } : s.tab}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 자재 목록 */}
        <div style={s.content}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>자재명</th>
                {cat.fields.map(f => (
                  <th key={f} style={s.th}>{FIELD_LABELS[f] || f}</th>
                ))}
                <th style={s.th}>단가(원/{cat.unit || '단위'})</th>
                <th style={{ ...s.th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => {
                const isCustom = item.id.startsWith('custom_')
                const price = getPrice(item)
                const originalPrice = item[cat.priceKey] ?? item.price ?? 0
                const isOverridden = priceOverrides[item.id] !== undefined

                return (
                  <tr key={item.id} style={isCustom ? s.customRow : s.row}>
                    <td style={s.td}>
                      {isCustom ? (
                        <input
                          value={item.name}
                          onChange={e => updateCustomMaterial(item.id, { name: e.target.value })}
                          style={s.editInput}
                        />
                      ) : (
                        <span>{item.name}</span>
                      )}
                      {isCustom && <span style={s.customBadge}>사용자</span>}
                    </td>
                    {cat.fields.map(f => (
                      <td key={f} style={s.td}>
                        {isCustom ? (
                          <input
                            type={f === 'type' ? 'text' : 'number'}
                            value={item[f] ?? ''}
                            onChange={e => updateCustomMaterial(item.id, { [f]: f === 'type' ? e.target.value : Number(e.target.value) })}
                            style={{ ...s.editInput, width: 80, textAlign: 'right' }}
                          />
                        ) : (
                          <span style={s.fieldVal}>{item[f] ?? '-'}</span>
                        )}
                      </td>
                    ))}
                    <td style={s.td}>
                      <div style={s.priceCell}>
                        <input
                          type="number"
                          min="0"
                          value={price}
                          onChange={e => {
                            const v = Number(e.target.value)
                            if (isCustom) {
                              updateCustomMaterial(item.id, { [cat.priceKey]: v })
                            } else {
                              setPriceOverride(item.id, v)
                            }
                          }}
                          style={{ ...s.priceInput, ...(isOverridden ? s.priceChanged : {}) }}
                        />
                        {isOverridden && (
                          <button
                            onClick={() => setPriceOverride(item.id, undefined)}
                            title={`원래 단가: ${originalPrice.toLocaleString()}원`}
                            style={s.resetBtn}
                          >↩</button>
                        )}
                      </div>
                    </td>
                    <td style={s.td}>
                      {isCustom && (
                        <button
                          onClick={() => { if (confirm('삭제하시겠습니까?')) deleteCustomMaterial(item.id) }}
                          style={s.delBtn}
                        >삭제</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* 추가 폼 */}
          {showAddForm ? (
            <div style={s.addForm}>
              <div style={s.addFormTitle}>새 {cat.label} 추가</div>
              <div style={s.addFields}>
                <label style={s.addLabel}>
                  자재명
                  <input
                    value={newItem.name || ''}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="예) 커스텀 석고보드"
                    style={s.addInput}
                  />
                </label>
                {cat.fields.map(f => (
                  <label key={f} style={s.addLabel}>
                    {FIELD_LABELS[f] || f}
                    <input
                      type={f === 'type' ? 'text' : 'number'}
                      value={newItem[f] || ''}
                      onChange={e => setNewItem({ ...newItem, [f]: f === 'type' ? e.target.value : e.target.value })}
                      style={{ ...s.addInput, width: 100 }}
                    />
                  </label>
                ))}
                {activeTab === 'flooring' && (
                  <label style={s.addLabel}>
                    단위
                    <select value={newItem.unit || 'BOX'} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} style={s.addInput}>
                      <option value="BOX">BOX</option>
                      <option value="㎡">㎡</option>
                    </select>
                  </label>
                )}
                {activeTab === 'wallpaper' && (
                  <label style={{ ...s.addLabel, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={!!newItem.forCeiling} onChange={e => setNewItem({ ...newItem, forCeiling: e.target.checked })} />
                    천장용
                  </label>
                )}
                <label style={s.addLabel}>
                  단가(원)
                  <input
                    type="number"
                    min="0"
                    value={newItem.price || ''}
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="0"
                    style={{ ...s.addInput, width: 100 }}
                  />
                </label>
              </div>
              <div style={s.addActions}>
                <button onClick={handleAddNew} style={s.saveBtn}>추가</button>
                <button onClick={() => { setShowAddForm(false); setNewItem({}) }} style={s.cancelBtn}>취소</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)} style={s.addBtn}>+ 새 {cat.label} 추가</button>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    background: '#fff', borderRadius: 16, width: '90vw', maxWidth: 1100,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px', borderBottom: '2px solid #e8edf5',
    background: 'linear-gradient(135deg, #1a3a6e 0%, #2563c0 100%)',
    borderRadius: '16px 16px 0 0',
  },
  modalTitle: { fontSize: 16, fontWeight: 800, color: '#fff' },
  closeBtn: {
    fontSize: 18, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
  },
  tabs: {
    display: 'flex', flexWrap: 'wrap', gap: 2, padding: '10px 16px 0',
    borderBottom: '1px solid #e8edf5', background: '#f8fafc',
  },
  tab: {
    fontSize: 12, padding: '8px 14px', background: 'transparent', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer', color: '#64748b',
    fontWeight: 600, borderRadius: '6px 6px 0 0',
  },
  tabActive: {
    background: '#fff', color: '#1e4078', borderBottomColor: '#2563c0',
  },
  content: {
    flex: 1, overflow: 'auto', padding: '16px 20px',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    padding: '8px 10px', background: '#f1f5fb', borderBottom: '2px solid #dde4f0',
    fontWeight: 700, color: '#555', textAlign: 'left', whiteSpace: 'nowrap',
  },
  row: { borderBottom: '1px solid #f1f5f9' },
  customRow: { borderBottom: '1px solid #f1f5f9', background: '#fffef5' },
  td: { padding: '6px 10px', verticalAlign: 'middle' },
  fieldVal: { fontSize: 12, color: '#555' },
  customBadge: {
    fontSize: 9, background: '#f59e0b', color: '#fff', borderRadius: 3,
    padding: '1px 5px', marginLeft: 6, fontWeight: 700,
  },
  editInput: {
    border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 6px',
    fontSize: 12, width: '100%', background: '#fffef5',
  },
  priceCell: { display: 'flex', alignItems: 'center', gap: 4 },
  priceInput: {
    border: '1px solid #d0d7e3', borderRadius: 4, padding: '4px 8px',
    fontSize: 12, width: 100, textAlign: 'right', background: '#fff',
  },
  priceChanged: { background: '#fef3c7', borderColor: '#f59e0b' },
  resetBtn: {
    fontSize: 12, background: '#fee', border: '1px solid #fcc', borderRadius: 4,
    padding: '2px 6px', cursor: 'pointer', color: '#c00',
  },
  delBtn: {
    fontSize: 11, padding: '3px 8px', background: '#fff', border: '1px solid #fca5a5',
    borderRadius: 4, cursor: 'pointer', color: '#dc2626',
  },
  addBtn: {
    marginTop: 12, fontSize: 12, padding: '8px 20px', background: '#1e4078',
    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
  },
  addForm: {
    marginTop: 12, padding: 16, background: '#f8fafc', borderRadius: 10,
    border: '1px solid #dde4f0',
  },
  addFormTitle: { fontSize: 13, fontWeight: 700, color: '#1e4078', marginBottom: 10 },
  addFields: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  addLabel: { display: 'flex', flexDirection: 'column', fontSize: 11, color: '#555', gap: 3, fontWeight: 600 },
  addInput: {
    border: '1px solid #d0d7e3', borderRadius: 4, padding: '5px 8px',
    fontSize: 12, width: 160, background: '#fff',
  },
  addActions: { display: 'flex', gap: 8 },
  saveBtn: {
    fontSize: 12, padding: '6px 20px', background: '#2563c0', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
  },
  cancelBtn: {
    fontSize: 12, padding: '6px 20px', background: '#fff', color: '#64748b',
    border: '1px solid #d0d7e3', borderRadius: 6, cursor: 'pointer',
  },
}
