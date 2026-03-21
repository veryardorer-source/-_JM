// ─────────────────────────────────────────────
// 엑셀 내보내기 – exceljs 기반
// ─────────────────────────────────────────────
import ExcelJS from 'exceljs'

// ── 공종 분류 ─────────────────────────────────
function getTrade(name) {
  if (/각재|합판|석고|MDF|목재|랩핑|M-BAR/.test(name))           return '목작업'
  if (/벽지|합지|천정지|도장|페인트|핸디|스타코/.test(name))      return '수장작업'
  if (/인테리어필름|필름/.test(name))                             return '수장작업'
  if (/타일|줄눈/.test(name))                                     return '수장작업'
  if (/데코타일|장판|우드타일|후로링/.test(name))                  return '수장작업'
  if (/루바|텍스/.test(name))                                     return '수장작업'
  if (/조명|라인조명|면조명|펜던트|벽등|레일/.test(name))         return '전기통신작업'
  if (/도어|방문|ABS|강화|양문|현관|미서기|폴딩|중문|창호|유리/.test(name)) return '창호작업'
  if (/환풍기|배관|배수|급수|설비/.test(name))                    return '설비작업'
  if (/가구/.test(name))                                          return '가구'
  return '기타'
}

const TRADE_ORDER = ['가설작업','설비작업','목작업','전기통신작업','소방작업','수장작업','창호작업','가구','기타']

function getSfLabel(sf) {
  const DIR = {
    wallA:'벽A', wallB:'벽B', wallC:'벽C', wallD:'벽D',
    wallN:'벽A', wallS:'벽B', wallE:'벽C', wallW:'벽D',
    floor:'바닥', ceiling:'천장', wallExtra:'추가벽',
  }
  return sf.label || DIR[sf.direction] || sf.direction || ''
}

// ── 공통: 공종별 항목 그룹화 ─────────────────────────────
// makeTradeSheet / makeDetailSheet 양쪽에서 동일하게 사용
function buildTradeGroups(roomDataList, globalItems) {
  const groups = {}
  TRADE_ORDER.forEach(t => { groups[t] = [] })

  roomDataList.forEach(rd => {
    const roomLabel = rd.room.name

    // 면 자재 항목
    ;(rd.surfaceData || []).forEach(({ sf, items }) => {
      items.forEach(item => {
        const trade = getTrade(item.name)
        if (!groups[trade]) groups[trade] = []
        groups[trade].push({
          name: item.name, spec: item.spec || '', unit: item.unit,
          qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0,
          remark: `${roomLabel} ${getSfLabel(sf)}`,
        })
      })
    })

    // 칸막이벽 구조 자재 항목
    ;(rd.partitionData || []).forEach(({ partition, items }) => {
      items.forEach(item => {
        const trade = getTrade(item.name)
        if (!groups[trade]) groups[trade] = []
        groups[trade].push({
          name: item.name, spec: item.spec || '', unit: item.unit,
          qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0,
          remark: `${roomLabel} ${partition.name || '칸막이'}`,
        })
      })
    })

    // 도어 항목
    ;(rd.doorItems || []).forEach(item => {
      groups['창호작업'].push({
        name: item.name, spec: '', unit: item.unit,
        qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0,
        remark: roomLabel,
      })
    })

    // 조명 항목 (단가 미산출)
    ;(rd.lightingItems || []).forEach(item => {
      const isLine = item.name.includes('T5') || item.name.includes('T7')
      const spec = isLine ? `${Math.round((item.lengthM || 0) * 1000)}mm` : (item.spec || '')
      groups['전기통신작업'].push({
        name: item.name, spec, unit: isLine ? 'm' : 'EA',
        qty: isLine ? (item.lengthM || 0) : (item.qty || 0),
        matU: 0, matT: 0, remark: roomLabel,
      })
    })

    // 랩핑평판(몰딩) 항목 (단가 미산출)
    ;(rd.moldingItems || []).forEach(item => {
      groups['목작업'].push({
        name: item.name, spec: '', unit: 'EA',
        qty: item.qty || 0, matU: 0, matT: 0,
        remark: `${roomLabel} ${(item.lengthM || 0).toFixed(2)}m`,
      })
    })

    // 면별 노무비/부자재 항목
    ;(rd.room?.surfaces || []).forEach(sf => {
      ;(sf.laborItems || []).forEach(li => {
        if (!li.name) return
        const trade = '수장작업'
        if (!groups[trade]) groups[trade] = []
        const qty = li.qty || 0
        groups[trade].push({
          name: li.name,
          spec: '',
          unit: li.unit || '식',
          qty,
          matU: li.matUnitPrice || 0,
          matT: (li.matUnitPrice || 0) * qty,
          labU: li.labUnitPrice || 0,
          labT: (li.labUnitPrice || 0) * qty,
          expU: li.expUnitPrice || 0,
          expT: (li.expUnitPrice || 0) * qty,
          remark: `${roomLabel} ${sf.label || sf.direction}`,
          isGlobal: true,
        })
      })
    })
  })

  // 공통 항목 (글로벌)
  ;(globalItems || []).forEach(gi => {
    if (!gi.enabled || !gi.name) return
    const trade = gi.trade || '기타'
    if (!groups[trade]) groups[trade] = []
    groups[trade].push({
      name: gi.name, spec: gi.spec || '', unit: gi.unit,
      qty: gi.qty || 0,
      matU: gi.matUnitPrice || 0, matT: (gi.matUnitPrice || 0) * (gi.qty || 0),
      labU: gi.labUnitPrice || 0, labT: (gi.labUnitPrice || 0) * (gi.qty || 0),
      expU: gi.expUnitPrice || 0, expT: (gi.expUnitPrice || 0) * (gi.qty || 0),
      remark: gi.remark || '', isGlobal: true,
    })
  })

  return groups
}

