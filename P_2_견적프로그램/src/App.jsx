import { useState } from 'react'
import { useStore } from './store/useStore.js'
import RoomCard from './components/RoomCard.jsx'
import QuantityPanel from './components/QuantityPanel.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'

export default function App() {
  const { rooms, addRoom, clearAll } = useStore()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <h1 style={s.logo}>물량산출</h1>
        <div style={s.actions}>
          <button onClick={() => setShowSettings(true)} style={s.btnSettings}>⚙ 설정</button>
          <button onClick={addRoom} style={s.btnAdd}>+ 공간 추가</button>
          <button onClick={() => { if (confirm('전체 초기화하시겠습니까?')) clearAll() }} style={s.btnClear}>초기화</button>
        </div>
      </header>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <div style={s.layout}>
        <main style={s.main}>
          {rooms.length === 0 ? (
            <div style={s.empty}>
              <p style={s.emptyText}>공간을 추가해 물량산출을 시작하세요</p>
              <button onClick={addRoom} style={s.btnAddLg}>+ 공간 추가</button>
            </div>
          ) : (
            rooms.map(room => <RoomCard key={room.id} room={room} />)
          )}
        </main>
        <aside style={s.aside}>
          <QuantityPanel />
        </aside>
      </div>
    </div>
  )
}

const s = {
  wrap: { minHeight: '100vh', background: '#f0f4f8' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1a3a6e 0%, #2563c0 100%)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  logo: { fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' },
  actions: { display: 'flex', gap: 8 },
  btnSettings: {
    padding: '8px 18px', background: 'rgba(255,255,255,0.2)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  },
  btnAdd: {
    padding: '8px 18px', background: 'rgba(255,255,255,0.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  },
  btnClear: {
    padding: '8px 18px', background: 'transparent', color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, cursor: 'pointer',
    fontSize: 13,
  },
  layout: { display: 'flex', gap: 16, padding: '16px 16px', alignItems: 'flex-start', maxWidth: 1600, margin: '0 auto' },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  aside: { width: 380, flexShrink: 0, position: 'sticky', top: 16 },
  empty: { textAlign: 'center', padding: '80px 20px' },
  emptyText: { color: '#94a3b8', fontSize: 15, marginBottom: 20 },
  btnAddLg: {
    padding: '12px 32px', background: '#2563c0', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700,
  },
}
