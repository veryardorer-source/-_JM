// ─────────────────────────────────────────────
// 엑셀 내보내기 – exceljs 기반 (견적서 4시트)
// ─────────────────────────────────────────────
import ExcelJS from 'exceljs'
import { TRADE_ORDER } from './generateEstimate.js'

// ── 스타일 헬퍼 ──────────────────────────────
const CLR = {
  headerBg:   '1E4078', headerFg:  'FFFFFF',
  tradeBg:    'EEF4FB', subtotalBg: 'D9E1F2',
  grandBg:    'FFF9C4', inputBg:   'FFFDE7',
  formulaBg:  'EDF7EF', white:     'FFFFFF',
  border:     '999999', borderDark: '000000',
  coverBg:    'F0F4FA',
}

function mkFill(hex) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } }
}
function mkBorder(color = CLR.border, thickness = 'thin') {
  const b = { style: thickness, color: { argb: 'FF' + color } }
  return { top: b, bottom: b, left: b, right: b }
}
function mkFont(bold = false, size = 10, color = null) {
  return { name: '맑은 고딕', size, bold, ...(color ? { color: { argb: 'FF' + color } } : {}) }
}

function styleCell(cell, { fill, bold, size, color, fgColor, align, numFmt, border } = {}) {
  if (fill)   cell.fill   = mkFill(fill)
  cell.border = mkBorder(border || CLR.border)
  cell.font   = mkFont(bold || false, size || 10, fgColor || null)
  cell.alignment = { horizontal: align || 'left', vertical: 'middle', wrapText: false }
  if (numFmt) cell.numFmt = numFmt
  if (color)  cell.font.color = { argb: 'FF' + color }
}

function numCell(ws, r, c, val, opts = {}) {
  const cell = ws.getCell(r, c)
  cell.value = (val == null ? 0 : val)
  styleCell(cell, { numFmt: '#,##0', align: 'right', ...opts })
}
function txtCell(ws, r, c, val, opts = {}) {
  const cell = ws.getCell(r, c)
  cell.value = val ?? ''
  styleCell(cell, { align: 'left', ...opts })
}
function fmtCell(ws, r, c, formula, opts = {}) {
  const cell = ws.getCell(r, c)
  cell.value = { formula }
  styleCell(cell, { numFmt: '#,##0', align: 'right', fill: CLR.formulaBg, ...opts })
}

// ── 합계 계산 헬퍼 ────────────────────────────
function computeTotals(estimateItems, discount) {
  let totalMat = 0, totalLab = 0, totalExp = 0
  estimateItems.forEach(it => {
    const q = it.qty || 0
    totalMat += (it.matUnitPrice || 0) * q
    totalLab += (it.labUnitPrice || 0) * q
    totalExp += (it.expUnitPrice || 0) * q
  })
  const directTotal = totalMat + totalLab + totalExp
  const employment  = Math.round(totalLab * 0.0101)
  const industrial  = Math.round(totalLab * 0.0356)
  const management  = Math.round(directTotal * 0.05)
  const profit      = Math.round(directTotal * 0.10)
  const indirectTotal = employment + industrial + management + profit
  const constructionTotal = Math.floor((directTotal + indirectTotal) / 1000) * 1000
  const afterDiscount = constructionTotal - (discount || 0)
  const vat = Math.round(afterDiscount * 0.1 / 1000) * 1000
  const grandTotal = afterDiscount + vat
  return { totalMat, totalLab, totalExp, directTotal, employment, industrial, management, profit, indirectTotal, constructionTotal, afterDiscount, vat, grandTotal }
}

// ── 시트1: 표지 ──────────────────────────────
function makeCoverSheet(wb, project, totals) {
  const ws = wb.addWorksheet('표지')
  ws.properties.defaultRowHeight = 20

  ws.columns = [
    { width: 4 }, { width: 20 }, { width: 30 }, { width: 20 }, { width: 4 },
  ]

  let r = 2

  // 회사명
  ws.mergeCells(r, 1, r, 5)
  const compCell = ws.getCell(r, 1)
  compCell.value = 'JM건축인테리어 주식회사'
  compCell.font = mkFont(true, 14, CLR.headerBg)
  compCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 28
  r += 2

  // 메인 타이틀
  ws.mergeCells(r, 1, r, 5)
  const titleCell = ws.getCell(r, 1)
  titleCell.value = '견   적   서'
  titleCell.font = mkFont(true, 32, CLR.headerBg)
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = mkFill(CLR.coverBg)
  ws.getRow(r).height = 60
  r += 2

  // 구분선
  ws.mergeCells(r, 1, r, 5)
  const lineCell = ws.getCell(r, 1)
  lineCell.value = ''
  lineCell.fill = mkFill(CLR.headerBg)
  ws.getRow(r).height = 4
  r += 2

  // 공사 정보 테이블
  const infoRows = [
    ['공  사  명', project.siteName || ''],
    ['발  주  처', project.clientName || ''],
    ['담  당  자', project.manager || ''],
    ['작  성  일', project.date || ''],
  ]
  infoRows.forEach(([label, val]) => {
    ws.mergeCells(r, 1, r, 2)
    ws.mergeCells(r, 3, r, 5)
    const lc = ws.getCell(r, 1)
    lc.value = label
    lc.font = mkFont(true, 11, CLR.headerBg)
    lc.fill = mkFill(CLR.tradeBg)
    lc.border = mkBorder(CLR.border)
    lc.alignment = { horizontal: 'center', vertical: 'middle' }
    const vc = ws.getCell(r, 3)
    vc.value = val
    vc.font = mkFont(false, 11)
    vc.border = mkBorder(CLR.border)
    vc.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 }
    ws.getRow(r).height = 24
    r++
  })
  r += 2

  // 합계금액 강조
  ws.mergeCells(r, 1, r, 5)
  const amtLabelCell = ws.getCell(r, 1)
  amtLabelCell.value = '합   계   금   액'
  amtLabelCell.font = mkFont(true, 13, CLR.headerBg)
  amtLabelCell.fill = mkFill(CLR.subtotalBg)
  amtLabelCell.border = mkBorder(CLR.border)
  amtLabelCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 28
  r++

  ws.mergeCells(r, 1, r, 5)
  const amtCell = ws.getCell(r, 1)
  amtCell.value = totals.grandTotal
  amtCell.numFmt = '#,##0 "원"'
  amtCell.font = mkFont(true, 20, '15803D')
  amtCell.fill = mkFill(CLR.grandBg)
  amtCell.border = mkBorder(CLR.headerBg, 'medium')
  amtCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 44
  r += 2

  // 하단 부가세 포함 안내
  ws.mergeCells(r, 1, r, 5)
  const noteCell = ws.getCell(r, 1)
  noteCell.value = '※ 상기 금액은 부가가치세(10%) 포함된 금액입니다.'
  noteCell.font = mkFont(false, 10, '64748B')
  noteCell.alignment = { horizontal: 'center', vertical: 'middle' }
}