// ── 스타일 헬퍼 ──────────────────────────────
const CLR = {
  headerBg:  '1E4078', headerFg: 'FFFFFF',
  tradeBg:   'EEF4FB', subtotalBg: 'D9E1F2',
  grandBg:   'FFFF00', inputBg:    'FFFDE7',
  formulaBg: 'EDF7EF', white:      'FFFFFF',
  border:    '999999', borderDark: '000000',
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
function inputCell(ws, r, c, opts = {}) {
  const cell = ws.getCell(r, c)
  cell.value = 0
  styleCell(cell, { numFmt: '#,##0', align: 'right', fill: CLR.inputBg, ...opts })
}

// ── 시트1: 내역서(요약) ───────────────────────
function makeSummarySheet(wb, project, matTotal) {
  const ws = wb.addWorksheet('내역서(요약)')
  ws.properties.defaultRowHeight = 16

  ws.columns = [
    { width: 18 }, { width: 12 }, { width: 7 }, { width: 6 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 9)
  const titleCell = ws.getCell(r, 1)
  titleCell.value = '내  역  서'
  titleCell.font = mkFont(true, 20)
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 32
  r++; r++

  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
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

  const hdrs = ['품  명','규  격','수 량','단위','재  료  비','노  무  비','경  비','합  계','비  고']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
  })
  ws.getRow(r).height = 20
  r++

  const sunRow = r
  ws.mergeCells(r, 1, r, 2)
  txtCell(ws, r, 1, '순 공 사 비', { fill: CLR.tradeBg, bold: true, align: 'center' })
  numCell(ws, r, 3, 1, { fill: CLR.tradeBg, align: 'center' })
  txtCell(ws, r, 4, '식', { fill: CLR.tradeBg, align: 'center' })
  numCell(ws, r, 5, matTotal, { fill: CLR.tradeBg, bold: true })
  inputCell(ws, r, 6)
  inputCell(ws, r, 7)
  fmtCell(ws, r, 8, `E${r}+F${r}+G${r}`, { fill: CLR.tradeBg })
  txtCell(ws, r, 9, '', { fill: CLR.tradeBg })
  r += 4

  const 직접Row = r
  ws.mergeCells(r, 1, r, 4)
  txtCell(ws, r, 1, '직 접 공 사 비 계', { fill: CLR.subtotalBg, bold: true, align: 'center' })
  numCell(ws, r, 5, matTotal, { fill: CLR.subtotalBg, bold: true })
  fmtCell(ws, r, 6, `F${sunRow}`, { fill: CLR.subtotalBg })
  fmtCell(ws, r, 7, `G${sunRow}`, { fill: CLR.subtotalBg })
  fmtCell(ws, r, 8, `H${sunRow}`, { fill: CLR.subtotalBg })
  txtCell(ws, r, 9, '', { fill: CLR.subtotalBg })
  r++

  const indirect = [
    ['고용보험',    '1.01%', `ROUND(F${sunRow}*0.0101,0)`],
    ['산재보험',    '3.56%', `ROUND(F${sunRow}*0.0356,0)`],
    ['일반관리비',  '5%',    `ROUND(H${직접Row}*0.05,0)`],
    ['이윤',       '10%',   `ROUND(H${직접Row}*0.1,0)`],
    ['단수정리',    '',      null],
  ]
  const indirectRows = []
  indirect.forEach(([name, spec, formula]) => {
    for (let c = 1; c <= 9; c++) txtCell(ws, r, c, '')
    txtCell(ws, r, 1, name)
    txtCell(ws, r, 2, spec, { align: 'center' })
    if (formula) fmtCell(ws, r, 8, formula)
    else txtCell(ws, r, 8, '천단위절사', { align: 'right' })
    indirectRows.push(r)
    r++
  })

  const 간접Row = r
  const indSum = `SUM(${indirectRows.slice(0,4).map(ir=>`H${ir}`).join(',')})`
  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, '간 접 공 사 비 계', { fill: CLR.subtotalBg, bold: true, align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
  fmtCell(ws, r, 8, indSum, { fill: CLR.subtotalBg })
  txtCell(ws, r, 9, '', { fill: CLR.subtotalBg })
  r++

  const 총Row = r
  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, '총  공  사  비', { bold: true, align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '')
  fmtCell(ws, r, 8, `FLOOR(H${직접Row}+H${간접Row},1000)`)
  txtCell(ws, r, 9, '')
  r++

  const 부가Row = r
  ws.mergeCells(r, 1, r, 2)
  txtCell(ws, r, 1, '부  가  세', { align: 'center' })
  txtCell(ws, r, 2, '', { align: 'center' })
  txtCell(ws, r, 3, '10%', { align: 'center' })
  for (let c = 4; c <= 7; c++) txtCell(ws, r, c, '')
  fmtCell(ws, r, 8, `ROUND(H${총Row}*0.1,-3)`)
  txtCell(ws, r, 9, '')
  r++

  ws.mergeCells(r, 1, r, 7)
  txtCell(ws, r, 1, '[  합  계  ]', { fill: CLR.grandBg, bold: true, size: 12, align: 'center' })
  for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '', { fill: CLR.grandBg })
  fmtCell(ws, r, 8, `H${총Row}+H${부가Row}`, { fill: CLR.grandBg, bold: true, size: 12 })
  txtCell(ws, r, 9, '', { fill: CLR.grandBg })
  ws.getRow(r).height = 22
  r++; r++

  ws.mergeCells(r, 1, r, 9)
  ws.getCell(r, 1).value = '특기사항 :'
  ws.getCell(r, 1).font = mkFont(false, 10)
}

