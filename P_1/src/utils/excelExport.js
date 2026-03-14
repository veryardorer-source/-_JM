// ─────────────────────────────────────────────
// 엑셀 내보내기 – JM건축인테리어 견적서 양식
// ─────────────────────────────────────────────
import * as XLSX from 'xlsx'

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
  if (/블라인드/.test(name))                                      return '기타'
  return '기타'
}

const TRADE_ORDER = ['가설작업','설비작업','목작업','전기통신작업','소방작업','수장작업','창호작업','가구','기타']

// ── 셀 스타일 헬퍼 ────────────────────────────
const B = (s='thin', rgb='999999') => ({ style: s, color: { rgb } })
const borderAll  = { top: B(), bottom: B(), left: B(), right: B() }
const borderBold = { top: B('medium','000000'), bottom: B('medium','000000'), left: B('medium','000000'), right: B('medium','000000') }
const borderB    = { ...borderAll, bottom: B('medium','000000') }
const borderT    = { ...borderAll, top: B('medium','000000') }

const FILL_HEADER  = { fgColor: { rgb: 'DCE6F1' } }
const FILL_TRADE   = { fgColor: { rgb: 'EEF4FB' } }
const FILL_SUBTOT  = { fgColor: { rgb: 'D9E1F2' } }
const FILL_GRAND   = { fgColor: { rgb: 'FFFF00' } }
const FILL_EMPTY   = { fgColor: { rgb: 'FFFDE7' } }  // 노무비/경비 입력 칸 (연노란)
const FILL_FORMULA = { fgColor: { rgb: 'EDF7EF' } }  // 수식 자동계산 칸 (연초록)

const AL = { horizontal: 'left' }
const AC = { horizontal: 'center' }
const AR = { horizontal: 'right' }

function cs(v, fill, align = AL, bold = false, sz = 10) {
  return {
    v: v ?? '',
    t: typeof v === 'number' ? 'n' : 's',
    s: { border: borderAll, fill, font: { sz, bold }, alignment: align },
  }
}
function cn(v, fill, bold = false) {
  return {
    v: v || 0,
    t: 'n',
    s: { border: borderAll, fill, font: { sz: 10, bold }, alignment: AR, numFmt: '#,##0' },
  }
}
function cf(formula, fill) {
  return {
    f: formula,
    t: 'n',
    s: { border: borderAll, fill: fill || FILL_FORMULA, font: { sz: 10 }, alignment: AR, numFmt: '#,##0' },
  }
}
function ce(fill = FILL_EMPTY) {
  return { v: '', t: 's', s: { border: borderAll, fill, font: { sz: 10 } } }
}

// 컬럼 주소 (0-based → A,B,C...)
const CL = (n) => String.fromCharCode(65 + n)
const CR = (col, row) => `${CL(col)}${row}`

// 숫자→한글 금액
function numToKorean(n) {
  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  const parts = ['', '십', '백', '천']
  const bigParts = ['', '만', '억', '조']
  let str = '', num = Math.round(n)
  if (num === 0) return '영'
  let bi = 0
  while (num > 0) {
    const chunk = num % 10000
    if (chunk > 0) {
      let s = ''
      for (let i = 3; i >= 0; i--) {
        const d = Math.floor(chunk / Math.pow(10, i)) % 10
        if (d > 0) s += (d === 1 && i > 0 ? '' : units[d]) + parts[i]
      }
      str = s + bigParts[bi] + str
    }
    num = Math.floor(num / 10000)
    bi++
  }
  return '일금 ' + str + '원정'
}

// ── 워크시트에 셀 직접 쓰기 ──────────────────
function setCell(ws, col, row, cell) {
  const addr = CR(col, row)
  ws[addr] = cell
  if (!ws['!ref']) {
    ws['!ref'] = `A1:A1`
  }
  // ref 확장
  const ref = XLSX.utils.decode_range(ws['!ref'])
  if (col > ref.e.c) ref.e.c = col
  if (row - 1 > ref.e.r) ref.e.r = row - 1
  ws['!ref'] = XLSX.utils.encode_range(ref)
}

