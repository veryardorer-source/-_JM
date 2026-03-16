import { calcLinearCombo } from './calculations.js'

// roomData: Summary.jsx에서 계산된 배열
// { room, surfaceData, doorItems, lightingItems, moldingItems, partitionData, roomTotal }
export function generatePDF(project, roomData, grandAggregate, grandTotal) {
  const lines = []

  // ── 스타일 ──────────────────────────────────────
  lines.push(`
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: '맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 10pt; color: #222; }
      h1  { font-size: 18pt; text-align: center; padding: 12px 0 6px; letter-spacing: 6px; }
      .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      .info-table td { padding: 4px 8px; border: 1px solid #bbb; font-size: 9.5pt; }
      .info-table .lbl { background: #dce6f1; font-weight: bold; width: 70px; }
      .section-title { background: #1e4078; color: #fff; font-size: 11pt; font-weight: bold;
                        padding: 4px 10px; margin: 14px 0 4px; }
      table.mat { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
      table.mat th { background: #3c64a0; color: #fff; font-size: 9pt; padding: 4px 5px; border: 1px solid #2a4a80; }
      table.mat td { font-size: 9pt; padding: 3px 5px; border: 1px solid #ccc; }
      table.mat tr:nth-child(even) td { background: #f4f7fb; }
      table.mat .sf-lbl { font-weight: bold; color: #1e4078; background: #eef2f8; }
      table.mat .subtot td { background: #dce6f1; font-weight: bold; }
      table.mat .r { text-align: right; }
      table.mat .c { text-align: center; }
      .grand { margin-top: 12px; border: 2px solid #1e4078; padding: 6px 12px; text-align: right;
               font-size: 12pt; font-weight: bold; color: #1e4078; }
      @media print {
        @page { size: A4; margin: 12mm 10mm; }
        .no-print { display: none; }
      }
    </style>
  `)

  // ── 헤더 ────────────────────────────────────────
  lines.push(`<h1>내 역 서</h1>`)
  lines.push(`<table class="info-table">
    <tr>
      <td class="lbl">수 신</td><td>${project.clientName || ''}</td>
      <td class="lbl">작성일</td><td>${project.date || ''}</td>
    </tr>
    <tr>
      <td class="lbl">공사명</td><td colspan="3">${project.siteName || ''}</td>
    </tr>
    <tr>
      <td class="lbl">담 당</td><td colspan="3">${project.manager || ''}</td>
    </tr>
  </table>`)

  let calcTotal = 0

  roomData.forEach(({ room, surfaceData, doorItems, lightingItems, partitionData, roomTotal }, ri) => {
    const hasContent = surfaceData.length > 0 || doorItems.length > 0 || lightingItems.length > 0 || partitionData.length > 0
    if (!hasContent) return
    calcTotal += roomTotal

    const dimStr = (room.widthM > 0 && room.depthM > 0)
      ? ` (${room.widthM}×${room.depthM}×H${room.heightM}m)`
      : ''

    lines.push(`<div class="section-title">[${ri + 1}] ${room.name}${dimStr}</div>`)
    lines.push(`<table class="mat">
      <thead><tr>
        <th style="width:12%">구분</th>
        <th style="width:26%">자재명</th>
        <th style="width:18%">규격</th>
        <th style="width:8%" class="r">수량</th>
        <th style="width:7%" class="c">단위</th>
        <th style="width:15%" class="r">단가(원)</th>
        <th style="width:14%" class="r">금액(원)</th>
      </tr></thead>
      <tbody>`)

    // 면(surface) 항목
    surfaceData.forEach(({ sf, items }) => {
      items.forEach((item, idx) => {
        lines.push(`<tr>
          <td class="sf-lbl">${idx === 0 ? sf.label : ''}</td>
          <td>${item.name}</td>
          <td>${item.spec || ''}</td>
          <td class="r">${item.qty ?? ''}</td>
          <td class="c">${item.unit || ''}</td>
          <td class="r">${item.unitPrice ? Number(item.unitPrice).toLocaleString() : '-'}</td>
          <td class="r">${item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
        </tr>`)
      })
    })

    // 칸막이벽 항목
    partitionData.forEach(({ partition, items }) => {
      items.forEach((item, idx) => {
        lines.push(`<tr>
          <td class="sf-lbl">${idx === 0 ? (partition.name || '칸막이') : ''}</td>
          <td>${item.name}</td>
          <td>${item.spec || ''}</td>
          <td class="r">${item.qty ?? ''}</td>
          <td class="c">${item.unit || ''}</td>
          <td class="r">${item.unitPrice ? Number(item.unitPrice).toLocaleString() : '-'}</td>
          <td class="r">${item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
        </tr>`)
      })
    })

    // 도어 항목
    doorItems.forEach((item, idx) => {
      lines.push(`<tr>
        <td class="sf-lbl">${idx === 0 ? '도어' : ''}</td>
        <td>${item.name}</td>
        <td></td>
        <td class="r">${item.qty}</td>
        <td class="c">${item.unit}</td>
        <td class="r">${item.unitPrice > 0 ? Number(item.unitPrice).toLocaleString() : '-'}</td>
        <td class="r">${item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
      </tr>`)
    })

    // 조명 항목 (T5/T7 사이즈별 breakdown 포함)
    lightingItems.forEach((item, idx) => {
      const isLinear = item.name.includes('T5') || item.name.includes('T7')
      const combo = isLinear && item.totalLengthMm > 0 ? calcLinearCombo(item.totalLengthMm) : null

      if (isLinear && combo && combo.items.length > 0) {
        // T5/T7: 사이즈별 행으로 분리 출력
        combo.items.forEach((c, ci) => {
          lines.push(`<tr>
            <td class="sf-lbl">${idx === 0 && ci === 0 ? '조명' : ''}</td>
            <td>${item.name} ${c.size}mm</td>
            <td>${item.spec || ''}</td>
            <td class="r">${c.count}</td>
            <td class="c">EA</td>
            <td class="r">-</td>
            <td class="r">-</td>
          </tr>`)
        })
      } else {
        lines.push(`<tr>
          <td class="sf-lbl">${idx === 0 ? '조명' : ''}</td>
          <td>${item.name}</td>
          <td>${item.spec || ''}</td>
          <td class="r">${item.qty}</td>
          <td class="c">EA</td>
          <td class="r">-</td>
          <td class="r">-</td>
        </tr>`)
      }
    })

    lines.push(`</tbody>
      <tfoot><tr class="subtot">
        <td colspan="5" style="text-align:right; font-weight:bold">소 계</td>
        <td></td>
        <td class="r">${Math.round(roomTotal).toLocaleString()}</td>
      </tr></tfoot>
    </table>`)
  })

  lines.push(`<div class="grand">합 계 (재료비): ${Math.round(grandTotal ?? calcTotal).toLocaleString()} 원</div>`)

  // ── 전체 자재 합계표 ─────────────────────────────
  if (grandAggregate && grandAggregate.length > 0) {
    lines.push(`<div class="section-title">전체 자재 합계</div>`)
    lines.push(`<table class="mat">
      <thead><tr>
        <th style="width:50%">자재명</th>
        <th style="width:20%" class="r">수량</th>
        <th style="width:10%" class="c">단위</th>
        <th style="width:20%" class="r">참고금액(원)</th>
      </tr></thead>
      <tbody>`)
    grandAggregate.forEach(item => {
      const qty = item.unit === 'm'
        ? (Math.round(item.qty * 10) / 10).toFixed(1)
        : item.unit === '㎡'
        ? (Math.round(item.qty * 100) / 100).toFixed(2)
        : Math.round(item.qty)
      lines.push(`<tr>
        <td>${item.name}</td>
        <td class="r">${qty}</td>
        <td class="c">${item.unit}</td>
        <td class="r">${item.cost > 0 ? Math.round(item.cost).toLocaleString() : '-'}</td>
      </tr>`)
    })
    lines.push(`</tbody>
      <tfoot><tr class="subtot">
        <td colspan="3" style="text-align:right; font-weight:bold">합 계</td>
        <td class="r">${Math.round(grandTotal).toLocaleString()}</td>
      </tr></tfoot>
    </table>`)
  }

  // ── 새 창에서 출력 ──────────────────────────────
  const win = window.open('', '_blank', 'width=800,height=900')
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${project.siteName || '견적서'} 내역서</title>
    ${lines[0]}
  </head><body>
    <div class="no-print" style="padding:10px; text-align:center">
      <button onclick="window.print()" style="padding:8px 24px; font-size:13px; cursor:pointer; margin-right:8px">🖨️ 인쇄 / PDF 저장</button>
      <button onclick="window.close()" style="padding:8px 16px; font-size:13px; cursor:pointer">닫기</button>
    </div>
    ${lines.slice(1).join('\n')}
  </body></html>`)
  win.document.close()
}
