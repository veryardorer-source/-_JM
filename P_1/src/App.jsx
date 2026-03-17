import { useState } from 'react'
import { useStore } from './store/useStore.js'
import ProjectInfo from './components/ProjectInfo.jsx'
import RoomCard from './components/RoomCard.jsx'
import Summary from './components/Summary.jsx'
import GlobalItems from './components/GlobalItems.jsx'
import ProjectManager from './components/ProjectManager.jsx'
import FloorPlanAnalyzer from './components/FloorPlanAnalyzer.jsx'
import MaterialManager from './components/MaterialManager.jsx'

export default function App() {
  const { rooms, addRoom, loadSampleData } = useStore()
  const [tab, setTab] = useState('estimate') // 'estimate' | 'floorplan' | 'materials'

  return (
    <div style={styles.wrap}>
      {/* 상단 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.logo}>
            <span style={styles.logoDot}></span>
            인테리어 견적
          </h1>
          <span style={styles.version}>v1.0</span>

          {/* 탭 */}
          <div style={styles.tabs}>
            <button
              onClick={() => setTab('estimate')}
              style={tab === 'estimate' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            >견적 작성</button>
            <button
              onClick={() => setTab('floorplan')}
              style={tab === 'floorplan' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            >📐 도면 분석</button>
            <button
              onClick={() => setTab('materials')}
              style={tab === 'materials' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            >⚙️ 자재·시공 설정</button>
          </div>

          <ProjectManager />
          <button onClick={loadSampleData} style={styles.sampleBtn}>샘플 데이터</button>
        </div>
      </header>

      {tab === 'estimate' ? (
        <div style={styles.layout}>
          {/* 메인 영역 */}
          <main style={styles.main}>
            <ProjectInfo />

            <div style={styles.roomHeader}>
              <h2 style={styles.sectionTitle}>실 목록</h2>
              <button onClick={addRoom} style={styles.addBtn}>+ 실 추가</button>
            </div>

            {rooms.length === 0 ? (
              <div style={styles.empty}>
                <p>실을 추가해 견적을 시작하세요.</p>
                <button onClick={addRoom} style={styles.addBtnLg}>+ 첫 번째 실 추가</button>
              </div>
            ) : (
              rooms.map(room => <RoomCard key={room.id} room={room} />)
            )}

            <GlobalItems />
          </main>

          {/* 사이드 요약 */}
          <aside style={styles.aside}>
            <Summary />
          </aside>
        </div>
      ) : tab === 'floorplan' ? (
        <div style={styles.floorplanWrap}>
          <FloorPlanAnalyzer onImported={() => setTab('estimate')} />
        </div>
      ) : (
        <div style={styles.floorplanWrap}>
          <MaterialManager />
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { minHeight: '100vh', background: 'linear-gradient(160deg, #eef2f7 0%, #e8edf5 100%)' },
  header: {
    background: 'linear-gradient(135deg, #1a3a6e 0%, #2563c0 100%)',
    padding: '0 28px',
    boxShadow: '0 4px 20px rgba(30,64,120,0.35)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  headerInner: {
    maxWidth: 1400, margin: '0 auto',
    display: 'flex', alignItems: 'center', gap: 14,
    height: 58,
  },
  logo: {
    fontSize: 17, fontWeight: 800, color: '#fff',
    letterSpacing: '-0.3px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  logoDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
    display: 'inline-block', flexShrink: 0,
  },
  version: {
    fontSize: 10, color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 10, padding: '1px 7px',
  },
  tabs: { display: 'flex', gap: 2, marginLeft: 8 },
  tab: {
    fontSize: 12, padding: '6px 16px',
    background: 'transparent', color: 'rgba(255,255,255,0.6)',
    border: 'none', borderRadius: 20, cursor: 'pointer',
    fontWeight: 500, transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.18)',
    color: '#fff', fontWeight: 700,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.25)',
  },
  layout: {
    maxWidth: 1400, margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 330px',
    gap: 18, padding: '20px 20px',
    alignItems: 'start',
  },
  main: {},
  aside: { position: 'sticky', top: 76 },
  floorplanWrap: { maxWidth: 1400, margin: '0 auto', padding: '20px 20px' },
  roomHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.6px',
  },
  sampleBtn: {
    marginLeft: 'auto',
    fontSize: 11, padding: '5px 12px',
    background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, cursor: 'pointer',
  },
  addBtn: {
    fontSize: 12, padding: '7px 18px',
    background: 'linear-gradient(135deg, #1e4078, #2d62b8)',
    color: '#fff', border: 'none', borderRadius: 20,
    cursor: 'pointer', fontWeight: 600,
    boxShadow: '0 2px 8px rgba(30,64,120,0.3)',
  },
  empty: {
    textAlign: 'center', padding: '60px 40px',
    background: '#fff', borderRadius: 16,
    color: '#94a3b8', fontSize: 14,
    boxShadow: '0 4px 20px rgba(30,64,120,0.08)',
    border: '1px solid #e2e8f0',
  },
  addBtnLg: {
    marginTop: 16, fontSize: 14, padding: '11px 28px',
    background: 'linear-gradient(135deg, #1e4078, #2d62b8)',
    color: '#fff', border: 'none', borderRadius: 24,
    cursor: 'pointer', fontWeight: 700,
    boxShadow: '0 4px 14px rgba(30,64,120,0.3)',
  },
}
