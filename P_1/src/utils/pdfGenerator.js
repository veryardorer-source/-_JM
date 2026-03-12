import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calcSurfaceCost } from './surfaceCost.js'
import { formatWon } from './calculations.js'

export function generatePDF(project, rooms) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── 폰트 설정 (한글 지원을 위해 기본 폰트 사용, 영문/숫자 위주)
  doc.setFont('helvetica')

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15

  // ── 헤더 ──
  doc.setFillColor(30, 64, 120)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('Interior Estimate', margin, 12)
  doc.setFontSize(9)
  doc.text('\xC778\xD14C\xB9AC\xC5B4 \uACAC\xC801\xC11C', margin, 20)

  // ── 프로젝트 정보 ──
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  let y = 35

  const info = [
    ['현장명', project.siteName || '-'],
    ['고객명', project.clientName || '-'],
    ['담당자', project.manager || '-'],
    ['작성일', project.date || '-'],
  ]
  info.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, margin + 20, y)
    y += 6
  })

  y += 4
  doc.setDrawColor(180, 180, 180)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ── 실별 견적 테이블 ──
  let grandTotal = 0

  rooms.forEach((room, ri) => {
    const roomRows = []
    let roomTotal = 0

    room.surfaces.forEach((sf) => {
      if (!sf.enabled) return
      const result = calcSurfaceCost(room, sf)
      if (!result || result.items.length === 0) return

      result.items.forEach((item, idx) => {
        roomRows.push([
          idx === 0 ? sf.label : '',
          item.name,
          item.spec || '',
          item.qty,
          item.unit,
          item.unitPrice ? Number(item.unitPrice).toLocaleString() : '-',
          Number(item.cost).toLocaleString(),
        ])
        roomTotal += item.cost
      })
    })

    if (roomRows.length === 0) return

    // 실 제목
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 120)
    doc.text(`[${ri + 1}] ${room.name}  (${room.widthM}m x ${room.depthM}m x H${room.heightM}m)`, margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['면', '자재명', '규격', '수량', '단위', '단가(원)', '금액(원)']],
      body: roomRows,
      foot: [['', '', '', '', '', '소계', roomTotal.toLocaleString()]],
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [60, 100, 160], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [220, 230, 245], fontStyle: 'bold', textColor: [30, 64, 120] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 38 },
        2: { cellWidth: 28 },
        3: { cellWidth: 16, halign: 'right' },
        4: { cellWidth: 14 },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      theme: 'striped',
    })

    y = doc.lastAutoTable.finalY + 6
    grandTotal += roomTotal

    if (y > 260) { doc.addPage(); y = 15 }
  })

  // ── 합계 ──
  y += 4
  doc.setDrawColor(30, 64, 120)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 120)
  doc.text('TOTAL', margin, y)
  doc.text(grandTotal.toLocaleString() + ' ' + '\xC6D0', pageW - margin, y, { align: 'right' })

  // ── 푸터 ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`${i} / ${pageCount}`, pageW / 2, 292, { align: 'center' })
  }

  doc.save(`견적서_${project.siteName || '현장'}_${project.date}.pdf`)
}
