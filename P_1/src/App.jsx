import { useState } from 'react'
import { useStore } from './store/useStore.js'
import ProjectInfo from './components/ProjectInfo.jsx'
import RoomCard from './components/RoomCard.jsx'
import Summary from './components/Summary.jsx'
import GlobalItems from './components/GlobalItems.jsx'
import ProjectManager from './components/ProjectManager.jsx'
import FloorPlanAnalyzer from './components/FloorPlanAnalyzer.jsx'

export default function App() {
  const { rooms, addRoom, loadSampleData } = useStore()
  const [tab, setTab] = useState('estimate') // 'estimate' | 'floorplan'

  return (
    <div style={styles.wrap}>
      {/* 상단 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.logo}>인테리어 견적 프로그램</h1>
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
      ) : (
        <div style={styles.floorplanWrap}>
          <FloorPlanAnalyzer />
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { minHeight: '100vh', background: '#f0f2f5' },
  header: {
    background: '#1e4078',
    padding: '0 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  headerInner: {
    maxWidth: 1400, margin: '0 auto',
    display: 'flex', alignItems: 'center', gap: 12,
    height: 52,
  },
  logo: { fontSize: 18, fontWeight: 800, color: '#fff' },
  version: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  tabs: { display: 'flex', gap: 4 },
  tab: {
    fontSize: 12, padding: '5px 14px',
    background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, cursor: 'pointer',
  },
  tabActive: {
    background: '#fff', color: '#1e4078',
    fontWeight: 700,
  },
  layout: {
    maxWidth: 1400, margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 16, padding: 16,
    alignItems: 'start',
  },
  main: {},
  aside: { position: 'sticky', top: 68 },
  floorplanWrap: {
    maxWidth: 1400, margin: '0 auto',
    padding: 16,
  },
  roomHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: '#333',
  },
  sampleBtn: {
    marginLeft: 'auto',
    fontSize: 11, padding: '4px 10px',
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, cursor: 'pointer',
  },
  addBtn: {
    fontSize: 12, padding: '6px 14px',
    background: '#1e4078', color: '#fff',
    border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600,
  },
  empty: {
    textAlign: 'center', padding: 60,
    background: '#fff', borderRadius: 8,
    color: '#aaa', fontSize: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  addBtnLg: {
    marginTop: 16, fontSize: 14, padding: '10px 24px',
    background: '#1e4078', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700,
  },
}