// ── 시트2: 공종별 집계표 ──────────────────────
// tradeGroups: buildTradeGroups() 결과 (공종 → 항목 배열)
function makeTradeSheet(wb, tradeGroups) {
  const ws = wb.addWorksheet('공종별집계')
  ws.properties.defaultRowHeight = 16
  ws.columns = [
    {width:20},{width:12},{width:6},{width:6},
    {width:12},{width:12},{width:12},{width:12},
    {width:12},{width:12},{width:12},{width:12},{width:16},
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 13)
  const t = ws.getCell(r, 1)
  t.value = '공  종  별  집  계  표'
  t.font = mkFont(true, 16)
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 28
  r++; r++

  const hdrs = ['품  명','규  격','단위','수량','재료비\n단가','재료비\n금액','노무비\n단가','노무비\n금액','경비\n단가','경비\n금액','합계\n단가','합계\n금액','비고']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(r).height = 28
  r++

  const dataRows = []
  TRADE_ORDER.forEach(trade => {
    const items = tradeGroups[trade] || []
    if (items.length === 0) return
    const matTotal = items.reduce((s, i) => s + (i.matT || 0), 0)
    const labTotal = items.reduce((s, i) => s + (i.labT || 0), 0)
    const expTotal = items.reduce((s, i) => s + (i.expT || 0), 0)

    txtCell(ws, r, 1, trade, { fill: CLR.tradeBg, bold: true })
    txtCell(ws, r, 2, '', { fill: CLR.tradeBg, align: 'center' })
    txtCell(ws, r, 3, '식', { fill: CLR.tradeBg, align: 'center' })
    numCell(ws, r, 4, 1, { fill: CLR.tradeBg, align: 'center' })
    numCell(ws, r, 5, matTotal, { fill: CLR.tradeBg })
    numCell(ws, r, 6, matTotal, { fill: CLR.tradeBg, bold: true })
    numCell(ws, r, 7, labTotal, { fill: CLR.tradeBg })
    numCell(ws, r, 8, labTotal, { fill: CLR.tradeBg })
    numCell(ws, r, 9, expTotal, { fill: CLR.tradeBg })
    numCell(ws, r, 10, expTotal, { fill: CLR.tradeBg })
    fmtCell(ws, r, 11, `E${r}+G${r}+I${r}`, { fill: CLR.tradeBg })
    fmtCell(ws, r, 12, `F${r}+H${r}+J${r}`, { fill: CLR.tradeBg })
    txtCell(ws, r, 13, '', { fill: CLR.tradeBg })
    dataRows.push(r)
    r++
  })

  ws.mergeCells(r, 1, r, 3)
  txtCell(ws, r, 1, '합  계', { fill: CLR.subtotalBg, bold: true, align: 'center' })
  for (let c = 2; c <= 13; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
  if (dataRows.length > 0) {
    const mk = col => `SUM(${dataRows.map(dr=>`${col}${dr}`).join(',')})`
    fmtCell(ws, r, 6, mk('F'), { fill: CLR.subtotalBg })
    fmtCell(ws, r, 8, mk('H'), { fill: CLR.subtotalBg })
    fmtCell(ws, r, 10, mk('J'), { fill: CLR.subtotalBg })
    fmtCell(ws, r, 12, mk('L'), { fill: CLR.subtotalBg })
  }
}

// ── 시트3: 내역서(상세) ───────────────────────
// tradeGroups: buildTradeGroups() 결과
function makeDetailSheet(wb, tradeGroups) {
  const ws = wb.addWorksheet('내역서(상세)')
  ws.properties.defaultRowHeight = 15
  ws.columns = [
    {width:12},{width:26},{width:20},{width:6},{width:7},
    {width:11},{width:11},{width:11},{width:11},
    {width:11},{width:11},{width:11},{width:11},{width:18},
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 14)
  const t = ws.getCell(r, 1)
  t.value = '[내  역  서]'
  t.font = mkFont(true, 16)
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 28
  r++; r++

  const hdrs = ['항목','품명','규격','단위','수량',
    '재료비\n단가','재료비\n금액','노무비\n단가','노무비\n금액',
    '경비\n단가','경비\n금액','합계\n단가','합계\n금액','비고']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(r).height = 28
  r++

  const subtotalRefs = {}
  let tradeNum = 1

  TRADE_ORDER.forEach(trade => {
    const items = tradeGroups[trade] || []
    if (items.length === 0) return

    // 공종 헤더
    ws.mergeCells(r, 1, r, 14)
    const th = ws.getCell(r, 1)
    th.value = `${tradeNum}  ${trade}`
    styleCell(th, { fill: CLR.tradeBg, bold: true })
    ws.getRow(r).height = 18
    r++; tradeNum++

    const itemRows = []
    items.forEach(item => {
      itemRows.push(r)
      txtCell(ws, r, 1, '')
      txtCell(ws, r, 2, item.name)
      txtCell(ws, r, 3, item.spec || '')
      txtCell(ws, r, 4, item.unit, { align: 'center' })
      numCell(ws, r, 5, item.qty, { align: 'center' })
      // 재료비
      numCell(ws, r, 6, item.matU || 0)
      numCell(ws, r, 7, item.matT || 0)
      // 노무비
      numCell(ws, r, 8, item.labU || 0)
      numCell(ws, r, 9, item.labT || 0)
      // 경비
      numCell(ws, r, 10, item.expU || 0)
      numCell(ws, r, 11, item.expT || 0)
      // 합계 수식
      fmtCell(ws, r, 12, `F${r}+H${r}+J${r}`)
      fmtCell(ws, r, 13, `G${r}+I${r}+K${r}`)
      txtCell(ws, r, 14, item.remark || '')
      r++
    })

    // 소계 행
    const matF = `SUM(${itemRows.map(ir=>`G${ir}`).join(',')})`
    const labF = `SUM(${itemRows.map(ir=>`I${ir}`).join(',')})`
    const expF = `SUM(${itemRows.map(ir=>`K${ir}`).join(',')})`
    ws.mergeCells(r, 1, r, 5)
    txtCell(ws, r, 1, '[소  계]', { fill: CLR.subtotalBg, bold: true, align: 'center' })
    for (let c = 2; c <= 5; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
    fmtCell(ws, r, 6, matF.replace(/G/g,'F'), { fill: CLR.subtotalBg })
    fmtCell(ws, r, 7, matF, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 8, labF.replace(/I/g,'H'), { fill: CLR.subtotalBg })
    fmtCell(ws, r, 9, labF, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 10, expF.replace(/K/g,'J'), { fill: CLR.subtotalBg })
    fmtCell(ws, r, 11, expF, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 12, `F${r}+H${r}+J${r}`, { fill: CLR.subtotalBg })
    fmtCell(ws, r, 13, `G${r}+I${r}+K${r}`, { fill: CLR.subtotalBg })
    txtCell(ws, r, 14, '', { fill: CLR.subtotalBg })
    subtotalRefs[trade] = r
    r++; r++
  })

  // 전체 합계 행
  const subRows = Object.values(subtotalRefs)
  const mk = col => subRows.length > 0 ? `SUM(${subRows.map(sr=>`${col}${sr}`).join(',')})` : '0'
  ws.mergeCells(r, 1, r, 5)
  txtCell(ws, r, 1, '[합  계]', { fill: CLR.grandBg, bold: true, align: 'center' })
  for (let c = 2; c <= 5; c++) txtCell(ws, r, c, '', { fill: CLR.grandBg })
  ;['F','G','H','I','J','K','L','M'].forEach((col, i) => {
    fmtCell(ws, r, 6 + i, mk(col), { fill: CLR.grandBg, bold: true })
  })
  txtCell(ws, r, 14, '', { fill: CLR.grandBg })
}

// ── 시트4: 자재 집계표 ────────────────────────
function makeMaterialSummarySheet(wb, tradeGroups) {
  const ws = wb.addWorksheet('자재집계')
  ws.properties.defaultRowHeight = 16
  ws.columns = [
    { width: 28 }, { width: 20 }, { width: 7 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 22 },
  ]

  let r = 1
  ws.mergeCells(r, 1, r, 7)
  const t = ws.getCell(r, 1)
  t.value = '자  재  집  계  표'
  t.font = mkFont(true, 16)
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 28
  r++; r++

  const hdrs = ['자재명', '규격/구분', '단위', '수량', '단가', '금액', '비고(공간)']
  hdrs.forEach((h, i) => {
    const cell = ws.getCell(r, i + 1)
    cell.value = h
    styleCell(cell, { fill: CLR.headerBg, fgColor: CLR.headerFg, bold: true, align: 'center' })
  })
  ws.getRow(r).height = 20
  r++

  // 모든 항목 수집 → 자재명+단위 기준으로 집계
  const matMap = new Map()
  TRADE_ORDER.forEach(trade => {
    ;(tradeGroups[trade] || []).forEach(item => {
      const key = `${item.name}||${item.unit}`
      if (!matMap.has(key)) {
        matMap.set(key, {
          name: item.name,
          unit: item.unit,
          trade,
          totalQty: 0,
          totalCost: 0,
          unitPrice: item.matU || 0,
          remarks: new Set(),
        })
      }
      const entry = matMap.get(key)
      entry.totalQty = Math.round((entry.totalQty + (item.qty || 0)) * 1000) / 1000
      entry.totalCost += item.matT || 0
      if (item.remark) entry.remarks.add(item.remark)
    })
  })

  // 공종 순서 → 자재명 순으로 정렬
  const tradeOrder = {}
  TRADE_ORDER.forEach((t, i) => { tradeOrder[t] = i })
  const sorted = [...matMap.values()].sort((a, b) => {
    const td = (tradeOrder[a.trade] ?? 99) - (tradeOrder[b.trade] ?? 99)
    if (td !== 0) return td
    return a.name.localeCompare(b.name, 'ko')
  })

  // 공종별로 그룹 헤더 + 항목 출력
  let currentTrade = null
  const tradeSubtotalRows = {}
  const tradeItemRows = {}

  sorted.forEach(entry => {
    // 공종 헤더
    if (entry.trade !== currentTrade) {
      currentTrade = entry.trade
      tradeItemRows[currentTrade] = []
      txtCell(ws, r, 1, currentTrade, { fill: CLR.tradeBg, bold: true })
      for (let c = 2; c <= 7; c++) txtCell(ws, r, c, '', { fill: CLR.tradeBg })
      r++
    }

    tradeItemRows[currentTrade].push(r)
    txtCell(ws, r, 1, entry.name)
    txtCell(ws, r, 2, entry.unit === '단' ? '각재(단)' : entry.unit === '롤' ? '도배지(롤)' : '', { align: 'center' })
    txtCell(ws, r, 3, entry.unit, { align: 'center' })
    numCell(ws, r, 4, Math.round(entry.totalQty * 100) / 100, { align: 'right' })
    numCell(ws, r, 5, entry.unitPrice)
    numCell(ws, r, 6, Math.round(entry.totalCost))
    txtCell(ws, r, 7, [...entry.remarks].join(', '))
    r++
  })

  // 공종별 소계
  r++
  for (const [trade, itemRowNums] of Object.entries(tradeItemRows)) {
    if (itemRowNums.length === 0) continue
    tradeSubtotalRows[trade] = r
    const qtyF = `SUM(${itemRowNums.map(n => `D${n}`).join(',')})`
    const costF = `SUM(${itemRowNums.map(n => `F${n}`).join(',')})`
    ws.mergeCells(r, 1, r, 3)
    txtCell(ws, r, 1, `[${trade} 소계]`, { fill: CLR.subtotalBg, bold: true, align: 'center' })
    for (let c = 2; c <= 3; c++) txtCell(ws, r, c, '', { fill: CLR.subtotalBg })
    txtCell(ws, r, 4, '', { fill: CLR.subtotalBg })
    txtCell(ws, r, 5, '', { fill: CLR.subtotalBg })
    fmtCell(ws, r, 6, costF, { fill: CLR.subtotalBg })
    txtCell(ws, r, 7, '', { fill: CLR.subtotalBg })
    r++
  }

  // 전체 합계
  r++
  const subRs = Object.values(tradeSubtotalRows)
  ws.mergeCells(r, 1, r, 5)
  txtCell(ws, r, 1, '[자  재  합  계]', { fill: CLR.grandBg, bold: true, align: 'center' })
  for (let c = 2; c <= 5; c++) txtCell(ws, r, c, '', { fill: CLR.grandBg })
  if (subRs.length > 0) {
    fmtCell(ws, r, 6, `SUM(${subRs.map(sr => `F${sr}`).join(',')})`, { fill: CLR.grandBg, bold: true })
  }
  txtCell(ws, r, 7, '', { fill: CLR.grandBg })
  ws.getRow(r).height = 20
}

// ── 메인 내보내기 ─────────────────────────────
export async function exportToExcel(project, roomDataList, grandAggregate, grandTotal, globalItems) {
  try {
    // 공종별 그룹 (시트2·3 공통 사용)
    const tradeGroups = buildTradeGroups(roomDataList, globalItems)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'JM건축인테리어'
    wb.created = new Date()

    makeSummarySheet(wb, project, grandTotal)
    makeTradeSheet(wb, tradeGroups)
    makeDetailSheet(wb, tradeGroups)
    makeMaterialSummarySheet(wb, tradeGroups)

    const siteName = project.siteName || '견적'
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'')
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
