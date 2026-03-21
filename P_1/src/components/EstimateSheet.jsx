import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { TRADE_ORDER } from '../utils/generateEstimate.js'
import { exportToExcel } from '../utils/excelExport.js'

const CLR = {
  header: '#1E4078',
  tradeBg: '#EEF4FB',
  subtotal: '#D9E1F2',
  grand: '#FFF9C4',
  inputBg: '#F8FAFC',
}

function NumInput({ value, onChange, style = {} }) {
  return (
    <input
      type="number"
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={e => onChange(Number(e.target.value) || 0)}
      style={{ width: '100%', textAlign: 'right', padding: '2px 4px', border: '1px solid #CBD5E1', borderRadius: 3, fontSize: 12, background: '#FFFDE7', ...style }}
    />
  )
}

function calcItem(item) {
  const q = item.qty || 0
  const mat = (item.matUnitPrice || 0) * q
  const lab = (item.labUnitPrice || 0) * q
  const exp = (item.expUnitPrice || 0) * q
  return { mat, lab, exp, total: mat + lab + exp }
}

function calcTotals(items) {
  let totalMat = 0, totalLab = 0, totalExp = 0
  items.forEach(it => {
    const c = calcItem(it)
    totalMat += c.mat; totalLab += c.lab; totalExp += c.exp
  })
  return { totalMat, totalLab, totalExp, directTotal: totalMat + totalLab + totalExp }
}

