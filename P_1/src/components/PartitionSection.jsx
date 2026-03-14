import { useStore } from '../store/useStore.js'
import { HAPAN } from '../data/materials.js'
import { calcPartitionCost, calcPartitionHapanSheets } from '../utils/partitionCost.js'

export default function PartitionSection({ room }) {
  const { addPartition, updatePartition, deletePartition } = useStore()
  const partitions = room.partitions || []

  return (
    <div style={s.section}>
      <div style={s.header}>
        <span style={s.title}>신규 칸막이벽 (합판 연결재)</span>
        <span style={s.hint}>각재·석고·마감재는 각 실 벽면에서 계산 — 여기선 합판만</span>
        <button onClick={() => addPartition(room.id)} style={s.addBtn}>+ 추가</button>
      </div>
      {partitions.length > 0 && (
        <div>
          <div style={s.thead}>
            <span style={{ width: 90 }}>이름</span>
            <span style={{ width: 68 }}>길이(mm)</span>
            <span style={{ width: 68 }}>높이(mm)</span>
            <span style={{ flex: 1 }}>합판 종류</span>
            <span style={{ width: 110, textAlign: 'center' }}>개소 / 장수</span>
            <span style={{ width: 80, textAlign: 'right' }}>금액</span>
            <span style={{ width: 24 }} />
          </div>
          {partitions.map(p => (
            <PartitionRow
              key={p.id}
              room={room}
              partition={p}
              onUpdate={(f) => updatePartition(room.id, p.id, f)}
              onDelete={() => deletePartition(room.id, p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PartitionRow({ room, partition, onUpdate, onDelete }) {
  const heightM = partition.heightM > 0 ? partition.heightM : room.heightM
  const { positions, sheets } = calcPartitionHapanSheets(partition.lengthM || 0, heightM)
  const result = calcPartitionCost(room, partition)
  const hapan = HAPAN.find(h => h.id === (partition.hapanId || 'hp_normal_4')) || HAPAN[0]

  return (
    <div style={s.row}>
      <input
        value={partition.name}
        onChange={e => onUpdate({ name: e.target.value })}
        style={{ ...s.inp, width: 88, fontWeight: 600 }}
      />
      <input
        type="number" min="0" step="1"
        value={partition.lengthM ? Math.round(partition.lengthM * 1000) : ''}
        placeholder="0"
        onChange={e => onUpdate({ lengthM: Number(e.target.value) / 1000 })}
        style={{ ...s.inp, width: 66, textAlign: 'center' }}
      />
      <input
        type="number" min="0" step="1"
        value={partition.heightM ? Math.round(partition.heightM * 1000) : ''}
        placeholder={String(Math.round(room.heightM * 1000))}
        onChange={e => onUpdate({ heightM: Number(e.target.value) / 1000 })}
        style={{ ...s.inp, width: 66, textAlign: 'center' }}
      />
      <select
        value={partition.hapanId || 'hp_normal_4'}
        onChange={e => onUpdate({ hapanId: e.target.value })}
        style={{ ...s.inp, flex: 1 }}
      >
        {HAPAN.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>

      <div style={{ width: 110, textAlign: 'center', fontSize: 11, color: '#555' }}>
        {positions > 0
          ? <><span style={s.badge}>{positions}개소</span> <span style={s.badge}>{sheets}장</span></>
          : <span style={{ color: '#bbb' }}>-</span>}
      </div>

      <div style={{ width: 80, textAlign: 'right', fontSize: 12, fontWeight: 700, color: result.total > 0 ? '#1e4078' : '#bbb' }}>
        {result.total > 0 ? result.total.toLocaleString() + '원' : '-'}
      </div>
      <button onClick={onDelete} style={s.btnDel}>✕</button>
    </div>
  )
}

const s = {
  section: { marginTop: 10, borderTop: '1px dashed #dde4f0', paddingTop: 8 },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  title: { fontSize: 12, fontWeight: 700, color: '#555' },
  hint: { fontSize: 10, color: '#aaa' },
  addBtn: {
    marginLeft: 'auto',
    fontSize: 11, padding: '3px 10px',
    background: '#f0f4fa', border: '1px solid #c8d4e8',
    borderRadius: 4, cursor: 'pointer', color: '#1e4078', fontWeight: 600,
  },
  thead: {
    display: 'flex', gap: 6, alignItems: 'center',
    fontSize: 10, color: '#aaa', fontWeight: 600,
    padding: '0 4px 4px', borderBottom: '1px solid #eee',
  },
  row: {
    display: 'flex', gap: 6, alignItems: 'center',
    padding: '5px 4px', borderBottom: '1px solid #f0f4f8',
  },
  inp: { border: '1px solid #d0d7e3', borderRadius: 4, padding: '4px 5px', fontSize: 12 },
  badge: {
    display: 'inline-block', fontSize: 11, fontWeight: 700,
    color: '#1e4078', background: '#eef2f8',
    borderRadius: 3, padding: '1px 6px',
  },
  btnDel: {
    fontSize: 10, padding: '3px 7px',
    background: '#fee', border: '1px solid #fcc',
    borderRadius: 3, cursor: 'pointer', color: '#c00',
  },
}
