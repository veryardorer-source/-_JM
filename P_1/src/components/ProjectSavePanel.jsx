import { useState } from 'react'
import { useStore } from '../store/useStore.js'

const STORAGE_KEY = 'interior-estimate-saved-projects'

function getSavedList() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}

function saveList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export default function ProjectSavePanel({ onClose }) {
  const { project, rooms, globalItems, loadFromFile } = useStore()
  const [savedList, setSavedList] = useState(getSavedList)
  const [saveName, setSaveName] = useState(project.siteName || '')

  function handleSave() {
    const name = saveName.trim() || '이름없음'
    const snapshot = {
      id: `proj_${Date.now()}`,
      name,
      savedAt: new Date().toLocaleString('ko-KR'),
      data: { project, rooms, globalItems },
    }
    const updated = [snapshot, ...savedList.filter(p => p.name !== name)]
    saveList(updated)
    setSavedList(updated)
    alert(`"${name}" 저장 완료`)
  }

  function handleLoad(item) {
    if (!confirm(`"${item.name}" 프로젝트를 불러올까요?\n현재 작업 내용은 사라집니다.`)) return
    loadFromFile(item.data)
    onClose()
  }

  function handleDelete(id) {
    const updated = savedList.filter(p => p.id !== id)
    saveList(updated)
    setSavedList(updated)
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>
        <div style={s.header}>
          <span style={s.title}>프로젝트 저장 / 불러오기</span>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* 저장 */}
        <div style={s.section}>
          <div style={s.sectionTitle}>현재 프로젝트 저장</div>
          <div style={s.saveRow}>
            <input
              style={s.input}
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="저장 이름 (예: 서상동 의원)"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button onClick={handleSave} style={s.saveBtn}>저장</button>
          </div>
        </div>

        {/* 목록 */}
        <div style={s.section}>
          <div style={s.sectionTitle}>저장된 프로젝트 ({savedList.length}개)</div>
          {savedList.length === 0 ? (
            <div style={s.empty}>저장된 프로젝트가 없습니다.</div>
          ) : (
            <div style={s.list}>
              {savedList.map(item => (
                <div key={item.id} style={s.item}>
                  <div style={s.itemInfo}>
                    <span style={s.itemName}>{item.name}</span>
                    <span style={s.itemDate}>{item.savedAt}</span>
                  </div>
                  <div style={s.itemBtns}>
                    <button onClick={() => handleLoad(item)} style={s.loadBtn}>불러오기</button>
                    <button onClick={() => handleDelete(item.id)} style={s.delBtn}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    background: '#fff', borderRadius: 10, width: 460, maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', background: '#1e4078',
  },
  title: { fontSize: 14, fontWeight: 700, color: '#fff' },
  closeBtn: { fontSize: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', lineHeight: 1 },
  section: { padding: '14px 18px', borderBottom: '1px solid #eef' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 },
  saveRow: { display: 'flex', gap: 8 },
  input: { flex: 1, border: '1px solid #c8d4e8', borderRadius: 5, padding: '7px 10px', fontSize: 13, outline: 'none' },
  saveBtn: { padding: '7px 18px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  empty: { color: '#aaa', fontSize: 13, padding: '12px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' },
  item: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', background: '#f5f8ff', borderRadius: 6, border: '1px solid #dde6f8',
  },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  itemName: { fontSize: 13, fontWeight: 700, color: '#1e4078' },
  itemDate: { fontSize: 10, color: '#aaa' },
  itemBtns: { display: 'flex', gap: 6 },
  loadBtn: { fontSize: 12, padding: '4px 12px', background: '#2d6a3f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  delBtn: { fontSize: 12, padding: '4px 10px', background: '#fee', color: '#c00', border: '1px solid #fcc', borderRadius: 4, cursor: 'pointer' },
}
