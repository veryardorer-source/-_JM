import { useState, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { analyzeFloorPlan, checkLlmMux } from '../utils/claudeApi.js'

const API_KEY_STORAGE = 'ip_claude_api_key'
const API_MODE_STORAGE = 'ip_claude_api_mode'  // 'direct' | 'llmmux'
const LLM_MUX_URL = 'http://localhost:8317'
const LLM_MUX_MODEL_STORAGE = 'ip_llmmux_model'
const DEFAULT_LLM_MUX_MODEL = 'anthropic/claude-3-5-sonnet-20241022'

export default function FloorPlanAnalyzer({ onImported }) {
  const { addRoomWithData } = useStore()

  const [mode, setMode] = useState(() => localStorage.getItem(API_MODE_STORAGE) || 'direct')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')
  const [apiKeySaved, setApiKeySaved] = useState(!!localStorage.getItem(API_KEY_STORAGE))
  const [llmMuxModel, setLlmMuxModel] = useState(() => localStorage.getItem(LLM_MUX_MODEL_STORAGE) || DEFAULT_LLM_MUX_MODEL)
  const [muxStatus, setMuxStatus] = useState(null) // null | 'ok' | 'error'
  const [muxStatusMsg, setMuxStatusMsg] = useState('')

  function handleModeChange(m) {
    setMode(m)
    localStorage.setItem(API_MODE_STORAGE, m)
  }
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null) // image URL
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)   // { rooms, summary }
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState([]) // 선택된 방 index 배열
  const [imported, setImported] = useState(false)
  const fileRef = useRef()

  function handleSaveKey() {
    const k = apiKey.trim()
    if (!k.startsWith('sk-ant-')) {
      alert('올바른 API 키 형식이 아닙니다. (sk-ant-... 형태)')
      return
    }
    localStorage.setItem(API_KEY_STORAGE, k)
    setApiKeySaved(true)
  }

  function handleFile(f) {
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowed.includes(f.type)) {
      alert('JPG, PNG, WebP, GIF, PDF 파일만 지원합니다.')
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
    setImported(false)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  async function handleAnalyze() {
    if (mode === 'direct' && !apiKey.trim()) { alert('API 키를 입력하세요.'); return }
    if (!file) { alert('도면 파일을 선택하세요.'); return }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const base64 = await toBase64(file)
      const baseURL = mode === 'llmmux' ? LLM_MUX_URL : ''
      const data = await analyzeFloorPlan(apiKey.trim(), base64, file.type, baseURL, llmMuxModel)
      setResult(data)
      setSelected(data.rooms.map((_, i) => i)) // 전체 선택
    } catch (e) {
      setError(e.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(i) {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  function handleImport() {
    if (selected.length === 0) { alert('추가할 실을 선택하세요.'); return }
    selected.forEach(i => {
      const r = result.rooms[i]
      addRoomWithData({
        name: r.name,
        widthM: r.widthMm > 0 ? +(r.widthMm / 1000).toFixed(3) : 0,
        depthM: r.depthMm > 0 ? +(r.depthMm / 1000).toFixed(3) : 0,
        heightM: r.heightMm > 0 ? +(r.heightMm / 1000).toFixed(3) : 2.4,
      })
    })
    setImported(true)
    if (onImported) onImported()
    else alert(`${selected.length}개 실이 견적에 추가되었습니다.`)
  }

  function toBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
  }

  return (
    <div style={s.wrap}>
      {/* 모드 선택 */}
      <div style={s.card}>
        <div style={s.cardTitle}>API 방식 선택</div>
        <div style={s.modeRow}>
          <div
            onClick={() => handleModeChange('direct')}
            style={mode === 'direct' ? { ...s.modeCard, ...s.modeActive } : s.modeCard}
          >
            <div style={s.modeIcon}>🔑</div>
            <div style={s.modeName}>직접 API 키</div>
            <div style={s.modeDesc}>Anthropic API 키로 호출<br/>도면 1장당 약 20~50원</div>
          </div>
          <div
            onClick={() => handleModeChange('llmmux')}
            style={mode === 'llmmux' ? { ...s.modeCard, ...s.modeActive } : s.modeCard}
          >
            <div style={s.modeIcon}>⚡</div>
            <div style={s.modeName}>llm-mux (무료)</div>
            <div style={s.modeDesc}>Claude Pro 구독 활용<br/>API 과금 없음</div>
          </div>
        </div>
        {mode === 'llmmux' && (
          <div style={s.llmmuxInfo}>
            <b>llm-mux 사용 조건:</b> 로컬(<code style={s.code}>npm run dev</code>)에서만 작동합니다.<br/>
            ① <code style={s.code}>llm-mux login claude</code> &nbsp;② <code style={s.code}>llm-mux</code> 실행<br/><br/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>모델명:</span>
              <input
                value={llmMuxModel}
                onChange={e => { setLlmMuxModel(e.target.value); localStorage.setItem(LLM_MUX_MODEL_STORAGE, e.target.value) }}
                style={{ ...s.code, border: '1px solid #ccc', padding: '3px 6px', borderRadius: 3, width: 280, fontSize: 11 }}
                placeholder="모델명 직접 입력"
              />
              <select onChange={e => { if (e.target.value) { setLlmMuxModel(e.target.value); localStorage.setItem(LLM_MUX_MODEL_STORAGE, e.target.value) }}} style={{ fontSize: 11, padding: '3px 5px', border: '1px solid #ccc', borderRadius: 3 }}>
                <option value="">-- 추천 모델 선택 --</option>
                <option value="anthropic/claude-3-5-sonnet-20241022">anthropic/claude-3-5-sonnet-20241022</option>
                <option value="claude/claude-3-5-sonnet-20241022">claude/claude-3-5-sonnet-20241022</option>
                <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                <option value="claude">claude</option>
              </select>
              <button onClick={async () => {
                setMuxStatus(null); setMuxStatusMsg('확인 중...')
                try {
                  const data = await checkLlmMux(LLM_MUX_URL)
                  const list = data.data || data.models || (Array.isArray(data) ? data : [])
                  const ids = list.map(m => m.id || m.name || m).filter(Boolean)
                  if (ids.length > 0) {
                    // 자동으로 첫 번째 claude 모델 선택
                    const auto = ids.find(id => /claude/i.test(id)) || ids[0]
                    setLlmMuxModel(auto)
                    localStorage.setItem(LLM_MUX_MODEL_STORAGE, auto)
                    setMuxStatus('ok')
                    setMuxStatusMsg(`연결 성공! 사용 가능한 모델: ${ids.join(', ')} → "${auto}" 자동 선택`)
                  } else {
                    setMuxStatus('ok')
                    setMuxStatusMsg(`연결 성공 (${data.format || ''}). 응답: ${JSON.stringify(data).slice(0, 200)}`)
                  }
                } catch(e) {
                  setMuxStatus('error'); setMuxStatusMsg(`연결 실패: ${e.message}`)
                }
              }} style={{ fontSize: 11, padding: '3px 10px', background: '#1e4078', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                연결 테스트
              </button>
            </div>
            {muxStatusMsg && (
              <div style={{ fontSize: 11, color: muxStatus === 'ok' ? '#2a7a4a' : muxStatus === 'error' ? '#c00' : '#888', marginTop: 2 }}>
                {muxStatusMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* API 키 (직접 모드일 때만) */}
      {mode === 'direct' && <div style={s.card}>
        <div style={s.cardTitle}>Claude API 키</div>
        <div style={s.row}>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setApiKeySaved(false) }}
            placeholder="sk-ant-..."
            style={s.keyInput}
          />
          <button onClick={handleSaveKey} style={apiKeySaved ? s.savedBtn : s.saveBtn}>
            {apiKeySaved ? '저장됨 ✓' : '저장'}
          </button>
        </div>
        <div style={s.hint}>키는 이 기기에만 저장되며 Anthropic 서버로만 전송됩니다.</div>
      </div>}

      {/* 파일 업로드 */}
      <div style={s.card}>
        <div style={s.cardTitle}>도면 업로드</div>
        <div
          style={s.dropZone}
          onClick={() => fileRef.current.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {file ? (
            <div style={s.fileInfo}>
              <span style={s.fileIcon}>{file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
              <div>
                <div style={s.fileName}>{file.name}</div>
                <div style={s.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
          ) : (
            <div style={s.dropHint}>
              <div style={s.dropIcon}>📁</div>
              <div>클릭하거나 파일을 여기에 드래그하세요</div>
              <div style={s.dropSub}>PDF · JPG · PNG · WebP</div>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {preview && (
          <img src={preview} alt="도면 미리보기" style={s.preview} />
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !file}
          style={loading || !file ? s.analyzeDisabled : s.analyzeBtn}
        >
          {loading ? '분석 중...' : '도면 분석하기'}
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={s.card}>
          <div style={s.loadingWrap}>
            <div style={s.spinner} />
            <div style={s.loadingText}>AI가 도면을 분석하고 있습니다...</div>
            <div style={s.loadingHint}>보통 10~30초 정도 소요됩니다</div>
          </div>
        </div>
      )}

      {/* 오류 */}
      {error && (
        <div style={s.errorCard}>
          <strong>오류:</strong> {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div style={s.card}>
          <div style={s.cardTitle}>분석 결과</div>
          {result.summary && <div style={s.summary}>{result.summary}</div>}

          <div style={s.resultHeader}>
            <span style={s.resultCount}>{result.rooms.length}개 공간 감지됨</span>
            <div style={s.selectBtns}>
              <button onClick={() => setSelected(result.rooms.map((_, i) => i))} style={s.selBtn}>전체선택</button>
              <button onClick={() => setSelected([])} style={s.selBtn}>전체해제</button>
            </div>
          </div>

          <div style={s.roomList}>
            {result.rooms.map((r, i) => (
              <div
                key={i}
                onClick={() => toggleSelect(i)}
                style={selected.includes(i) ? { ...s.roomItem, ...s.roomSelected } : s.roomItem}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  onChange={() => toggleSelect(i)}
                  style={s.check}
                />
                <div style={s.roomInfo}>
                  <div style={s.roomName}>{r.name}</div>
                  <div style={s.roomDim}>
                    {r.widthMm > 0 && r.depthMm > 0
                      ? `${(r.widthMm/1000).toFixed(2)}m × ${(r.depthMm/1000).toFixed(2)}m`
                      : '치수 불명확'}
                    {r.heightMm > 0 && r.heightMm !== 2400
                      ? ` · 높이 ${(r.heightMm/1000).toFixed(2)}m`
                      : ''}
                  </div>
                  {r.note && <div style={s.roomNote}>{r.note}</div>}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleImport}
            disabled={selected.length === 0 || imported}
            style={imported ? s.importedBtn : selected.length === 0 ? s.analyzeDisabled : s.importBtn}
          >
            {imported ? '추가 완료 ✓' : `선택한 ${selected.length}개 실 → 견적에 추가`}
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 },
  modeRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  modeCard: {
    border: '2px solid #e0e8f4', borderRadius: 8, padding: '14px 16px',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
    background: '#f7f9fc',
  },
  modeActive: { border: '2px solid #1e4078', background: '#dce8fa' },
  modeIcon: { fontSize: 24, marginBottom: 6 },
  modeName: { fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 4 },
  modeDesc: { fontSize: 11, color: '#666', lineHeight: 1.5 },
  llmmuxInfo: {
    marginTop: 12, padding: '10px 12px',
    background: '#fffbe6', border: '1px solid #ffe58f',
    borderRadius: 6, fontSize: 11, color: '#555', lineHeight: 1.8,
  },
  code: {
    background: '#f0f0f0', padding: '1px 5px',
    borderRadius: 3, fontFamily: 'monospace', fontSize: 11,
  },
  card: {
    background: '#fff', borderRadius: 10,
    padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#1e4078', marginBottom: 12 },
  row: { display: 'flex', gap: 8 },
  keyInput: {
    flex: 1, border: '1px solid #c8d4e8', borderRadius: 5,
    padding: '8px 12px', fontSize: 13, fontFamily: 'monospace',
  },
  saveBtn: {
    padding: '8px 16px', background: '#1e4078', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
  },
  savedBtn: {
    padding: '8px 16px', background: '#2a7a4a', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'default', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
  },
  hint: { fontSize: 11, color: '#aaa', marginTop: 6 },
  dropZone: {
    border: '2px dashed #c8d4e8', borderRadius: 8,
    padding: '24px 16px', textAlign: 'center',
    cursor: 'pointer', marginBottom: 12,
    background: '#f7f9fc',
    transition: 'border-color 0.2s',
  },
  dropHint: { color: '#888', fontSize: 13 },
  dropIcon: { fontSize: 32, marginBottom: 8 },
  dropSub: { fontSize: 11, color: '#bbb', marginTop: 4 },
  fileInfo: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' },
  fileIcon: { fontSize: 32 },
  fileName: { fontSize: 13, fontWeight: 600, color: '#222' },
  fileSize: { fontSize: 11, color: '#aaa' },
  preview: { width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 6, marginBottom: 12 },
  analyzeBtn: {
    width: '100%', padding: '11px', fontSize: 14, fontWeight: 700,
    background: '#1e4078', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  analyzeDisabled: {
    width: '100%', padding: '11px', fontSize: 14, fontWeight: 700,
    background: '#c8d4e8', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'default',
  },
  loadingWrap: { textAlign: 'center', padding: '20px 0' },
  spinner: {
    width: 32, height: 32, margin: '0 auto 12px',
    border: '3px solid #e0e8f4',
    borderTop: '3px solid #1e4078',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: 14, fontWeight: 600, color: '#333' },
  loadingHint: { fontSize: 12, color: '#aaa', marginTop: 4 },
  errorCard: {
    background: '#fff5f5', border: '1px solid #fcc', borderRadius: 8,
    padding: '14px 16px', fontSize: 13, color: '#c00',
  },
  summary: {
    fontSize: 12, color: '#666', background: '#f7f9fc',
    borderRadius: 5, padding: '8px 12px', marginBottom: 12,
  },
  resultHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  resultCount: { fontSize: 13, fontWeight: 700, color: '#333' },
  selectBtns: { display: 'flex', gap: 6 },
  selBtn: {
    fontSize: 11, padding: '3px 10px',
    background: '#f0f4fa', color: '#555',
    border: '1px solid #c8d4e8', borderRadius: 4, cursor: 'pointer',
  },
  roomList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  roomItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 7,
    border: '1px solid #e0e8f4', cursor: 'pointer',
    background: '#f7f9fc',
  },
  roomSelected: { background: '#dce8fa', border: '1px solid #4a7fc1' },
  check: { width: 15, height: 15, cursor: 'pointer', accentColor: '#1e4078' },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 13, fontWeight: 700, color: '#222' },
  roomDim: { fontSize: 12, color: '#555', marginTop: 2 },
  roomNote: { fontSize: 11, color: '#888', marginTop: 2 },
  importBtn: {
    width: '100%', padding: '11px', fontSize: 14, fontWeight: 700,
    background: '#2a7a4a', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  importedBtn: {
    width: '100%', padding: '11px', fontSize: 14, fontWeight: 700,
    background: '#aaa', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'default',
  },
}