// ── 시트2: 갑지 ──────────────────────────────
function makeGapjiSheet(wb, project, totals) {
  const ws = wb.addWorksheet('갑지')
  ws.properties.defaultRowHeight = 18

  ws.columns = [
    { width: 22 }, { width: 16 }, { width: 8 }, { width: 6 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 8 },
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 9)
  const titleCell = ws.getCell(r, 1)
  titleCell.value = '내   역   서'
  titleCell.font = mkFont(true, 20)
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 36
  r++; r++

  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`
  const info = [
    ['수  신', project.clientName || '', '작  성  일', dateStr],
    ['공  사  명', project.siteName || '', '', ''],
    ['담  당', project.manager || '', '', ''],
  ]
  info.forEach(([k1, v1, k2, v2]) => {
    ws.mergeCells(r, 2, r, 5)
    ws.mergeCells(r, 7, r, 9)
    txtCell(ws, r, 1, k1, { bold: true, fill: 'DCE6F1', align: 'center' })
    txtCell(ws, r, 2, v1)
    txtCell(ws, r, 6, k2, { bold: true, fill: 'DCE6F1', align: 'center' })
    txtCell(ws, r, 7, v2)
    r++
  })
  r++

  ws.mergeCells(r, 1, r, 9)
  txtCell(ws, r, 1, '아래와 같이 견적합니다.', { bold: true })
  r++; r++

  // 헤더
  const hdrs = ['항  목', '규  격', '수  량', '단위', '재  료  비', '노  무  비', '경  비', '합  계', '비  고']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
  })
  ws.getRow(r).height = 20
  r++

  // 재료비 행
  const matRow = r
  ws.mergeCells(r, 1, r, 2)
  txtCell(ws, r, 1, '재  료  비', { fill: CLR.tradeBg, bold: false, align: 'center' })
  numCell(ws, r, 3, 1, { fill: CLR.tradeBg, align: 'center' })
  txtCell(ws, r, 4, '식', { fill: CLR.tradeBg, align: 'center' })
  numCell(ws, r, 5, totals.totalMat, { fill: CLR.tradeBg, bold: true })
  numCell(ws, r, 6, 0, { fill: CLR.tradeBg })
  numCell(ws, r, 7, 0, { fill: CLR.tradeBg })
  numCell(ws, r, 8, totals.totalMat, { fill: CLR.tradeBg, bold: true })
  txtCell(ws, r, 9, '', { fill: CLR.tradeBg })
  r++

  // 노무비 행
  const labRow = r
  ws.mergeCells(r, 1, r, 2)
  txtCell(ws, r, 1, '노  무  비', { fill: CLR.tradeBg, bold: false, align: 'center' })
  numCell(ws, r, 3, 1, { fill: CLR.tradeBg, align: 'center' })
  txtCell(ws, r, 4, '식', { fill: CLR.tradeBg, align: 'center' })
  numCell(ws, r, 5, 0, { fill: CLR.tradeBg })
  numCell(ws, r, 6, totals.totalLab, { fill: CLR.tradeBg, bold: true })
  numCell(ws, r, 7, 0, { fill: CLR.tradeBg })
  numCell(ws, r, 8, totals.totalLab, { fill: CLR.tradeBg, bold: true })
  txtCell(ws, r, 9, '', { fill: CLR.tradeBg })
  r++

  // 경비 행
  const expRow = r
  ws.mergeCells(r, 1, r, 2)
  txtCell(ws, r, 1, '경  비', { fill: CLR.tradeBg, bold: false, align: 'center' })
  numCell(ws, r, 3, 1, { fill: CLR.tradeBg, align: 'center' })
  txtCell(ws, r, 4, '식', { fill: CLR.tradeBg, align: 'center' })
  numCell(ws, r, 5, 0, { fill: CLR.tradeBg })
  numCell(ws, r, 6, 0, { fill: CLR.tradeBg })
  numCell(ws, r, 7, totals.totalExp, { fill: CLR.tradeBg, bold: true })
  numCell(ws, r, 8, totals.totalExp, { fill: CLR.tradeBg, bold: true })
  txtCell(ws, r, 9, '', { fill: CLR.tradeBg })
  r++

  // 순공사비 (소계)
  const sunRow = r
  ws.mergeCells(r, 1, r, 4)
  txtCell(ws, r, 1, '순  공  사  비', { fill: CLR.subtotalBg, bold: true, align: 'center' })
  for (let c = 2; c <= 4; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
  numCell(ws, r, 5, totals.totalMat, { fill: CLR.subtotalBg, bold: true })
  numCell(ws, r, 6, totals.totalLab, { fill: CLR.subtotalBg, bold: true })
  numCell(ws, r, 7, totals.totalExp, { fill: CLR.subtotalBg, bold: true })
  numCell(ws, r, 8, totals.directTotal, { fill: CLR.subtotalBg, bold: true })
  txtCell(ws, r, 9, '', { fill: CLR.subtotalBg })
  ws.getRow(r).height = 20
  r++

  // 간접비 항목
  const indirectItems = [
    ['고용보험', '1.01%', totals.employment],
    ['산재보험', '3.56%', totals.industrial],
    ['일반관리비', '5%', totals.management],
    ['이  윤', '10%', totals.profit],
  ]
  const indirectRows = []
  indirectItems.forEach(([name, spec, val]) => {
    ws.mergeCells(r, 1, r, 2)
    txtCell(ws, r, 1, name, { align: 'center' })
    txtCell(ws, r, 2, '', { align: 'center' })
    txtCell(ws, r, 3, spec, { align: 'center' })
    txtCell(ws, r, 4, '', { align: 'center' })
    numCell(ws, r, 5, 0)
    numCell(ws, r, 6, 0)
    numCell(ws, r, 7, 0)
    numCell(ws, r, 8, val)
    txtCell(ws, r, 9, '')
    indirectRows.push(r)
    r++
  })

  // 간접공사비 계
  const indirectSumRow = r
  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, '간  접  공  사  비  계', { fill: CLR.subtotalBg, bold: true, align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
  numCell(ws, r, 8, totals.indirectTotal, { fill: CLR.subtotalBg, bold: true })
  txtCell(ws, r, 9, '', { fill: CLR.subtotalBg })
  r++

  // 총공사비
  const totalRow = r
  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, '총  공  사  비', { bold: true, align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '')
  numCell(ws, r, 8, totals.constructionTotal, { bold: true })
  txtCell(ws, r, 9, '')
  ws.getRow(r).height = 22
  r++

  // D/C
  const dcRow = r
  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, 'D / C', { align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '')
  numCell(ws, r, 8, totals.constructionTotal - totals.afterDiscount)
  txtCell(ws, r, 9, '')
  r++

  // 부가세
  const vatRow = r
  ws.mergeCells(r, 1, r, 2)
  txtCell(ws, r, 1, '부  가  세', { align: 'center' })
  txtCell(ws, r, 2, '', { align: 'center' })
  txtCell(ws, r, 3, '10%', { align: 'center' })
  for (let c = 4; c <= 7; c++) txtCell(ws, r, c, '')
  numCell(ws, r, 8, totals.vat)
  txtCell(ws, r, 9, '')
  r++

  // 합계
  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, '[  합  계  ]', { fill: CLR.grandBg, bold: true, size: 12, align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '', { fill: CLR.grandBg })
  numCell(ws, r, 8, totals.grandTotal, { fill: CLR.grandBg, bold: true, size: 12 })
  txtCell(ws, r, 9, '', { fill: CLR.grandBg })
  ws.getRow(r).height = 24
  r += 2

  ws.mergeCells(r, 1, r, 9)
  ws.getCell(r, 1).value = '특기사항 :'
  ws.getCell(r, 1).font = mkFont(false, 10)
}

// ── 공통 헬퍼: 순번 부여된 그룹 생성 ────────────
function buildGroupedItems(estimateItems) {
  let seq = 1
  const groups = []
  TRADE_ORDER.forEach(trade => {
    const items = estimateItems.filter(it => it.trade === trade)
    if (items.length === 0) return
    groups.push({ trade, items: items.map(item => ({ ...item, seq: seq++ })) })
  })
  // TRADE_ORDER에 없는 공종
  const extra = [...new Set(estimateItems.filter(it => !TRADE_ORDER.includes(it.trade)).map(it => it.trade))]
  extra.forEach(trade => {
    const items = estimateItems.filter(it => it.trade === trade)
    groups.push({ trade, items: items.map(item => ({ ...item, seq: seq++ })) })
  })
  return groups
}

// 내역서 시트의 행 번호 사전 계산 (item.id → 내역서 row)
// 내역서 구조: r=1 title, r++r++ → r=3 header, r++ → r=4 첫 trade header
function computeDetailRowMap(groups) {
  const map = {}
  let r = 4
  groups.forEach(({ items }) => {
    r++ // trade header
    items.forEach(item => { map[item.id] = r; r++ })
    r++ // subtotal
    r++ // blank
  })
  return map
}

// ── 시트3: 공종별 집계표 ──────────────────────
function makeTradeSheet(wb, groups, rowMap) {
  // cols: A=번호, B=공종, C=품명, D=단위, E=수량, F=재료비, G=노무비, H=경비, I=합계
  const ws = wb.addWorksheet('공종별 집계표')
  ws.properties.defaultRowHeight = 15

  ws.columns = [
    { width: 5 }, { width: 18 }, { width: 24 }, { width: 7 }, { width: 8 },
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 },
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 9)
  const t = ws.getCell(r, 1)
  t.value = '공  종  별  집  계  표'
  t.font = mkFont(true, 16)
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 32
  r++; r++

  const hdrs = ['번호', '공  종', '품  명', '단위', '수량', '재  료  비', '노  무  비', '경  비', '합  계']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
  })
  ws.getRow(r).height = 22
  r++

  const subtotalRefs = {}

  groups.forEach(({ trade, items }) => {
    ws.mergeCells(r, 1, r, 9)
    const th = ws.getCell(r, 1)
    th.value = trade
    styleCell(th, { fill: CLR.tradeBg, bold: true })
    ws.getRow(r).height = 17
    r++

    const itemRows = []
    items.forEach(item => {
      const dr = rowMap[item.id]
      itemRows.push(r)
      numCell(ws, r, 1, item.seq, { align: 'center' })
      txtCell(ws, r, 2, trade, { align: 'center' })
      txtCell(ws, r, 3, item.name)
      txtCell(ws, r, 4, item.unit, { align: 'center' })
      numCell(ws, r, 5, item.qty || 0, { align: 'center' })
      // 내역서 셀 참조 수식
      fmtCell(ws, r, 6, `'내역서'!H${dr}`)
      fmtCell(ws, r, 7, `'내역서'!J${dr}`)
      fmtCell(ws, r, 8, `'내역서'!L${dr}`)
      fmtCell(ws, r, 9, `'내역서'!M${dr}`, { bold: false })
      r++
    })

    const sumF = col => `SUM(${itemRows.map(ir => `${col}${ir}`).join(',')})`
    ws.mergeCells(r, 1, r, 5)
    txtCell(ws, r, 1, '[소  계]', { fill: CLR.subtotalBg, bold: true, align: 'center' })
    for (let c = 2; c <= 5; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
    fmtCell(ws, r, 6, sumF('F'), { fill: CLR.subtotalBg, bold: true })
    fmtCell(ws, r, 7, sumF('G'), { fill: CLR.subtotalBg, bold: true })
    fmtCell(ws, r, 8, sumF('H'), { fill: CLR.subtotalBg, bold: true })
    fmtCell(ws, r, 9, `F${r}+G${r}+H${r}`, { fill: CLR.subtotalBg, bold: true })
    subtotalRefs[trade] = r
    r++; r++
  })

  const subRows = Object.values(subtotalRefs)
  const mk = col => subRows.length > 0 ? `SUM(${subRows.map(sr => `${col}${sr}`).join(',')})` : '0'
  ws.mergeCells(r, 1, r, 5)
  txtCell(ws, r, 1, '[합  계]', { fill: CLR.grandBg, bold: true, align: 'center' })
  for (let c = 2; c <= 5; c++) txtCell(ws, r, c, '', { fill: CLR.grandBg })
  fmtCell(ws, r, 6, mk('F'), { fill: CLR.grandBg, bold: true })
  fmtCell(ws, r, 7, mk('G'), { fill: CLR.grandBg, bold: true })
  fmtCell(ws, r, 8, mk('H'), { fill: CLR.grandBg, bold: true })
  fmtCell(ws, r, 9, mk('I'), { fill: CLR.grandBg, bold: true })
  ws.getRow(r).height = 20
}

// ── 시트4: 내역서 ─────────────────────────────
function makeDetailSheet(wb, groups) {
  // cols: A=번호, B=공종, C=품명, D=규격, E=단위, F=수량,
  //       G=재료비단가, H=재료비금액, I=노무비단가, J=노무비금액,
  //       K=경비단가, L=경비금액, M=합계
  const ws = wb.addWorksheet('내역서')
  ws.properties.defaultRowHeight = 15

  ws.columns = [
    { width: 6 }, { width: 14 }, { width: 24 }, { width: 14 }, { width: 7 }, { width: 8 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 14 },
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 13)
  const t = ws.getCell(r, 1)
  t.value = '[내  역  서]'
  t.font = mkFont(true, 16)
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 32
  r++; r++

  // 헤더
  const hdrs = [
    '번호', '공  종', '품  명', '규  격', '단위', '수량',
    '재료비\n단가', '재료비\n금액', '노무비\n단가', '노무비\n금액',
    '경비\n단가', '경비\n금액', '합  계',
  ]
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(r).height = 28
  r++

  const subtotalRefs = {}

  groups.forEach(({ trade, items }) => {
    ws.mergeCells(r, 1, r, 13)
    const th = ws.getCell(r, 1)
    th.value = trade
    styleCell(th, { fill: CLR.tradeBg, bold: true })
    ws.getRow(r).height = 18
    r++

    const itemRows = []
    items.forEach(item => {
      const q = item.qty || 0
      const matAmt = (item.matUnitPrice || 0) * q
      const labAmt = (item.labUnitPrice || 0) * q
      const expAmt = (item.expUnitPrice || 0) * q
      const total  = matAmt + labAmt + expAmt

      itemRows.push(r)
      numCell(ws, r, 1, item.seq, { align: 'center' })
      txtCell(ws, r, 2, trade, { align: 'center' })
      txtCell(ws, r, 3, item.name)
      txtCell(ws, r, 4, item.spec || '')
      txtCell(ws, r, 5, item.unit, { align: 'center' })
      numCell(ws, r, 6, q, { align: 'center' })
      numCell(ws, r, 7, item.matUnitPrice || 0)
      numCell(ws, r, 8, matAmt)
      numCell(ws, r, 9, item.labUnitPrice || 0)
      numCell(ws, r, 10, labAmt)
      numCell(ws, r, 11, item.expUnitPrice || 0)
      numCell(ws, r, 12, expAmt)
      numCell(ws, r, 13, total, { bold: total > 0 })
      r++
    })

    // 소계 행
    const matF = `SUM(${itemRows.map(ir => `H${ir}`).join(',')})`
    const labF = `SUM(${itemRows.map(ir => `J${ir}`).join(',')})`
    const expF = `SUM(${itemRows.map(ir => `L${ir}`).join(',')})`
    ws.mergeCells(r, 1, r, 6)
    txtCell(ws, r, 1, '[소  계]', { fill: CLR.subtotalBg, bold: true, align: 'center' })
    for (let c = 2; c <= 6; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
    numCell(ws, r, 7, 0, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 8, matF, { fill: CLR.subtotalBg, bold: true })
    numCell(ws, r, 9, 0, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 10, labF, { fill: CLR.subtotalBg, bold: true })
    numCell(ws, r, 11, 0, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 12, expF, { fill: CLR.subtotalBg, bold: true })
    fmtCell(ws, r, 13, `H${r}+J${r}+L${r}`, { fill: CLR.subtotalBg, bold: true })
    subtotalRefs[trade] = r
    r++; r++
  })

  // 전체 합계 행
  const subRows = Object.values(subtotalRefs)
  const mk = col => subRows.length > 0 ? `SUM(${subRows.map(sr => `${col}${sr}`).join(',')})` : '0'
  ws.mergeCells(r, 1, r, 6)
  txtCell(ws, r, 1, '[합  계]', { fill: CLR.grandBg, bold: true, align: 'center' })
  for (let c = 2; c <= 6; c++) txtCell(ws, r, c, '', { fill: CLR.grandBg })
  numCell(ws, r, 7, 0, { fill: CLR.grandBg })
  fmtCell(ws, r, 8, mk('H'), { fill: CLR.grandBg, bold: true })
  numCell(ws, r, 9, 0, { fill: CLR.grandBg })
  fmtCell(ws, r, 10, mk('J'), { fill: CLR.grandBg, bold: true })
  numCell(ws, r, 11, 0, { fill: CLR.grandBg })
  fmtCell(ws, r, 12, mk('L'), { fill: CLR.grandBg, bold: true })
  fmtCell(ws, r, 13, mk('M'), { fill: CLR.grandBg, bold: true })
  ws.getRow(r).height = 22
}

// ── 레거시 내보내기 (견적 작성 탭 Summary에서 사용) ──────────
// 이전 내역서 4시트(내역서(요약), 공종별집계, 내역서(상세), 자재집계) 형태
function buildTradeGroupsLegacy(roomDataList, globalItems) {
  const LEGACY_TRADE_ORDER = ['가설작업','설비작업','목작업','전기통신작업','소방작업','수장작업','창호작업','가구','기타']
  function getTradeLegacy(name) {
    if (/각재|합판|석고|MDF|목재|랩핑|M-BAR/.test(name))           return '목작업'
    if (/벽지|합지|천정지|도장|페인트|핸디|스타코/.test(name))      return '수장작업'
    if (/인테리어필름|필름/.test(name))                             return '수장작업'
    if (/타일|줄눈/.test(name))                                     return '수장작업'
    if (/데코타일|장판|우드타일|후로링/.test(name))                  return '수장작업'
    if (/루바|텍스/.test(name))                                     return '수장작업'
    if (/조명|라인조명|면조명|펜던트|벽등|레일/.test(name))         return '전기통신작업'
    if (/ABS/i.test(name))                                               return '목작업'
    if (/도어|방문|강화|양문|현관|미서기|폴딩|중문|창호|유리/.test(name))  return '창호작업'
    if (/환풍기|배관|배수|급수|설비/.test(name))                    return '설비작업'
    if (/가구/.test(name))                                          return '가구'
    return '기타'
  }
  function getSfLabel(sf) {
    const DIR = { wallA:'벽A', wallB:'벽B', wallC:'벽C', wallD:'벽D', wallN:'벽A', wallS:'벽B', wallE:'벽C', wallW:'벽D', floor:'바닥', ceiling:'천장', wallExtra:'추가벽' }
    return sf.label || DIR[sf.direction] || sf.direction || ''
  }

  const groups = {}
  LEGACY_TRADE_ORDER.forEach(t => { groups[t] = [] })

  roomDataList.forEach(rd => {
    const roomLabel = rd.room.name
    ;(rd.surfaceData || []).forEach(({ sf, items }) => {
      items.forEach(item => {
        const trade = getTradeLegacy(item.name)
        if (!groups[trade]) groups[trade] = []
        groups[trade].push({ name: item.name, spec: item.spec || '', unit: item.unit, qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0, remark: `${roomLabel} ${getSfLabel(sf)}` })
      })
    })
    ;(rd.partitionData || []).forEach(({ partition, items }) => {
      items.forEach(item => {
        const trade = getTradeLegacy(item.name)
        if (!groups[trade]) groups[trade] = []
        groups[trade].push({ name: item.name, spec: item.spec || '', unit: item.unit, qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0, remark: `${roomLabel} ${partition.name || '칸막이'}` })
      })
    })
    ;(rd.doorItems || []).forEach(item => {
      groups['창호작업'].push({ name: item.name, spec: '', unit: item.unit, qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0, remark: roomLabel })
    })
    ;(rd.lightingItems || []).forEach(item => {
      const isLine = item.name.includes('T5') || item.name.includes('T7')
      groups['전기통신작업'].push({ name: item.name, spec: isLine ? `${Math.round((item.lengthM || 0) * 1000)}mm` : (item.spec || ''), unit: isLine ? 'm' : 'EA', qty: isLine ? (item.lengthM || 0) : (item.qty || 0), matU: 0, matT: 0, remark: roomLabel })
    })
    ;(rd.moldingItems || []).forEach(item => {
      groups['목작업'].push({ name: item.name, spec: '', unit: 'EA', qty: item.qty || 0, matU: 0, matT: 0, remark: `${roomLabel} ${(item.lengthM || 0).toFixed(2)}m` })
    })
  })
  ;(globalItems || []).forEach(gi => {
    if (!gi.enabled || !gi.name) return
    const trade = gi.trade || '기타'
    if (!groups[trade]) groups[trade] = []
    const qty = gi.qty || 0
    groups[trade].push({ name: gi.name, spec: gi.spec || '', unit: gi.unit, qty, matU: gi.matUnitPrice || 0, matT: (gi.matUnitPrice || 0) * qty, labU: gi.labUnitPrice || 0, labT: (gi.labUnitPrice || 0) * qty, expU: gi.expUnitPrice || 0, expT: (gi.expUnitPrice || 0) * qty, remark: gi.remark || '', isGlobal: true })
  })
  // 같은 품명+단위 항목 통합 (면별로 나뉜 것을 한 줄로)
  for (const trade of Object.keys(groups)) {
    const agg = {}
    groups[trade].forEach(item => {
      const key = `${item.name}|||${item.unit}`
      if (!agg[key]) {
        agg[key] = { ...item, qty: 0, matT: 0, labT: 0, expT: 0 }
      }
      agg[key].qty = Math.round((agg[key].qty + (item.qty || 0)) * 1000) / 1000
      agg[key].matT += item.matT || 0
      agg[key].labT += item.labT || 0
      agg[key].expT += item.expT || 0
    })
    // 집계 후 단가 재계산 (금액 / 수량)
    groups[trade] = Object.values(agg).map(item => ({
      ...item,
      matU: item.qty > 0 ? Math.round(item.matT / item.qty) : (item.matU || 0),
      labU: item.qty > 0 && item.labT ? Math.round(item.labT / item.qty) : (item.labU || 0),
      expU: item.qty > 0 && item.expT ? Math.round(item.expT / item.qty) : (item.expU || 0),
    }))
  }

  // 공종별 노무비 자동 추가 (항목이 있고 노무비 없는 경우)
  const LEGACY_LABOR = {
    '가설작업': '가설 노무비',
    '설비작업': '설비 노무비',
    '목작업':   '목공 노무비',
    '소방작업': '소방 노무비',
    '수장작업': '수장 노무비',
    '창호작업': '창호 설치 노무비',
    '가구':     '가구 설치 노무비',
  }
  for (const trade of LEGACY_TRADE_ORDER) {
    const items = groups[trade] || []
    if (items.length === 0) continue
    const laborName = LEGACY_LABOR[trade]
    if (!laborName) continue
    if (items.some(it => it.name.includes('노무비'))) continue
    groups[trade].push({ name: laborName, spec: '', unit: '식', qty: 1, matU: 0, matT: 0, labU: 0, labT: 0, expU: 0, expT: 0 })
  }

  return { groups, LEGACY_TRADE_ORDER }
}

export async function exportToExcelLegacy(project, roomDataList, grandAggregate, grandTotal, globalItems) {
  try {
    const { groups: tradeGroups, LEGACY_TRADE_ORDER } = buildTradeGroupsLegacy(roomDataList, globalItems)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'JM건축인테리어'
    wb.created = new Date()

    // 시트1: 내역서(요약)
    {
      const ws = wb.addWorksheet('내역서(요약)')
      ws.properties.defaultRowHeight = 16
      ws.columns = [ {width:18},{width:12},{width:7},{width:6},{width:14},{width:14},{width:14},{width:14},{width:14} ]
      let r = 1
      ws.mergeCells(r,1,r,9); const tc = ws.getCell(r,1); tc.value='내  역  서'; tc.font=mkFont(true,20); tc.alignment={horizontal:'center',vertical:'middle'}; ws.getRow(r).height=32; r++; r++
      const now = new Date(); const ds = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
      const info = [['수  신',project.clientName||'','작  성  일',ds],['공  사  명',project.siteName||'','',''],['담  당',project.manager||'','','']]
      info.forEach(([k1,v1,k2,v2])=>{ ws.mergeCells(r,2,r,5); ws.mergeCells(r,7,r,9); txtCell(ws,r,1,k1,{bold:true,fill:'DCE6F1',align:'center'}); txtCell(ws,r,2,v1); txtCell(ws,r,6,k2,{bold:true,fill:'DCE6F1',align:'center'}); txtCell(ws,r,7,v2); r++ })
      r++
      ws.mergeCells(r,1,r,9); txtCell(ws,r,1,'아래와 같이 견적합니다.',{bold:true}); r++; r++
      const hdrs=['품  명','규  격','수 량','단위','재  료  비','노  무  비','경  비','합  계','비  고']
      hdrs.forEach((h,i)=>{ const cell=ws.getCell(r,i+1); cell.value=h; styleCell(cell,{fill:CLR.headerBg,fgColor:CLR.headerFg,bold:true,align:'center'}) }); ws.getRow(r).height=20; r++
      const sunRow=r
      ws.mergeCells(r,1,r,2); txtCell(ws,r,1,'순 공 사 비',{fill:CLR.tradeBg,bold:true,align:'center'}); numCell(ws,r,3,1,{fill:CLR.tradeBg,align:'center'}); txtCell(ws,r,4,'식',{fill:CLR.tradeBg,align:'center'}); numCell(ws,r,5,grandTotal,{fill:CLR.tradeBg,bold:true}); numCell(ws,r,6,0,{fill:CLR.tradeBg}); numCell(ws,r,7,0,{fill:CLR.tradeBg}); fmtCell(ws,r,8,`E${r}+F${r}+G${r}`,{fill:CLR.tradeBg}); txtCell(ws,r,9,'',{fill:CLR.tradeBg}); r+=4
      const 직접Row=r
      ws.mergeCells(r,1,r,4); txtCell(ws,r,1,'직 접 공 사 비 계',{fill:CLR.subtotalBg,bold:true,align:'center'}); numCell(ws,r,5,grandTotal,{fill:CLR.subtotalBg,bold:true}); fmtCell(ws,r,6,`F${sunRow}`,{fill:CLR.subtotalBg}); fmtCell(ws,r,7,`G${sunRow}`,{fill:CLR.subtotalBg}); fmtCell(ws,r,8,`H${sunRow}`,{fill:CLR.subtotalBg}); txtCell(ws,r,9,'',{fill:CLR.subtotalBg}); r++
      const indirect=[['고용보험','1.01%',`ROUND(F${sunRow}*0.0101,0)`],['산재보험','3.56%',`ROUND(F${sunRow}*0.0356,0)`],['일반관리비','5%',`ROUND(H${직접Row}*0.05,0)`],['이윤','10%',`ROUND(H${직접Row}*0.1,0)`],['단수정리','',null]]
      const indirectRows=[]
      indirect.forEach(([name,spec,formula])=>{ for(let c=1;c<=9;c++) txtCell(ws,r,c,''); txtCell(ws,r,1,name); txtCell(ws,r,2,spec,{align:'center'}); if(formula) fmtCell(ws,r,8,formula); else txtCell(ws,r,8,'천단위절사',{align:'right'}); indirectRows.push(r); r++ })
      const 간접Row=r
      const indSum=`SUM(${indirectRows.slice(0,4).map(ir=>`H${ir}`).join(',')})`
      ws.mergeCells(r,1,r,7); txtCell(ws,r,1,'간 접 공 사 비 계',{fill:CLR.subtotalBg,bold:true,align:'center'}); for(let c=2;c<=7;c++) txtCell(ws,r,c,'',{fill:CLR.subtotalBg}); fmtCell(ws,r,8,indSum,{fill:CLR.subtotalBg}); txtCell(ws,r,9,'',{fill:CLR.subtotalBg}); r++
      const 총Row=r
      ws.mergeCells(r,1,r,7); txtCell(ws,r,1,'총  공  사  비',{bold:true,align:'center'}); for(let c=2;c<=7;c++) txtCell(ws,r,c,''); fmtCell(ws,r,8,`FLOOR(H${직접Row}+H${간접Row},1000)`); txtCell(ws,r,9,''); r++
      const 부가Row=r
      ws.mergeCells(r,1,r,2); txtCell(ws,r,1,'부  가  세',{align:'center'}); txtCell(ws,r,2,'',{align:'center'}); txtCell(ws,r,3,'10%',{align:'center'}); for(let c=4;c<=7;c++) txtCell(ws,r,c,''); fmtCell(ws,r,8,`ROUND(H${총Row}*0.1,-3)`); txtCell(ws,r,9,''); r++
      ws.mergeCells(r,1,r,7); txtCell(ws,r,1,'[  합  계  ]',{fill:CLR.grandBg,bold:true,size:12,align:'center'}); for(let c=2;c<=7;c++) txtCell(ws,r,c,'',{fill:CLR.grandBg}); fmtCell(ws,r,8,`H${총Row}+H${부가Row}`,{fill:CLR.grandBg,bold:true,size:12}); txtCell(ws,r,9,'',{fill:CLR.grandBg}); ws.getRow(r).height=22
    }

    // 시트2: 공종별집계
    {
      const ws = wb.addWorksheet('공종별집계')
      ws.properties.defaultRowHeight=16
      ws.columns=[{width:20},{width:12},{width:6},{width:6},{width:12},{width:12},{width:12},{width:12},{width:12},{width:12},{width:12},{width:12},{width:16}]
      let r=1
      ws.mergeCells(r,1,r,13); const t=ws.getCell(r,1); t.value='공  종  별  집  계  표'; t.font=mkFont(true,16); t.alignment={horizontal:'center',vertical:'middle'}; ws.getRow(r).height=28; r++; r++
      const hdrs=['품  명','규  격','단위','수량','재료비\n단가','재료비\n금액','노무비\n단가','노무비\n금액','경비\n단가','경비\n금액','합계\n단가','합계\n금액','비고']
      hdrs.forEach((h,i)=>{ const cell=ws.getCell(r,i+1); cell.value=h; styleCell(cell,{fill:CLR.headerBg,fgColor:CLR.headerFg,bold:true,align:'center'}); cell.alignment={horizontal:'center',vertical:'middle',wrapText:true} }); ws.getRow(r).height=28; r++
      const dataRows=[]
      LEGACY_TRADE_ORDER.forEach(trade=>{ const items=tradeGroups[trade]||[]; if(items.length===0) return; const matTotal=items.reduce((s,i)=>s+(i.matT||0),0); const labTotal=items.reduce((s,i)=>s+(i.labT||0),0); const expTotal=items.reduce((s,i)=>s+(i.expT||0),0); txtCell(ws,r,1,trade,{fill:CLR.tradeBg,bold:true}); txtCell(ws,r,2,'',{fill:CLR.tradeBg,align:'center'}); txtCell(ws,r,3,'식',{fill:CLR.tradeBg,align:'center'}); numCell(ws,r,4,1,{fill:CLR.tradeBg,align:'center'}); numCell(ws,r,5,matTotal,{fill:CLR.tradeBg}); numCell(ws,r,6,matTotal,{fill:CLR.tradeBg,bold:true}); numCell(ws,r,7,labTotal,{fill:CLR.tradeBg}); numCell(ws,r,8,labTotal,{fill:CLR.tradeBg}); numCell(ws,r,9,expTotal,{fill:CLR.tradeBg}); numCell(ws,r,10,expTotal,{fill:CLR.tradeBg}); fmtCell(ws,r,11,`E${r}+G${r}+I${r}`,{fill:CLR.tradeBg}); fmtCell(ws,r,12,`F${r}+H${r}+J${r}`,{fill:CLR.tradeBg}); txtCell(ws,r,13,'',{fill:CLR.tradeBg}); dataRows.push(r); r++ })
      ws.mergeCells(r,1,r,3); txtCell(ws,r,1,'합  계',{fill:CLR.subtotalBg,bold:true,align:'center'}); for(let c=2;c<=13;c++) txtCell(ws,r,c,'',{fill:CLR.subtotalBg})
      if(dataRows.length>0){ const mk=col=>`SUM(${dataRows.map(dr=>`${col}${dr}`).join(',')})`; fmtCell(ws,r,6,mk('F'),{fill:CLR.subtotalBg}); fmtCell(ws,r,8,mk('H'),{fill:CLR.subtotalBg}); fmtCell(ws,r,10,mk('J'),{fill:CLR.subtotalBg}); fmtCell(ws,r,12,mk('L'),{fill:CLR.subtotalBg}) }
    }

    // 시트3: 내역서(상세)
    {
      const ws = wb.addWorksheet('내역서(상세)')
      ws.properties.defaultRowHeight=15
      ws.columns=[{width:12},{width:26},{width:20},{width:6},{width:7},{width:11},{width:11},{width:11},{width:11},{width:11},{width:11},{width:11},{width:11},{width:18}]
      let r=1
      ws.mergeCells(r,1,r,14); const t=ws.getCell(r,1); t.value='[내  역  서]'; t.font=mkFont(true,16); t.alignment={horizontal:'center',vertical:'middle'}; ws.getRow(r).height=28; r++; r++
      const hdrs=['항목','품명','규격','단위','수량','재료비\n단가','재료비\n금액','노무비\n단가','노무비\n금액','경비\n단가','경비\n금액','합계\n단가','합계\n금액','비고']
      hdrs.forEach((h,i)=>{ const cell=ws.getCell(r,i+1); cell.value=h; styleCell(cell,{fill:CLR.headerBg,fgColor:CLR.headerFg,bold:true,align:'center'}); cell.alignment={horizontal:'center',vertical:'middle',wrapText:true} }); ws.getRow(r).height=28; r++
      const subtotalRefs={}; let tradeNum=1
      LEGACY_TRADE_ORDER.forEach(trade=>{ const items=tradeGroups[trade]||[]; if(items.length===0) return; ws.mergeCells(r,1,r,14); const th=ws.getCell(r,1); th.value=`${tradeNum}  ${trade}`; styleCell(th,{fill:CLR.tradeBg,bold:true}); ws.getRow(r).height=18; r++; tradeNum++
        const itemRows=[]
        items.forEach(item=>{ itemRows.push(r); txtCell(ws,r,1,''); txtCell(ws,r,2,item.name); txtCell(ws,r,3,item.spec||''); txtCell(ws,r,4,item.unit,{align:'center'}); numCell(ws,r,5,item.qty,{align:'center'}); numCell(ws,r,6,item.matU||0); numCell(ws,r,7,item.matT||0); numCell(ws,r,8,item.labU||0); numCell(ws,r,9,item.labT||0); numCell(ws,r,10,item.expU||0); numCell(ws,r,11,item.expT||0); fmtCell(ws,r,12,`F${r}+H${r}+J${r}`); fmtCell(ws,r,13,`G${r}+I${r}+K${r}`); txtCell(ws,r,14,item.remark||''); r++ })
        const matF=`SUM(${itemRows.map(ir=>`G${ir}`).join(',')})`, labF=`SUM(${itemRows.map(ir=>`I${ir}`).join(',')})`, expF=`SUM(${itemRows.map(ir=>`K${ir}`).join(',')})`
        ws.mergeCells(r,1,r,5); txtCell(ws,r,1,'[소  계]',{fill:CLR.subtotalBg,bold:true,align:'center'}); for(let c=2;c<=5;c++) txtCell(ws,r,c,'',{fill:CLR.subtotalBg}); fmtCell(ws,r,6,matF.replace(/G/g,'F'),{fill:CLR.subtotalBg}); fmtCell(ws,r,7,matF,{fill:CLR.subtotalBg}); fmtCell(ws,r,8,labF.replace(/I/g,'H'),{fill:CLR.subtotalBg}); fmtCell(ws,r,9,labF,{fill:CLR.subtotalBg}); fmtCell(ws,r,10,expF.replace(/K/g,'J'),{fill:CLR.subtotalBg}); fmtCell(ws,r,11,expF,{fill:CLR.subtotalBg}); fmtCell(ws,r,12,`F${r}+H${r}+J${r}`,{fill:CLR.subtotalBg}); fmtCell(ws,r,13,`G${r}+I${r}+K${r}`,{fill:CLR.subtotalBg}); txtCell(ws,r,14,'',{fill:CLR.subtotalBg}); subtotalRefs[trade]=r; r++; r++ })
      const subRows=Object.values(subtotalRefs); const mk=col=>subRows.length>0?`SUM(${subRows.map(sr=>`${col}${sr}`).join(',')})`:  '0'
      ws.mergeCells(r,1,r,5); txtCell(ws,r,1,'[합  계]',{fill:CLR.grandBg,bold:true,align:'center'}); for(let c=2;c<=5;c++) txtCell(ws,r,c,'',{fill:CLR.grandBg}); ;['F','G','H','I','J','K','L','M'].forEach((col,i)=>{ fmtCell(ws,r,6+i,mk(col),{fill:CLR.grandBg,bold:true}) }); txtCell(ws,r,14,'',{fill:CLR.grandBg})
    }


    const siteName = project.siteName || '견적'
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'')
    const filename = `${siteName}_자재내역서_${dateStr}.xlsx`
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'; a.href = url; a.download = filename
    document.body.appendChild(a); a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
  } catch (e) {
    console.error('엑셀 내보내기 오류:', e)
    alert('엑셀 내보내기 오류: ' + e.message)
  }
}

// ── 메인 내보내기 ─────────────────────────────
export async function exportToExcel(project, estimateItems, discount) {
  try {
    const totals = computeTotals(estimateItems, discount)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'JM건축인테리어'
    wb.created = new Date()

    const groups = buildGroupedItems(estimateItems)
    const rowMap = computeDetailRowMap(groups)

    makeCoverSheet(wb, project, totals)
    makeGapjiSheet(wb, project, totals)
    makeTradeSheet(wb, groups, rowMap)
    makeDetailSheet(wb, groups)

    const siteName = project.siteName || '견적'
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `${siteName}_견적서_${dateStr}.xlsx`

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
  } catch (e) {
    console.error('엑셀 내보내기 오류:', e)
    alert('엑셀 내보내기 오류: ' + e.message)
  }
}
