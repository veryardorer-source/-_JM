import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { getProjectList, deleteProject, loadProject, saveProject, generateProjectId } from '../utils/projectStorage.js'

export default function ProjectManager() {
  const { project, currentProjectId, saveCurrentProject, loadStoredProject, startNewProject } = useStore()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const [saveName, setSaveName] = useState('')
  const [confirmNew, setConfirmNew] = useState(false)
  const importRef = useRef()

  // 모달 열 때마다 목록 갱신
  useEffect(() => {
    if (open) {
      setList(getProjectList().sort((a, b) => b.savedAt.localeCompare(a.savedAt)))
      setSaveName(project.siteName || '')
    }
  }, [open, project.siteName])

  function handleSave() {
    const name = saveName.trim() || project.siteName || '이름 없음'
    saveCurrentProject(name)
    setList(getProjectList().sort((a, b) => b.savedAt.localeCompare(a.savedAt)))
    alert(`"${name}" 저장 완료`)
  }

  function handleLoad(id, displayName) {
    if (!window.confirm(`"${displayName}"을(를) 불러올까요?\n현재 작업 내용은 먼저 저장하세요.`)) return
    loadStoredProject(id)
    setOpen(false)
  }

  function handleDelete(id, displayName, e) {
    e.stopPropagation()
    if (!window.confirm(`"${displayName}"을(를) 삭제할까요?`)) return
    deleteProject(id)
    setList(prev => prev.filter(p => p.id !== id))
  }

  function handleNew() {
    if (confirmNew) {
      startNewProject()
      setOpen(false)
      setConfirmNew(false)
    } else {
      setConfirmNew(true)
    }
  }

  function handleExport(id, displayName) {
    const snapshot = loadProject(id)
    if (!snapshot) return alert('데이터를 찾을 수 없습니다.')
    const data = JSON.stringify({ displayName, snapshot }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${displayName || '프로젝트'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const { displayName, snapshot } = JSON.parse(ev.target.result)
        if (!snapshot?.project || !snapshot?.rooms) throw new Error('형식 오류')
        const newId = generateProjectId()
        saveProject(newId, displayName || file.name.replace('.json', ''), snapshot)
        setList(getProjectList().sort((a, b) => b.savedAt.localeCompare(a.savedAt)))
        alert(`"${displayName}" 가져오기 완료! 목록에서 불러오세요.`)
      } catch {
        alert('올바른 프로젝트 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function fmtDate(iso) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={s.btn}>
        프로젝트 관리
      </button>

      {open && (
        <div style={s.overlay} onClick={() => { setOpen(false); setConfirmNew(false) }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>프로젝트 관리</span>
              <button onClick={() => { setOpen(false); setConfirmNew(false) }} style={s.closeBtn}>✕</button>
            </div>

            {/* 현재 프로젝트 저장 */}
            <div style={s.section}>
              <div style={s.sectionTitle}>현재 프로젝트 저장</div>
              <div style={s.saveRow}>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="프로젝트 이름"
                  style={s.nameInput}
                />
                <button onClick={handleSave} style={s.saveBtn}>저장</button>
              </div>
              {currentProjectId && (
                <div style={s.hint}>현재: {list.find(p => p.id === currentProjectId)?.displayName || '저장됨'}</div>
              )}
            </div>

            {/* 새 프로젝트 / 가져오기 */}
            <div style={s.section}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <button
                  onClick={handleNew}
                  style={confirmNew ? { ...s.newBtn, background: '#c0392b', flex: 1 } : { ...s.newBtn, flex: 1 }}
                >
                  {confirmNew ? '확인: 현재 작업이 사라집니다. 새로 시작' : '+ 새 프로젝트'}
                </button>
                <button onClick={() => importRef.current.click()} style={s.importBtn}>
                  파일 가져오기
                </button>
                <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
              </div>
              {confirmNew && (
                <button onClick={() => setConfirmNew(false)} style={s.cancelBtn}>취소</button>
              )}
            </div>

            {/* 저장된 프로젝트 목록 */}
            <div style={s.section}>
              <div style={s.sectionTitle}>저장된 프로젝트 ({list.length}개)</div>
              {list.length === 0 ? (
                <div style={s.empty}>저장된 프로젝트 없음</div>
              ) : (
                <div style={s.projList}>
                  {list.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleLoad(p.id, p.displayName)}
                      style={p.id === currentProjectId ? { ...s.projItem, ...s.projItemActive } : s.projItem}
                    >
                      <div style={s.projName}>{p.displayName}</div>
                      <div style={s.projMeta}>{fmtDate(p.savedAt)}</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExport(p.id, p.displayName) }}
                        style={s.exportBtn}
                      >내보내기</button>
                      <button
                        onClick={(e) => handleDelete(p.id, p.displayName, e)}
                        style={s.delBtn}
                      >삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const s = {
  btn: {
    fontSize: 11, padding: '4px 10px',
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#fff', borderRadius: 10,
    width: 420, maxWidth: '95vw',
    maxHeight: '80vh', overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    padding: '0 0 16px',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px 10px',
    borderBottom: '2px solid #1e4078',
  },
  modalTitle: { fontSize: 15, fontWeight: 800, color: '#1e4078' },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 16,
    cursor: 'pointer', color: '#888', padding: '0 4px',
  },
  section: { padding: '12px 18px 0' },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 },
  saveRow: { display: 'flex', gap: 8 },
  nameInput: {
    flex: 1, border: '1px solid #c8d4e8', borderRadius: 5,
    padding: '7px 10px', fontSize: 13,
  },
  saveBtn: {
    padding: '7px 18px', background: '#1e4078', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
  hint: { fontSize: 11, color: '#888', marginTop: 5 },
  newBtn: {
    width: '100%', padding: '8px', fontSize: 12, fontWeight: 700,
    background: '#2a7a4a', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer',
    transition: 'background 0.2s',
  },
  cancelBtn: {
    marginTop: 6, width: '100%', padding: '6px', fontSize: 12,
    background: '#eee', color: '#555',
    border: 'none', borderRadius: 5, cursor: 'pointer',
  },
  empty: { fontSize: 12, color: '#aaa', textAlign: 'center', padding: '12px 0' },
  projList: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' },
  projItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 6,
    border: '1px solid #e0e8f4', cursor: 'pointer',
    background: '#f7f9fc',
    transition: 'background 0.15s',
  },
  projItemActive: {
    background: '#dce8fa', border: '1px solid #4a7fc1',
  },
  projName: { flex: 1, fontSize: 13, fontWeight: 600, color: '#222' },
  projMeta: { fontSize: 10, color: '#aaa' },
  exportBtn: {
    fontSize: 10, padding: '3px 8px',
    background: '#e8f4e8', color: '#2a7a4a',
    border: '1px solid #b2d8b2', borderRadius: 4, cursor: 'pointer',
  },
  delBtn: {
    fontSize: 10, padding: '3px 8px',
    background: '#fee', color: '#c00',
    border: '1px solid #fcc', borderRadius: 4, cursor: 'pointer',
  },
  importBtn: {
    padding: '7px 14px', background: '#2a7a4a', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 12,
    whiteSpace: 'nowrap',
  },
}
