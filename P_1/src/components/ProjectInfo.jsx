import { useStore } from '../store/useStore.js'

export default function ProjectInfo() {
  const { project, setProject } = useStore()

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>프로젝트 정보</h2>
      <div style={styles.grid}>
        <Field label="현장명" value={project.siteName}
          onChange={v => setProject({ siteName: v })} />
        <Field label="고객명" value={project.clientName}
          onChange={v => setProject({ clientName: v })} />
        <Field label="담당자" value={project.manager}
          onChange={v => setProject({ manager: v })} />
        <Field label="작성일" value={project.date} type="date"
          onChange={v => setProject({ date: v })} />
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  )
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e4078',
    marginBottom: 12,
    borderBottom: '2px solid #1e4078',
    paddingBottom: 6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px 16px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 11, color: '#666', fontWeight: 600 },
  input: {
    border: '1px solid #d0d7e3',
    borderRadius: 4,
    padding: '5px 8px',
    fontSize: 13,
    outline: 'none',
  },
}