function initWs() {
  return { '!ref': 'A1:N1', '!merges': [], '!cols': [] }
}

function merge(ws, r1, c1, r2, c2) {
  ws['!merges'].push({ s: { r: r1 - 1, c: c1 }, e: { r: r2 - 1, c: c2 } })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 시트1: 내역서 (요약)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컬럼: 품명(A) 규격(B) 수량(C) 단위(D) 재료비(E) 노무비(F) 경비(G) 합계(H) 비고(I)
function makeSummarySheet(project, matTotal, detailSheetName) {
  const ws = initWs()
  let r = 1

  // 타이틀
  merge(ws, r, 0, r, 8)
  setCell(ws, 0, r, { v: '내  역  서', t: 's', s: { font: { sz: 20, bold: true }, alignment: AC, border: borderAll } })
  r += 2

  // 프로젝트 정보
  const now = new Date()
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`
  const infoRows = [
    ['수  신', project.clientName || '', '작  성  일', dateStr],
    ['공  사  명', project.siteName || '', '', ''],
    ['담  당', project.manager || '', '', ''],
  ]
  infoRows.forEach(([k1, v1, k2, v2]) => {
    merge(ws, r, 0, r, 0)
    merge(ws, r, 1, r, 4)
    merge(ws, r, 5, r, 5)
    merge(ws, r, 6, r, 8)
    setCell(ws, 0, r, { v: k1, t: 's', s: { border: borderAll, font: { sz: 10, bold: true } } })
    setCell(ws, 1, r, { v: v1, t: 's', s: { border: borderAll, font: { sz: 10 } } })
    setCell(ws, 5, r, { v: k2, t: 's', s: { border: borderAll, font: { sz: 10, bold: true } } })
    setCell(ws, 6, r, { v: v2, t: 's', s: { border: borderAll, font: { sz: 10 } } })
    r++
  })
  r++

  // "아래와 같이 견적합니다."
  merge(ws, r, 0, r, 8)
  setCell(ws, 0, r, { v: '아래와 같이 견적합니다.', t: 's', s: { font: { sz: 10, bold: true }, alignment: AL, border: borderAll } })
  r++; r++

  // 테이블 헤더
  const hdrs = ['품  명', '규  격', '수 량', '단위', '재  료  비', '노  무  비', '경  비', '합  계', '비  고']
  hdrs.forEach((h, i) => setCell(ws, i, r, cs(h, FILL_HEADER, AC, true, 10)))
  r++

  // 순공사비 행
  const labRef = `F${r}`  // 노무비 셀 (사용자 입력)
  const expRef = `G${r}`  // 경비 셀 (사용자 입력)
  setCell(ws, 0, r, cs('순 공 사 비', FILL_TRADE, AC, true))
  setCell(ws, 1, r, cs('', FILL_TRADE, AC))
  setCell(ws, 2, r, cn(1, FILL_TRADE))
  setCell(ws, 3, r, cs('식', FILL_TRADE, AC))
  setCell(ws, 4, r, cn(matTotal, FILL_TRADE, true))
  setCell(ws, 5, r, ce(FILL_EMPTY))   // 노무비 입력
  setCell(ws, 6, r, ce(FILL_EMPTY))   // 경비 입력
  setCell(ws, 7, r, cf(`E${r}+F${r}+G${r}`, FILL_FORMULA))
  setCell(ws, 8, r, ce())
  const 순공사비Row = r
  r += 4

  // 직접공사비 계
  for (let i = 0; i < 9; i++) setCell(ws, i, r, cs('', FILL_SUBTOT, AC))
  setCell(ws, 0, r, cs('직 접 공 사 비 계', FILL_SUBTOT, AC, true))
  setCell(ws, 4, r, cn(matTotal, FILL_SUBTOT, true))
  setCell(ws, 5, r, cf(`F${순공사비Row}`, FILL_SUBTOT))
  setCell(ws, 6, r, cf(`G${순공사비Row}`, FILL_SUBTOT))
  setCell(ws, 7, r, cf(`H${순공사비Row}`, FILL_SUBTOT))
  const 직접Row = r
  r++

  // 간접비 항목들
  const 노무비Row = 순공사비Row
  const indirectItems = [
    ['고용보험', '1.01%', `ROUND(F${노무비Row}*0.0101,0)`],
    ['산재보험', '3.56%', `ROUND(F${노무비Row}*0.0356,0)`],
    ['일반관리비', '5%',   `ROUND(H${직접Row}*0.05,0)`],
    ['이윤', '10%',        `ROUND(H${직접Row}*0.1,0)`],
    ['단수정리', '',       null],
  ]
  const indirectRows = []
  indirectItems.forEach(([name, spec, formula]) => {
    setCell(ws, 0, r, cs(name, {}, AL, false))
    setCell(ws, 1, r, cs(spec, {}, AC, false))
    for (let i = 2; i < 7; i++) setCell(ws, i, r, cs('', {}, AC))
    if (formula) {
      setCell(ws, 7, r, cf(formula))
    } else {
      setCell(ws, 7, r, cs('천단위절사', {}, AR))
    }
    setCell(ws, 8, r, cs('', {}, AC))
    indirectRows.push(r)
    r++
  })

  // 간접공사비 계
  for (let i = 0; i < 9; i++) setCell(ws, i, r, cs('', FILL_SUBTOT, AC))
  setCell(ws, 0, r, cs('간 접 공 사 비 계', FILL_SUBTOT, AC, true))
  const indirectSumFormula = `SUM(${indirectRows.filter((_,i)=>i<4).map(ir=>`H${ir}`).join(',')})`
  setCell(ws, 7, r, cf(indirectSumFormula, FILL_SUBTOT))
  const 간접Row = r
  r++

  // 총공사비
  for (let i = 0; i < 9; i++) setCell(ws, i, r, cs('', {}, AC))
  setCell(ws, 0, r, cs('총  공  사  비', {}, AC, true))
  setCell(ws, 7, r, cf(`FLOOR(H${직접Row}+H${간접Row},1000)`, FILL_FORMULA))
  const 총공사비Row = r
  r++

  // 부가세
  for (let i = 0; i < 9; i++) setCell(ws, i, r, cs('', {}, AC))
  setCell(ws, 0, r, cs('부  가  세', {}, AC))
  setCell(ws, 1, r, cs('10%', {}, AC))
  setCell(ws, 7, r, cf(`ROUND(H${총공사비Row}*0.1,-3)`, FILL_FORMULA))
  const 부가세Row = r
  r++

  // 합계
  const grandFill = FILL_GRAND
  for (let i = 0; i < 9; i++) setCell(ws, i, r, cs('', grandFill, AC, true))
  setCell(ws, 0, r, cs('[  합  계  ]', grandFill, AC, true, 12))
  setCell(ws, 7, r, cf(`H${총공사비Row}+H${부가세Row}`, { ...grandFill }))
  r++

  // 특기사항
  r++
  merge(ws, r, 0, r, 8)
  setCell(ws, 0, r, { v: '특기사항 :', t: 's', s: { font: { sz: 10 }, alignment: AL } })

  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 5 },
    { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 14 },
  ]
  return ws
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 시트2: 공종별 집계표
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컬럼: 품명(A) 규격(B) 단위(C) 수량(D) 재료비단가(E) 재료비금액(F) 노무비단가(G) 노무비금액(H) 경비단가(I) 경비금액(J) 합계단가(K) 합계금액(L) 비고(M)
function makeTradeSheet(tradeMap) {
  const ws = initWs()
  let r = 1

  merge(ws, r, 0, r, 12)
  setCell(ws, 0, r, { v: '공  종  별  집  계  표', t: 's', s: { font: { sz: 16, bold: true }, alignment: AC } })
  r += 2

  // 헤더
  const H = ['품  명','규  격','단위','수량','재료비\n단가','재료비\n금액','노무비\n단가','노무비\n금액','경  비\n단가','경  비\n금액','합계\n단가','합계\n금액','비고']
  H.forEach((h, i) => setCell(ws, i, r, { ...cs(h, FILL_HEADER, AC, true, 10), s: { ...cs(h, FILL_HEADER, AC, true).s, alignment: { horizontal: 'center', wrapText: true } } }))
  r++

  let totalMat = 0
  const dataRows = []

  TRADE_ORDER.forEach(trade => {
    const mat = tradeMap[trade] || 0
    if (mat === 0) return
    totalMat += mat

    setCell(ws, 0, r, cs(trade, FILL_TRADE, AL, true))
    setCell(ws, 1, r, cs('', FILL_TRADE, AC))
    setCell(ws, 2, r, cs('식', FILL_TRADE, AC))
    setCell(ws, 3, r, cn(1, FILL_TRADE))
    setCell(ws, 4, r, cn(mat, FILL_TRADE))
    setCell(ws, 5, r, cn(mat, FILL_TRADE, true))
    setCell(ws, 6, r, ce(FILL_EMPTY))
    setCell(ws, 7, r, ce(FILL_EMPTY))
    setCell(ws, 8, r, ce(FILL_EMPTY))
    setCell(ws, 9, r, ce(FILL_EMPTY))
    setCell(ws, 10, r, cf(`E${r}+G${r}+I${r}`, FILL_FORMULA))
    setCell(ws, 11, r, cf(`F${r}+H${r}+J${r}`, FILL_FORMULA))
    setCell(ws, 12, r, cs('', {}, AC))
    dataRows.push(r)
    r++
  })

  // 전체 항목 (실 외)
  // (globalItems는 tradeMap에 포함되어 있음)

  // 합계
  for (let i = 0; i < 13; i++) setCell(ws, i, r, cs('', FILL_SUBTOT, AC, true))
  setCell(ws, 0, r, cs('합  계', FILL_SUBTOT, AC, true))
  if (dataRows.length > 0) {
    setCell(ws, 5, r, cf(`SUM(${dataRows.map(dr=>`F${dr}`).join(',')})`, FILL_SUBTOT))
    setCell(ws, 7, r, cf(`SUM(${dataRows.map(dr=>`H${dr}`).join(',')})`, FILL_SUBTOT))
    setCell(ws, 9, r, cf(`SUM(${dataRows.map(dr=>`J${dr}`).join(',')})`, FILL_SUBTOT))
    setCell(ws, 11, r, cf(`SUM(${dataRows.map(dr=>`L${dr}`).join(',')})`, FILL_SUBTOT))
  }

  ws['!cols'] = [
    {wch:18},{wch:10},{wch:5},{wch:5},
    {wch:11},{wch:11},{wch:11},{wch:11},
    {wch:11},{wch:11},{wch:11},{wch:11},{wch:14},
  ]
  return ws
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 시트3: 내역서 (상세)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 컬럼: 항목(A) 품명(B) 규격(C) 단위(D) 수량(E)
//       재료비단가(F) 재료비금액(G) 노무비단가(H) 노무비금액(I)
//       경비단가(J) 경비금액(K) 합계단가(L) 합계금액(M) 비고(N)
function makeDetailSheet(roomDataList, globalItems) {
  const ws = initWs()
  let r = 1

  merge(ws, r, 0, r, 13)
  setCell(ws, 0, r, { v: '[내  역  서]', t: 's', s: { font: { sz: 16, bold: true }, alignment: AC } })
  r += 2

  // 헤더 행
  const hdrs = ['항목','품명','규격','단위','수량',
    '재료비\n단가','재료비\n금액',
    '노무비\n단가','노무비\n금액',
    '경비\n단가','경비\n금액',
    '합계\n단가','합계\n금액','비고']
  hdrs.forEach((h, i) => {
    ws[CR(i, r)] = {
      v: h, t: 's',
      s: { border: borderAll, fill: FILL_HEADER, font: { sz: 10, bold: true }, alignment: { horizontal: 'center', wrapText: true } }
    }
  })
  r++

  // 공종별로 아이템 그룹화
  const tradeGroups = {}
  TRADE_ORDER.forEach(t => { tradeGroups[t] = [] })

  // 실별 자재 항목 수집
  roomDataList.forEach(rd => {
    const roomLabel = rd.room.name

    rd.surfaceData.forEach(({ sf, items }) => {
      items.forEach(item => {
        const trade = getTrade(item.name)
        if (!tradeGroups[trade]) tradeGroups[trade] = []
        tradeGroups[trade].push({
          name: item.name,
          spec: item.spec || '',
          unit: item.unit,
          qty: item.qty,
          matU: item.unitPrice || 0,
          matT: item.cost || 0,
          remark: `${roomLabel} ${sf.label}`,
        })
      })
    })

    rd.doorItems.forEach(item => {
      tradeGroups['창호작업'].push({
        name: item.name, spec: '', unit: item.unit,
        qty: item.qty, matU: item.unitPrice || 0, matT: item.cost || 0,
        remark: roomLabel,
      })
    })

    rd.lightingItems.forEach(item => {
      tradeGroups['전기통신작업'].push({
        name: item.name, spec: item.spec || '', unit: 'EA',
        qty: item.qty, matU: 0, matT: 0,
        remark: roomLabel,
      })
    })

    rd.moldingItems.forEach(item => {
      tradeGroups['목작업'].push({
        name: item.name, spec: '', unit: 'EA',
        qty: item.qty, matU: 0, matT: 0,
        remark: `${roomLabel} ${item.lengthM?.toFixed(1)}m`,
      })
    })
  })

  // 전체 항목 (실 외) 수집
  ;(globalItems || []).forEach(gi => {
    if (!gi.enabled || !gi.name) return
    const trade = gi.trade || '기타'
    if (!tradeGroups[trade]) tradeGroups[trade] = []
    const matT = (gi.matUnitPrice || 0) * (gi.qty || 0)
    tradeGroups[trade].push({
      name: gi.name, spec: gi.spec || '', unit: gi.unit,
      qty: gi.qty || 0,
      matU: gi.matUnitPrice || 0, matT,
      labU: gi.labUnitPrice || 0, labT: (gi.labUnitPrice || 0) * (gi.qty || 0),
      expU: gi.expUnitPrice || 0, expT: (gi.expUnitPrice || 0) * (gi.qty || 0),
      remark: gi.remark || '',
      isGlobal: true,
    })
  })

  // 공종별 행 작성
  const tradeSubtotalRefs = {}
  let tradeNum = 1

  TRADE_ORDER.forEach(trade => {
    const items = (tradeGroups[trade] || [])
    if (items.length === 0) return

    const tradeStartRow = r

    // 공종 헤더 행
    merge(ws, r, 0, r, 13)
    setCell(ws, 0, r, {
      v: `${tradeNum}  ${trade}`, t: 's',
      s: { border: borderAll, fill: FILL_TRADE, font: { sz: 10, bold: true }, alignment: AL }
    })
    r++
    tradeNum++

    // 자재 항목 행
    const itemRows = []
    items.forEach(item => {
      itemRows.push(r)

      setCell(ws, 0, r, cs('', {}, AC))            // 항목
      setCell(ws, 1, r, cs(item.name, {}, AL))     // 품명
      setCell(ws, 2, r, cs(item.spec || '', {}, AL)) // 규격
      setCell(ws, 3, r, cs(item.unit, {}, AC))     // 단위
      setCell(ws, 4, r, cn(item.qty, {}))           // 수량

      // 재료비
      setCell(ws, 5, r, item.matU > 0 ? cn(item.matU, {}) : cs('-', {}, AC))
      setCell(ws, 6, r, item.matT > 0 ? cn(item.matT, {}) : cs('-', {}, AC))

      // 노무비 (전체항목은 값 있으면 표시, 아니면 빈칸)
      if (item.isGlobal && item.labU > 0) {
        setCell(ws, 7, r, cn(item.labU, {}))
        setCell(ws, 8, r, cn(item.labT, {}))
      } else {
        setCell(ws, 7, r, cs('-', {}, AC))
        setCell(ws, 8, r, cs('-', {}, AC))
      }

      // 경비
      if (item.isGlobal && item.expU > 0) {
        setCell(ws, 9, r, cn(item.expU, {}))
        setCell(ws, 10, r, cn(item.expT, {}))
      } else {
        setCell(ws, 9, r, cs('-', {}, AC))
        setCell(ws, 10, r, cs('-', {}, AC))
      }

      // 합계
      setCell(ws, 11, r, cs('-', {}, AC))
      setCell(ws, 12, r, cs('-', {}, AC))
      setCell(ws, 13, r, cs(item.remark || '', {}, AL)) // 비고
      r++
    })

    // 노무비 행 (입력용 빈칸) - 전체항목이 아닌 경우만
    const hasManualItems = items.some(it => !it.isGlobal)
    if (hasManualItems) {
      setCell(ws, 0, r, cs('', {}, AC))
      setCell(ws, 1, r, cs('노무비', FILL_EMPTY, AL, true))
      setCell(ws, 2, r, cs('', FILL_EMPTY, AC))
      setCell(ws, 3, r, cs('인', FILL_EMPTY, AC))
      setCell(ws, 4, r, ce(FILL_EMPTY))       // 수량(인원) – 입력
      setCell(ws, 5, r, cs('-', {}, AC))
      setCell(ws, 6, r, cs('-', {}, AC))
      setCell(ws, 7, r, ce(FILL_EMPTY))       // 노무비 단가(일당) – 입력
      setCell(ws, 8, r, cf(`H${r}*E${r}`, FILL_FORMULA))  // 노무비 금액 (자동)
      setCell(ws, 9, r, ce(FILL_EMPTY))       // 경비 단가 – 입력
      setCell(ws, 10, r, cf(`J${r}*E${r}`, FILL_FORMULA)) // 경비 금액 (자동)
      setCell(ws, 11, r, cf(`H${r}+J${r}`, FILL_FORMULA))
      setCell(ws, 12, r, cf(`I${r}+K${r}`, FILL_FORMULA))
      setCell(ws, 13, r, cs('', {}, AC))
      itemRows.push(r)
      r++
    }

    // [소 계] 행
    const matSumF = `SUM(${itemRows.map(ir => `G${ir}`).join(',')})`
    const labSumF = `SUM(${itemRows.map(ir => `I${ir}`).join(',')})`
    const expSumF = `SUM(${itemRows.map(ir => `K${ir}`).join(',')})`

    for (let i = 0; i < 14; i++) setCell(ws, i, r, cs('', FILL_SUBTOT, AC, true))
    setCell(ws, 1, r, cs('[소  계]', FILL_SUBTOT, AC, true))
    setCell(ws, 5, r, cf(matSumF.replace(/G/g,'F'), FILL_SUBTOT))  // 재료비 단가 소계
    setCell(ws, 6, r, cf(matSumF, FILL_SUBTOT))
    setCell(ws, 7, r, cf(labSumF.replace(/I/g,'H'), FILL_SUBTOT))
    setCell(ws, 8, r, cf(labSumF, FILL_SUBTOT))
    setCell(ws, 9, r, cf(expSumF.replace(/K/g,'J'), FILL_SUBTOT))
    setCell(ws, 10, r, cf(expSumF, FILL_SUBTOT))
    setCell(ws, 11, r, cf(`F${r}+H${r}+J${r}`, FILL_SUBTOT))
    setCell(ws, 12, r, cf(`G${r}+I${r}+K${r}`, FILL_SUBTOT))
    tradeSubtotalRefs[trade] = r
    r++
    r++ // 공종 간 빈 줄
  })

  // [합 계] 행
  const subRows = Object.values(tradeSubtotalRefs)
  const makeSum = (col) => subRows.length > 0 ? `SUM(${subRows.map(sr=>`${col}${sr}`).join(',')})` : '0'

  for (let i = 0; i < 14; i++) setCell(ws, i, r, cs('', FILL_SUBTOT, AC, true))
  setCell(ws, 1, r, cs('[합  계]', FILL_SUBTOT, AC, true))
  setCell(ws, 5, r, cf(makeSum('F'), FILL_SUBTOT))
  setCell(ws, 6, r, cf(makeSum('G'), FILL_SUBTOT))
  setCell(ws, 7, r, cf(makeSum('H'), FILL_SUBTOT))
  setCell(ws, 8, r, cf(makeSum('I'), FILL_SUBTOT))
  setCell(ws, 9, r, cf(makeSum('J'), FILL_SUBTOT))
  setCell(ws, 10, r, cf(makeSum('K'), FILL_SUBTOT))
  setCell(ws, 11, r, cf(makeSum('L'), FILL_SUBTOT))
  setCell(ws, 12, r, cf(makeSum('M'), FILL_SUBTOT))

  ws['!cols'] = [
    {wch:12},{wch:26},{wch:20},{wch:5},{wch:6},
    {wch:10},{wch:10},{wch:10},{wch:10},
    {wch:10},{wch:10},{wch:10},{wch:10},{wch:16},
  ]
  return { ws, tradeSubtotalRefs }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 내보내기
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function exportToExcel(project, roomDataList, grandAggregate, grandTotal, globalItems) {
  try {
    // 공종별 재료비 집계
    const tradeMap = {}
    TRADE_ORDER.forEach(t => { tradeMap[t] = 0 })

    roomDataList.forEach(rd => {
      rd.surfaceData.forEach(({ items }) =>
        items.forEach(i => { const t = getTrade(i.name); tradeMap[t] = (tradeMap[t]||0) + i.cost })
      )
      rd.doorItems.forEach(d => { tradeMap['창호작업'] = (tradeMap['창호작업']||0) + d.cost })
    })
    ;(globalItems||[]).forEach(gi => {
      if (!gi.enabled || !gi.name) return
      const t = gi.trade || '기타'
      const mat = (gi.matUnitPrice||0)*(gi.qty||0)
      tradeMap[t] = (tradeMap[t]||0) + mat
    })

    const wb = XLSX.utils.book_new()

    const { ws: detailWs } = makeDetailSheet(roomDataList, globalItems)
    const summaryWs = makeSummarySheet(project, grandTotal)
    const tradeWs   = makeTradeSheet(tradeMap)

    XLSX.utils.book_append_sheet(wb, summaryWs, '내역서(요약)')
    XLSX.utils.book_append_sheet(wb, tradeWs,   '공종별집계')
    XLSX.utils.book_append_sheet(wb, detailWs,  '내역서(상세)')

    const siteName = project.siteName || '견적'
    const dateStr  = new Date().toISOString().slice(0,10).replace(/-/g,'')
    const filename  = `${siteName}_견적서_${dateStr}.xlsx`

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' })
    const buf   = new ArrayBuffer(wbout.length)
    const view  = new Uint8Array(buf)
    for (let i = 0; i < wbout.length; i++) view[i] = wbout.charCodeAt(i) & 0xFF

    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.style.display = 'none'
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 200)
  } catch (e) {
    console.error('엑셀 내보내기 오류:', e)
    alert('엑셀 내보내기 오류: ' + e.message)
  }
}