export default function EstimateSheet() {
  const {
    project, rooms, globalItems,
    estimateItems, discount,
    generateEstimateItems: generateAction,
    updateEstimateItem, addEstimateItemToTrade, deleteEstimateItem, setDiscount,
    customMaterials, priceOverrides,
  } = useStore()

  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    if (estimateItems.length > 0) {
      if (!confirm('견적서를 재생성하면 수량이 업데이트됩니다.\n(입력한 단가는 유지됩니다) 계속할까요?')) return
    }
    setGenerating(true)
    setTimeout(() => {
      generateAction({ customMaterials, priceOverrides })
      setGenerating(false)
    }, 50)
  }

  // Group items by trade
  const grouped = {}
  TRADE_ORDER.forEach(t => { grouped[t] = [] })
  estimateItems.forEach(it => {
    if (!grouped[it.trade]) grouped[it.trade] = []
    grouped[it.trade].push(it)
  })

  const activeTrades = TRADE_ORDER.filter(t => (grouped[t] || []).length > 0)
  const allItems = estimateItems
  const { totalMat, totalLab, totalExp, directTotal } = calcTotals(allItems)

  const employment = Math.round(totalLab * 0.0101)
  const industrial = Math.round(totalLab * 0.0356)
  const management = Math.round(directTotal * 0.05)
  const profit = Math.round(directTotal * 0.10)
  const indirectTotal = employment + industrial + management + profit
  const constructionTotal = Math.floor((directTotal + indirectTotal) / 1000) * 1000
  const afterDiscount = constructionTotal - (discount || 0)
  const vat = Math.round(afterDiscount * 0.1 / 1000) * 1000
  const grandTotal = afterDiscount + vat

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 2px 8px rgba(30,64,120,0.08)', border: '1px solid #E2E8F0' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1E4078' }}>{project.siteName || '(공사명 미입력)'}</span>
          {project.clientName && <span style={{ marginLeft: 12, fontSize: 13, color: '#64748B' }}>발주처: {project.clientName}</span>}
          {project.date && <span style={{ marginLeft: 12, fontSize: 12, color: '#94A3B8' }}>{project.date}</span>}
        </div>
        <div style={{ fontSize: 13, color: '#475569' }}>
          총 항목 <strong>{allItems.length}</strong>개
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #1E4078, #2D62B8)', color: '#fff', border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(30,64,120,0.3)' }}
        >
          {generating ? '생성 중...' : rooms.length === 0 ? '실을 먼저 추가하세요' : estimateItems.length === 0 ? '견적서 생성' : '견적서 재생성'}
        </button>
        <button
          onClick={() => exportToExcel(project, estimateItems, discount)}
          disabled={estimateItems.length === 0}
          style={{ padding: '8px 18px', background: estimateItems.length === 0 ? '#94A3B8' : 'linear-gradient(135deg, #15803D, #16A34A)', color: '#fff', border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: estimateItems.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          엑셀 저장
        </button>
      </div>

      {estimateItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: 12, color: '#94A3B8', boxShadow: '0 2px 8px rgba(30,64,120,0.06)', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 16, marginBottom: 8 }}>견적서가 없습니다</p>
          <p style={{ fontSize: 13 }}>실 정보를 입력한 후 "견적서 생성" 버튼을 누르세요</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
          {/* Main table */}
          <div>
            {activeTrades.map(trade => {
              const items = grouped[trade] || []
              const { totalMat: tMat, totalLab: tLab, totalExp: tExp, directTotal: tTotal } = calcTotals(items)
              return (
                <div key={trade} style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(30,64,120,0.06)' }}>
                  {/* Trade header */}
                  <div style={{ background: CLR.header, color: '#fff', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{trade}</span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>{tTotal.toLocaleString()} 원</span>
                  </div>
                  {/* Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: CLR.tradeBg }}>
                          {['품명','규격','단위','수량','재료비단가','재료비금액','노무비단가','노무비금액','경비단가','경비금액','합계',''].map((h, i) => (
                            <th key={i} style={{ padding: '5px 6px', textAlign: i >= 4 && i <= 10 ? 'right' : 'center', fontSize: 11, color: '#475569', fontWeight: 600, borderBottom: '1px solid #CBD5E1', whiteSpace: 'nowrap', minWidth: i === 0 ? 140 : i === 1 ? 80 : i === 11 ? 28 : 80 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const c = calcItem(item)
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '3px 6px' }}>
                                <input value={item.name} onChange={e => updateEstimateItem(item.id, { name: e.target.value })} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 3, padding: '2px 4px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '3px 6px' }}>
                                <input value={item.spec} onChange={e => updateEstimateItem(item.id, { spec: e.target.value })} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 3, padding: '2px 4px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                                <input value={item.unit} onChange={e => updateEstimateItem(item.id, { unit: e.target.value })} style={{ width: 44, textAlign: 'center', border: '1px solid #E2E8F0', borderRadius: 3, padding: '2px 4px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '3px 6px', width: 72 }}>
                                <NumInput value={item.qty} onChange={v => updateEstimateItem(item.id, { qty: v })} />
                              </td>
                              <td style={{ padding: '3px 6px', width: 88 }}>
                                <NumInput value={item.matUnitPrice} onChange={v => updateEstimateItem(item.id, { matUnitPrice: v })} />
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', color: c.mat ? '#1E4078' : '#CBD5E1', fontWeight: c.mat ? 600 : 400 }}>{c.mat ? c.mat.toLocaleString() : '-'}</td>
                              <td style={{ padding: '3px 6px', width: 88 }}>
                                <NumInput value={item.labUnitPrice} onChange={v => updateEstimateItem(item.id, { labUnitPrice: v })} />
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', color: c.lab ? '#15803D' : '#CBD5E1', fontWeight: c.lab ? 600 : 400 }}>{c.lab ? c.lab.toLocaleString() : '-'}</td>
                              <td style={{ padding: '3px 6px', width: 88 }}>
                                <NumInput value={item.expUnitPrice} onChange={v => updateEstimateItem(item.id, { expUnitPrice: v })} />
                              </td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', color: c.exp ? '#B45309' : '#CBD5E1' }}>{c.exp ? c.exp.toLocaleString() : '-'}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: c.total ? '#1E4078' : '#CBD5E1' }}>{c.total ? c.total.toLocaleString() : '-'}</td>
                              <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                                <button onClick={() => deleteEstimateItem(item.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: CLR.subtotal }}>
                          <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: '#475569' }}>[소 계]</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#1E4078' }}>{tMat ? tMat.toLocaleString() : '-'}</td>
                          <td></td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#15803D' }}>{tLab ? tLab.toLocaleString() : '-'}</td>
                          <td></td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#B45309' }}>{tExp ? tExp.toLocaleString() : '-'}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{tTotal.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div style={{ padding: '6px 12px' }}>
                    <button
                      onClick={() => addEstimateItemToTrade(trade)}
                      style={{ fontSize: 12, color: '#1E4078', background: '#EEF4FB', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 12px', cursor: 'pointer' }}
                    >
                      + 항목 추가
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary panel */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: 16, boxShadow: '0 2px 8px rgba(30,64,120,0.08)', position: 'sticky', top: 76 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>견적 합계</h3>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 0', color: '#64748B' }}>재 료 비</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{totalMat.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 0', color: '#64748B' }}>노 무 비</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{totalLab.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '5px 0', color: '#64748B' }}>경 비</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{totalExp.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                  <td style={{ padding: '6px 0', fontWeight: 700 }}>순 공 사 비</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{directTotal.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>고용보험 1.01%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8', fontSize: 11 }}>{employment.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>산재보험 3.56%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8', fontSize: 11 }}>{industrial.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>일반관리비 5%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8', fontSize: 11 }}>{management.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>이 윤 10%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8', fontSize: 11 }}>{profit.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                  <td style={{ padding: '6px 0', fontWeight: 700 }}>총 공 사 비</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{constructionTotal.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 0', color: '#64748B' }}>D / C</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      value={discount || ''}
                      placeholder="0"
                      onChange={e => setDiscount(Number(e.target.value) || 0)}
                      style={{ width: 100, textAlign: 'right', border: '1px solid #CBD5E1', borderRadius: 4, padding: '2px 6px', fontSize: 12, background: '#FFFDE7' }}
                    />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>부가세 10%</td>
                  <td style={{ textAlign: 'right', color: '#94A3B8', fontSize: 11 }}>{vat.toLocaleString()}</td>
                </tr>
                <tr style={{ background: '#FFF9C4' }}>
                  <td style={{ padding: '8px 0', fontWeight: 800, fontSize: 14, color: '#1E4078' }}>[ 합 계 ]</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#15803D' }}>{grandTotal.toLocaleString()} 원</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
