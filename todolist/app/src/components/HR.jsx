import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'

// ── 상수 ─────────────────────────────────────────────────────────────
const EMPLOYEE_TYPES = ['정규직', '프리랜서', '일용직']
const POSITION_OPTIONS = ['대표', '이사', '소장', '팀장', '사원']
const LEAVE_TYPES = ['연차', '반차', '병가', '경조사', '기타']
const HR_TABS = ['인사관리', '급여명세서', '추가근무', '급여대장', '연차관리', '4대보험', '원천세']
const CONTRACT_TYPES = ['포괄연봉제', '일반']
const BONUS_TYPES = ['일반상여', '설날상여금', '추석상여금', '여름휴가비']
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ── 근무형태 프리셋 (노무사 급여셋팅 기준) ──────────────────────────────
const WORK_PRESETS = {
  '일반사무직': {
    contractType: '일반',
    workStartTime: '09:00', workEndTime: '18:00', breakHours: 1,
    workDaysOfWeek: [1, 2, 3, 4, 5],
    label: '09~18시 · 휴게1h · 월~금',
    baseHours: 209, overtimeHours: 0,
    desc: '소정 209h/월 (연장 별도)',
  },
  '포괄연봉제(본사)': {
    contractType: '포괄연봉제',
    workStartTime: '09:00', workEndTime: '18:00', breakHours: 1,
    workDaysOfWeek: [1, 2, 3, 4, 5],
    label: '09~18시 · 휴게1h · 월~금',
    baseHours: 209, overtimeHours: 32.5875,
    desc: '소정 209h + 포괄연장 32.6h = 241.6h/월',
  },
  '포괄연봉제(현장)': {
    contractType: '포괄연봉제',
    workStartTime: '07:00', workEndTime: '19:00', breakHours: 2,
    workDaysOfWeek: [1, 2, 3, 4, 5, 6],
    label: '07~19시 · 휴게2h · 월~토(격주)',
    baseHours: 209, overtimeHours: 61.95,
    desc: '소정 209h + 포괄연장 62.0h = 271.0h/월',
  },
}

function getPresetDesc(contractType, workPreset) {
  const preset = WORK_PRESETS[workPreset]
  if (preset) return preset.desc
  return ''
}

// ── 4대보험 요율 (localStorage 저장) ─────────────────────────────────
const RATES_KEY = 'jm_insurance_rates_v1'
const DEFAULT_RATES = {
  healthRate: 3.595,        // 건강보험 (%)
  longTermRate: 13.14,      // 장기요양 (건강보험료의 %)
  pensionRate: 4.75,        // 국민연금 (%)
  pensionCap: 6370000,      // 국민연금 상한 (원)
  employmentRate: 0.9,      // 고용보험 (%)
}
function loadRates() {
  try {
    const saved = localStorage.getItem(RATES_KEY)
    return saved ? { ...DEFAULT_RATES, ...JSON.parse(saved) } : { ...DEFAULT_RATES }
  } catch { return { ...DEFAULT_RATES } }
}
function saveRates(rates) {
  try { localStorage.setItem(RATES_KEY, JSON.stringify(rates)) } catch {}
}

// ── 소득세 간이세액표 (2024년, 부양가족 1인 기준) ─────────────────────
const TAX_TABLE = [
  [1060000, 0], [1500000, 10040], [2000000, 24600], [2500000, 49290],
  [3000000, 78430], [3500000, 117960], [4000000, 157400], [4500000, 211780],
  [5000000, 281560], [6000000, 437000], [7000000, 621000], [8000000, 805000],
  [10000000, 1261840],
]

function calcIncomeTax(monthlyTaxable) {
  if (monthlyTaxable <= 1060000) return 0
  for (let i = 0; i < TAX_TABLE.length - 1; i++) {
    const [low, lowTax] = TAX_TABLE[i]
    const [high, highTax] = TAX_TABLE[i + 1]
    if (monthlyTaxable <= high) {
      const ratio = (monthlyTaxable - low) / (high - low)
      return Math.round(lowTax + (highTax - lowTax) * ratio)
    }
  }
  const [last, lastTax] = TAX_TABLE[TAX_TABLE.length - 1]
  const [prev, prevTax] = TAX_TABLE[TAX_TABLE.length - 2]
  const rate = (lastTax - prevTax) / (last - prev)
  return Math.round(lastTax + (monthlyTaxable - last) * rate)
}

// ── 급여 자동 계산 ────────────────────────────────────────────────────
function calcPayroll(employee, form, rates) {
  const r = rates || loadRates()
  const type = employee?.employeeType
  const base = Number(form.baseSalary) || 0
  const overtime = Number(form.overtimePay) || 0
  const bonus = Number(form.bonus) || 0
  const meal = Number(form.mealAllowance) || 0
  const transport = Number(form.transportAllowance) || 0
  const days = Number(form.workDays) || 0
  const daily = Number(form.dailyWage) || 0

  // 일용직
  if (type === '일용직') {
    const gross = daily * days
    const dailyTax = daily > 150000 ? Math.round((daily - 150000) * 0.06 * 0.55) : 0
    const incomeTax = dailyTax * days
    const localIncomeTax = Math.round(incomeTax * 0.1)
    const employmentInsurance = Math.round(gross * 0.009)
    const totalDeduction = incomeTax + localIncomeTax + employmentInsurance
    return {
      gross, totalDeduction, netPay: gross - totalDeduction,
      nationalPension: 0, healthInsurance: 0, longTermCare: 0,
      employmentInsurance, incomeTax, localIncomeTax, withholdingTax: 0,
      programDeduction: 0, absentDeduction: 0,
      healthRetirementAdj: 0, longTermRetirementAdj: 0,
      yearEndTax: 0, yearEndLocalTax: 0,
    }
  }

  // 프리랜서 (3.3% 원천징수)
  if (type === '프리랜서') {
    const gross = base + overtime + bonus
    const withholdingTax = Math.round(gross * 0.033)
    return {
      gross, totalDeduction: withholdingTax, netPay: gross - withholdingTax,
      nationalPension: 0, healthInsurance: 0, longTermCare: 0,
      employmentInsurance: 0, incomeTax: 0, localIncomeTax: 0, withholdingTax,
      programDeduction: 0, absentDeduction: 0,
      healthRetirementAdj: 0, longTermRetirementAdj: 0,
      yearEndTax: 0, yearEndLocalTax: 0,
    }
  }

  // 정규직
  const extra = Number(form.extraPay) || 0
  const position = Number(form.positionAllowance) || 0
  const programDed = Number(form.programDeduction) || 0
  const absentDed = Number(form.absentDeduction) || 0
  const healthAdj = Number(form.healthRetirementAdj) || 0
  const longTermAdj = Number(form.longTermRetirementAdj) || 0
  const yearEndTax = Number(form.yearEndTax) || 0
  const yearEndLocal = Number(form.yearEndLocalTax) || 0

  const gross = base + overtime + extra + position + bonus + meal + transport
  const insBase = base + overtime + extra + position + bonus
  const mealNonTax = Math.min(meal, 200000)
  const transportNonTax = Math.min(transport, 200000)
  const nonTaxable = mealNonTax + transportNonTax
  const taxable = gross - nonTaxable

  // 건강보험·국민연금: 고지액 우선, 없으면 자동계산
  const billedPension = Number(form.billedNationalPension)
  const billedHealth = Number(form.billedHealthInsurance)
  const nationalPension = billedPension > 0 ? billedPension : Math.floor(Math.min(insBase, r.pensionCap) * (r.pensionRate / 100) / 10) * 10
  const healthInsurance = billedHealth > 0 ? billedHealth : Math.floor(insBase * (r.healthRate / 100) / 10) * 10
  const longTermCare = Math.floor(healthInsurance * (r.longTermRate / 100) / 10) * 10
  const employmentInsurance = Math.floor(insBase * (r.employmentRate / 100) / 10) * 10
  const incomeTax = calcIncomeTax(taxable)
  const localIncomeTax = Math.round(incomeTax * 0.1)

  const totalDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance
    + incomeTax + localIncomeTax
    + programDed + absentDed + healthAdj + longTermAdj + yearEndTax + yearEndLocal

  return {
    gross, totalDeduction, netPay: gross - totalDeduction,
    nationalPension, healthInsurance, longTermCare, employmentInsurance,
    incomeTax, localIncomeTax, withholdingTax: 0,
    programDeduction: programDed, absentDeduction: absentDed,
    healthRetirementAdj: healthAdj, longTermRetirementAdj: longTermAdj,
    yearEndTax, yearEndLocalTax: yearEndLocal,
  }
}

// ── 연차 계산 (근로기준법) ────────────────────────────────────────────
function calcAnnualLeave(hireDate, year) {
  if (!hireDate) return 0
  const hire = new Date(hireDate)
  const ref = new Date(year, 11, 31)
  const yearsWorked = (ref - hire) / (365.25 * 24 * 60 * 60 * 1000)
  if (yearsWorked < 0) return 0
  if (yearsWorked < 1) {
    return Math.min(Math.floor((ref - hire) / (30.44 * 24 * 60 * 60 * 1000)), 11)
  }
  return Math.min(15 + Math.floor((yearsWorked - 1) / 2), 25)
}

// ── 월 소정근로시간 계산 ─────────────────────────────────────────────
function calcMonthlyWorkHours(emp) {
  if (!emp || !emp.workStartTime || !emp.workEndTime) return 209
  const [sh, sm] = emp.workStartTime.split(':').map(Number)
  const [eh, em] = emp.workEndTime.split(':').map(Number)
  const dailyHours = (eh * 60 + em - sh * 60 - sm) / 60 - (Number(emp.breakHours) || 1)
  const workDayCount = (emp.workDaysOfWeek || [1, 2, 3, 4, 5]).length
  const weeklyHours = dailyHours * workDayCount
  const weeklyHoliday = Math.min(weeklyHours / 5, 8)
  return Math.round((weeklyHours + weeklyHoliday) * 365 / 7 / 12 * 10) / 10
}

// ── 추가근무 수당 계산 ───────────────────────────────────────────────
function calcOvertimeExtra(employee, record) {
  const hourly = Number(employee?.hourlyWage) || 0
  if (!hourly || !record) return 0
  const extra = Number(record.extraOvertimeHours) || 0
  const night = Number(record.nightHours) || 0
  const holiday = Number(record.holidayHours) || 0
  return Math.round(hourly * (extra * 1.5 + night * 0.5 + holiday * 1.5))
}

// ── 유틸 ─────────────────────────────────────────────────────────────
function won(n) { return (Number(n) || 0).toLocaleString('ko-KR') + '원' }
function fym(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${y}년 ${Number(m)}월`
}

// ── 급여명세서 팝업 출력 ──────────────────────────────────────────────
function printPayslip(employee, payroll, yearMonth) {
  const isFreelancer = employee.employeeType === '프리랜서'
  const isDaily = employee.employeeType === '일용직'
  const isComprehensivePrint = employee.contractType === '포괄연봉제'

  const payItems = isDaily
    ? [['일당 × ' + payroll.workDays + '일', payroll.gross]]
    : isFreelancer
      ? [['계약금액', payroll.baseSalary], ['상여금', payroll.bonus]].filter(([, v]) => v > 0)
      : [
          ['기본급', payroll.baseSalary],
          [payroll.overtimePay > 0 ? (isComprehensivePrint ? '포괄연장수당' : '연장근로수당') : '', payroll.overtimePay],
          ['연장추가수당', payroll.extraPay],
          ['직책수당', payroll.positionAllowance],
          [payroll.bonus > 0 ? (payroll.bonusType || '상여금') : '', payroll.bonus],
          ['식대 (비과세)', payroll.mealAllowance],
          ['차량유지비 (비과세)', payroll.transportAllowance],
        ].filter(([label, v]) => label && v > 0)

  const dedItems = isFreelancer
    ? [['원천징수 (3.3%)', payroll.withholdingTax]]
    : [
        ['국민연금 (4.75%)', payroll.nationalPension],
        ['건강보험 (3.595%)', payroll.healthInsurance],
        ['장기요양보험', payroll.longTermCare],
        ['고용보험 (0.9%)', payroll.employmentInsurance],
        ['소득세', payroll.incomeTax],
        ['지방소득세(주민세)', payroll.localIncomeTax],
        ['프로그램공제', payroll.programDeduction],
        ['조퇴공제', payroll.absentDeduction],
        ['건강보험 퇴직정산', payroll.healthRetirementAdj],
        ['장기요양 퇴직정산', payroll.longTermRetirementAdj],
        ['연말정산 소득세', payroll.yearEndTax],
        ['연말정산 지방소득세', payroll.yearEndLocalTax],
      ].filter(([, v]) => v !== 0 && v !== undefined && v !== null)

  const maxRows = Math.max(payItems.length, dedItems.length)
  const rows = Array.from({ length: maxRows }, (_, i) => {
    const p = payItems[i] || ['', '']
    const d = dedItems[i] || ['', '']
    return `<tr>
      <td>${p[0]}</td><td style="text-align:right">${p[1] !== '' ? won(p[1]) : ''}</td>
      <td>${d[0]}</td><td style="text-align:right">${d[1] !== '' ? won(d[1]) : ''}</td>
    </tr>`
  }).join('')

  const today = new Date()
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<title>급여명세서 - ${employee.name} ${fym(yearMonth)}</title>
<style>
  body { font-family: 'Malgun Gothic', AppleGothic, sans-serif; padding: 40px; max-width: 620px; margin: 0 auto; font-size: 13px; color: #222; }
  h1 { text-align: center; font-size: 24px; margin: 0 0 4px; letter-spacing: 6px; }
  .sub { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  td, th { border: 1px solid #ccc; padding: 7px 10px; }
  .hd { background: #f0f0f0; font-weight: bold; }
  th { background: #2E75B6; color: #fff; font-weight: bold; text-align: center; }
  .total { background: #e8f0fb; font-weight: bold; }
  .net { background: #1a3c6e; color: #fff; padding: 14px 20px; border-radius: 8px;
         display: flex; justify-content: space-between; align-items: center;
         font-size: 17px; font-weight: bold; margin-bottom: 16px; }
  .note { border: 1px solid #ddd; padding: 8px 12px; border-radius: 4px; color: #555; font-size: 12px; margin-bottom: 12px; }
  .sign { text-align: center; margin-top: 30px; color: #555; line-height: 1.8; }
  .disc { text-align: center; font-size: 11px; color: #aaa; margin-top: 8px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>급 여 명 세 서</h1>
<div class="sub">${fym(yearMonth)}</div>
<table>
  <tr><td class="hd">성명</td><td>${employee.name}</td><td class="hd">직책</td><td>${employee.position}</td></tr>
  <tr><td class="hd">고용형태</td><td>${employee.employeeType}</td><td class="hd">지급월</td><td>${fym(yearMonth)}</td></tr>
</table>
<table>
  <tr><th>지급 내역</th><th>금액</th><th>공제 내역</th><th>금액</th></tr>
  ${rows}
  <tr class="total">
    <td>지급 합계</td><td style="text-align:right">${won(payroll.gross)}</td>
    <td>공제 합계</td><td style="text-align:right">${won(payroll.totalDeduction)}</td>
  </tr>
</table>
<div class="net"><span>실 수 령 액</span><span>${won(payroll.netPay)}</span></div>
${payroll.memo ? `<div class="note">비고: ${payroll.memo}</div>` : ''}
<div class="sign">
  위와 같이 급여를 지급합니다.<br>
  ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일<br><br>
  회사명: _________________________ (인)
</div>
${!isFreelancer ? '<div class="disc">* 소득세는 국세청 간이세액표 기준 근사치입니다. 부양가족 수에 따라 달라질 수 있습니다.</div>' : ''}
<script>window.onload = function() { setTimeout(function(){ window.print(); }, 300); }</script>
</body></html>`

  const w = window.open('', '_blank', 'width=700,height=900,scrollbars=yes')
  w.document.write(html)
  w.document.close()
}

// ── 직원 등록/수정 모달 ───────────────────────────────────────────────
function EmployeeModal({ employee, onSave, onClose }) {
  const isEdit = !!employee?.id
  const [form, setForm] = useState({
    name: '', position: '', employeeType: '정규직',
    contractType: '포괄연봉제', workPreset: '본사',
    baseSalary: '', comprehensiveOvertimePay: '', hourlyWage: '',
    positionAllowance: '',
    mealAllowance: '', transportAllowance: '',
    seollalBonus: '', chuseokBonus: '', summerBonus: '',
    dailyWage: '',
    hireDate: '', phone: '', status: '재직', memo: '',
    workStartTime: '09:00', workEndTime: '18:00', breakHours: 1,
    workDaysOfWeek: [1, 2, 3, 4, 5],
    billedHealthInsurance: '', billedNationalPension: '',
    terminationDate: '', terminationReason: '',
    ...(employee || {}),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [showWageCalc, setShowWageCalc] = useState(false)

  const monthlyTotal = (Number(form.baseSalary) || 0) + (Number(form.comprehensiveOvertimePay) || 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return alert('이름을 입력하세요.')
    onSave({
      ...form,
      baseSalary: Number(form.baseSalary) || 0,
      comprehensiveOvertimePay: Number(form.comprehensiveOvertimePay) || 0,
      hourlyWage: Number(form.hourlyWage) || 0,
      positionAllowance: Number(form.positionAllowance) || 0,
      mealAllowance: Number(form.mealAllowance) || 0,
      transportAllowance: Number(form.transportAllowance) || 0,
      seollalBonus: Number(form.seollalBonus) || 0,
      chuseokBonus: Number(form.chuseokBonus) || 0,
      summerBonus: Number(form.summerBonus) || 0,
      dailyWage: Number(form.dailyWage) || 0,
      breakHours: Number(form.breakHours) || 1,
      workDaysOfWeek: form.workDaysOfWeek || [1, 2, 3, 4, 5],
      billedHealthInsurance: Number(form.billedHealthInsurance) || 0,
      billedNationalPension: Number(form.billedNationalPension) || 0,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{isEdit ? '직원 수정' : '직원 등록'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* 기본 정보 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">이름 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="직원 이름" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">고용형태</label>
              <select value={form.employeeType} onChange={e => set('employeeType', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                {EMPLOYEE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">직책</label>
              <select value={POSITION_OPTIONS.includes(form.position) ? form.position : '__custom'}
                onChange={e => set('position', e.target.value === '__custom' ? '' : e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                {POSITION_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__custom">직접입력</option>
              </select>
              {!POSITION_OPTIONS.includes(form.position) && (
                <input value={form.position} onChange={e => set('position', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 mt-1.5" placeholder="직책명 입력" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">입사일</label>
              <input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">재직상태</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                <option>재직</option><option>퇴직</option>
              </select>
            </div>
          </div>

          {/* 퇴직 정보 */}
          {form.status === '퇴직' && (
            <div className="bg-red-50 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-red-700">퇴직 정보</div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">퇴직일</label>
                <input type="date" value={form.terminationDate || ''} onChange={e => set('terminationDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-300 bg-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">퇴직사유</label>
                <input value={form.terminationReason || ''} onChange={e => set('terminationReason', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-300 bg-white" placeholder="자진퇴사, 계약만료 등" />
              </div>
              {form.hireDate && form.terminationDate && (() => {
                const hire = new Date(form.hireDate)
                const term = new Date(form.terminationDate)
                const diffMs = term - hire
                const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000))
                const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000))
                const eligible = diffMs >= 365 * 24 * 60 * 60 * 1000
                const avgSalary = (Number(form.baseSalary) || 0) + (Number(form.comprehensiveOvertimePay) || 0)
                const severance = eligible ? Math.round(avgSalary * (diffMs / (365.25 * 24 * 60 * 60 * 1000))) : 0
                return (
                  <div className="bg-white rounded-lg px-3 py-2 text-xs space-y-1 border border-red-100">
                    <div className="flex justify-between"><span className="text-gray-500">근속기간</span><span>{years}년 {months}개월</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">퇴직금 대상</span><span className={eligible ? 'text-green-600 font-medium' : 'text-red-500'}>{eligible ? '해당 (1년 이상)' : '미해당 (1년 미만)'}</span></div>
                    {eligible && <div className="flex justify-between font-semibold"><span className="text-gray-700">예상 퇴직금</span><span className="text-red-600">{won(severance)}</span></div>}
                    <div className="text-gray-400 mt-1">* 퇴직금 = 평균임금 × 근속연수 (근사치)</div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* 정규직 급여 설정 */}
          {form.employeeType === '정규직' && (
            <>
              {/* 근무형태 (계약형태 + 근무시간 통합) */}
              <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-indigo-700">근무형태</div>
                <div className="flex flex-col gap-1.5">
                  {Object.keys(WORK_PRESETS).map(key => {
                    const preset = WORK_PRESETS[key]
                    const sel = form.workPreset === key
                    return (
                      <button type="button" key={key}
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            workPreset: key,
                            contractType: preset.contractType,
                            workStartTime: preset.workStartTime,
                            workEndTime: preset.workEndTime,
                            breakHours: preset.breakHours,
                            workDaysOfWeek: preset.workDaysOfWeek,
                          }))
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${sel ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-indigo-200 text-gray-700 hover:bg-indigo-50'}`}>
                        <div className="text-sm font-medium">{key}</div>
                        <div className={`text-xs mt-0.5 ${sel ? 'text-indigo-100' : 'text-gray-400'}`}>{preset.label} · {preset.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 급여 구성 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-600">월 급여 구성</div>
                  <button type="button" onClick={() => setShowWageCalc(true)}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors">
                    임금 계산기
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">기본급 (원/월)</label>
                  <input type="number" value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                </div>
                {form.contractType === '포괄연봉제' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">포괄연장수당 (원/월)</label>
                      <input type="number" value={form.comprehensiveOvertimePay} onChange={e => set('comprehensiveOvertimePay', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">통상시급 (원) <span className="text-gray-400">— 노무사 제공 참고값</span></label>
                      <input type="number" value={form.hourlyWage} onChange={e => set('hourlyWage', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                    </div>
                  </>
                )}
                {monthlyTotal > 0 && (() => {
                  const allMonthly = monthlyTotal + (Number(form.positionAllowance) || 0) + (Number(form.mealAllowance) || 0) + (Number(form.transportAllowance) || 0)
                  return (
                    <div className="space-y-1.5">
                      <div className="bg-indigo-50 rounded-lg px-3 py-2 flex justify-between text-xs text-indigo-700 font-semibold">
                        <span>월 합계 (기본급+포괄연장수당)</span>
                        <span>{won(monthlyTotal)}</span>
                      </div>
                      <div className="bg-blue-100 rounded-lg px-3 py-2 flex justify-between text-xs text-blue-800 font-bold">
                        <span>연봉 (수당 포함 ×12)</span>
                        <span>{won(allMonthly * 12)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 직책수당 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-600">고정 수당</div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">직책수당 (원/월)</label>
                  <input type="number" value={form.positionAllowance || ''} onChange={e => set('positionAllowance', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                </div>
              </div>

              {/* 비과세 */}
              <div className="bg-green-50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-green-700">비과세 수당</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">식대 (원/월)</label>
                    <input type="number" value={form.mealAllowance} onChange={e => set('mealAllowance', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">교통비 (원/월)</label>
                    <input type="number" value={form.transportAllowance} onChange={e => set('transportAllowance', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                  </div>
                </div>
                <div className="text-[11px] text-green-600">각 20만원 한도 비과세 적용</div>
              </div>

              {/* 4대보험 고지액 */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-blue-700">4대보험 고지액 <span className="font-normal text-blue-400">(공단 고지서 기준)</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">건강보험 (원/월)</label>
                    <input type="number" value={form.billedHealthInsurance || ''} onChange={e => set('billedHealthInsurance', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="미입력시 자동계산" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">국민연금 (원/월)</label>
                    <input type="number" value={form.billedNationalPension || ''} onChange={e => set('billedNationalPension', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="미입력시 자동계산" />
                  </div>
                </div>
                <div className="text-[11px] text-blue-500">고지액 입력 시 해당 금액으로 공제, 미입력 시 요율 자동계산</div>
              </div>

              {/* 상여금 설정 */}
              <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-amber-700">상여금 설정 <span className="font-normal text-amber-500">(급여명세서 생성 시 자동 채워짐)</span></div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">설날상여금 (원)</label>
                  <input type="number" value={form.seollalBonus} onChange={e => set('seollalBonus', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">추석상여금 (원)</label>
                  <input type="number" value={form.chuseokBonus} onChange={e => set('chuseokBonus', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">여름휴가비 (원)</label>
                  <input type="number" value={form.summerBonus} onChange={e => set('summerBonus', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" placeholder="0" />
                </div>
              </div>
            </>
          )}

          {/* 일용직 */}
          {form.employeeType === '일용직' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">기본 일당 (원)</label>
              <input type="number" value={form.dailyWage} onChange={e => set('dailyWage', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="0" />
            </div>
          )}

          {/* 프리랜서 */}
          {form.employeeType === '프리랜서' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">기본 계약 단가 (원)</label>
              <input type="number" value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="0" />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">연락처</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">메모</label>
            <textarea value={form.memo} onChange={e => set('memo', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none" />
          </div>
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors">
            {isEdit ? '수정 완료' : '직원 등록'}
          </button>
        </form>
      </div>
      {showWageCalc && (
        <WageCalculatorModal
          initialBaseSalary={Number(form.baseSalary) || 0}
          initialOvertime={Number(form.comprehensiveOvertimePay) || 0}
          onApply={({ baseSalary, comprehensiveOvertimePay, hourlyWage }) => {
            setForm(f => ({ ...f, baseSalary, comprehensiveOvertimePay, hourlyWage }))
            setShowWageCalc(false)
          }}
          onClose={() => setShowWageCalc(false)}
        />
      )}
    </div>
  )
}

// ── 급여명세서 생성/수정 모달 ─────────────────────────────────────────
function PayrollModal({ employee, payroll, yearMonth, rates, overtimeRecord, onSave, onClose }) {
  const isEdit = !!payroll?.id
  const isFreelancer = employee?.employeeType === '프리랜서'
  const isDaily = employee?.employeeType === '일용직'
  const isComprehensive = employee?.contractType === '포괄연봉제'

  const [form, setForm] = useState({
    baseSalary: employee?.baseSalary || 0,
    overtimePay: isComprehensive ? (employee?.comprehensiveOvertimePay || 0) : 0,
    extraPay: overtimeRecord?.extraPay || 0,
    positionAllowance: employee?.positionAllowance || 0,
    bonus: 0, bonusType: '일반상여',
    mealAllowance: employee?.mealAllowance || 0,
    transportAllowance: employee?.transportAllowance || 0,
    billedHealthInsurance: employee?.billedHealthInsurance || 0,
    billedNationalPension: employee?.billedNationalPension || 0,
    programDeduction: 0, absentDeduction: 0,
    healthRetirementAdj: 0, longTermRetirementAdj: 0,
    yearEndTax: 0, yearEndLocalTax: 0,
    workDays: 0, dailyWage: employee?.dailyWage || 0,
    isPaid: false, paidDate: '', memo: '',
    ...(payroll || {}),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const calc = useMemo(() => calcPayroll(employee, form, rates), [employee, form, rates])

  function handleSubmit(e) {
    e.preventDefault()
    const data = {
      ...form, ...calc,
      employeeId: employee.id, yearMonth,
      baseSalary: Number(form.baseSalary) || 0,
      overtimePay: Number(form.overtimePay) || 0,
      extraPay: Number(form.extraPay) || 0,
      positionAllowance: Number(form.positionAllowance) || 0,
      bonus: Number(form.bonus) || 0,
      bonusType: form.bonusType || '일반상여',
      mealAllowance: Number(form.mealAllowance) || 0,
      transportAllowance: Number(form.transportAllowance) || 0,
      billedHealthInsurance: Number(form.billedHealthInsurance) || 0,
      billedNationalPension: Number(form.billedNationalPension) || 0,
      programDeduction: Number(form.programDeduction) || 0,
      absentDeduction: Number(form.absentDeduction) || 0,
      healthRetirementAdj: Number(form.healthRetirementAdj) || 0,
      longTermRetirementAdj: Number(form.longTermRetirementAdj) || 0,
      yearEndTax: Number(form.yearEndTax) || 0,
      yearEndLocalTax: Number(form.yearEndLocalTax) || 0,
      workDays: Number(form.workDays) || 0,
      dailyWage: Number(form.dailyWage) || 0,
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">{employee?.name} 급여명세서</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="text-xs text-gray-400">{fym(yearMonth)}</div>
              {isComprehensive && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">
                  포괄연봉제 {employee.annualSalary > 0 ? `연봉 ${won(employee.annualSalary)}` : ''}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* 지급 항목 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-blue-700 mb-3">지급 항목</div>
            {isDaily ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">일당 (원)</label>
                  <input type="number" value={form.dailyWage} onChange={e => set('dailyWage', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">근무일수</label>
                  <input type="number" value={form.workDays} onChange={e => set('workDays', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">{isFreelancer ? '계약금액' : '기본급'}</label>
                  <input type="number" value={form.baseSalary} onChange={e => set('baseSalary', e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                </div>
                {!isFreelancer && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">{isComprehensive ? '포괄연장수당' : '연장근로수당'}</label>
                      <input type="number" value={form.overtimePay} onChange={e => set('overtimePay', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">
                        연장추가수당
                        {overtimeRecord && overtimeRecord.extraPay > 0 && <span className="text-amber-500 ml-1">(추가근무 연동)</span>}
                      </label>
                      <input type="number" value={form.extraPay} onChange={e => set('extraPay', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">직책수당</label>
                      <input type="number" value={form.positionAllowance} onChange={e => set('positionAllowance', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">식대 <span className="text-green-500 font-medium">(비과세 20만↓)</span></label>
                      <input type="number" value={form.mealAllowance} onChange={e => set('mealAllowance', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-600">차량유지비 <span className="text-green-500 font-medium">(비과세 20만↓)</span></label>
                      <input type="number" value={form.transportAllowance} onChange={e => set('transportAllowance', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                    </div>
                  </>
                )}
                {/* 상여금 */}
                <div className="space-y-1.5 pt-1 border-t border-blue-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <label className="text-xs text-gray-600 shrink-0">상여금</label>
                      <select value={form.bonusType} onChange={e => {
                        const t = e.target.value
                        let preset = 0
                        if (t === '설날상여금') preset = employee?.seollalBonus || 0
                        else if (t === '추석상여금') preset = employee?.chuseokBonus || 0
                        else if (t === '여름휴가비') preset = employee?.summerBonus || 0
                        setForm(f => ({ ...f, bonusType: t, bonus: preset }))
                      }}
                        className="flex-1 border border-gray-200 rounded-lg px-1.5 py-1 text-xs outline-none focus:border-blue-400 bg-white text-gray-600">
                        {BONUS_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <input type="number" value={form.bonus} onChange={e => set('bonus', e.target.value)}
                      className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4대보험 고지액 조정 */}
          {!isFreelancer && !isDaily && (
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 mb-3">4대보험 고지액 <span className="font-normal text-blue-400">(0이면 요율 자동계산)</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">건강보험</label>
                  <input type="number" value={form.billedHealthInsurance} onChange={e => set('billedHealthInsurance', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">국민연금</label>
                  <input type="number" value={form.billedNationalPension} onChange={e => set('billedNationalPension', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400 bg-white" />
                </div>
              </div>
            </div>
          )}

          {/* 추가 공제 항목 */}
          {!isFreelancer && !isDaily && (
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-red-700 mb-3">추가 공제 <span className="font-normal text-red-400">(해당 월만 입력)</span></div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">프로그램공제</label>
                  <input type="number" value={form.programDeduction} onChange={e => set('programDeduction', e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-red-300 bg-white" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">조퇴공제</label>
                  <input type="number" value={form.absentDeduction} onChange={e => set('absentDeduction', e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-red-300 bg-white" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">건강보험 퇴직정산</label>
                  <input type="number" value={form.healthRetirementAdj} onChange={e => set('healthRetirementAdj', e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-red-300 bg-white" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-600">장기요양 퇴직정산</label>
                  <input type="number" value={form.longTermRetirementAdj} onChange={e => set('longTermRetirementAdj', e.target.value)}
                    className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-red-300 bg-white" />
                </div>
                <div className="border-t border-red-100 pt-2.5">
                  <div className="text-[11px] text-red-400 mb-2">연말정산 (환급이면 음수(-) 입력)</div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-600">연말정산 소득세</label>
                    <input type="number" value={form.yearEndTax} onChange={e => set('yearEndTax', e.target.value)}
                      className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-red-300 bg-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600">연말정산 지방소득세</label>
                    <input type="number" value={form.yearEndLocalTax} onChange={e => set('yearEndLocalTax', e.target.value)}
                      className="w-36 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-red-300 bg-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 자동 계산 결과 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-600 mb-2">자동 계산</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">총 지급액</span>
              <span className="font-medium">{won(calc.gross)}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
              <div className="text-xs text-gray-400 mb-1">공제 내역</div>
              {isFreelancer ? (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>원천징수세 (3.3%)</span><span>{won(calc.withholdingTax)}</span>
                </div>
              ) : (
                <>
                  {calc.nationalPension > 0 && <div className="flex justify-between text-xs text-gray-500"><span>국민연금 {Number(form.billedNationalPension) > 0 ? '(고지액)' : '(4.75%)'}</span><span>{won(calc.nationalPension)}</span></div>}
                  {calc.healthInsurance > 0 && <div className="flex justify-between text-xs text-gray-500"><span>건강보험 {Number(form.billedHealthInsurance) > 0 ? '(고지액)' : '(3.595%)'}</span><span>{won(calc.healthInsurance)}</span></div>}
                  {calc.longTermCare > 0 && <div className="flex justify-between text-xs text-gray-500"><span>장기요양보험</span><span>{won(calc.longTermCare)}</span></div>}
                  {calc.employmentInsurance > 0 && <div className="flex justify-between text-xs text-gray-500"><span>고용보험 (0.9%)</span><span>{won(calc.employmentInsurance)}</span></div>}
                  {calc.incomeTax > 0 && <div className="flex justify-between text-xs text-gray-500"><span>소득세</span><span>{won(calc.incomeTax)}</span></div>}
                  {calc.localIncomeTax > 0 && <div className="flex justify-between text-xs text-gray-500"><span>지방소득세(주민세)</span><span>{won(calc.localIncomeTax)}</span></div>}
                  {calc.programDeduction > 0 && <div className="flex justify-between text-xs text-gray-500"><span>프로그램공제</span><span>{won(calc.programDeduction)}</span></div>}
                  {calc.absentDeduction > 0 && <div className="flex justify-between text-xs text-gray-500"><span>조퇴공제</span><span>{won(calc.absentDeduction)}</span></div>}
                  {calc.healthRetirementAdj > 0 && <div className="flex justify-between text-xs text-gray-500"><span>건강보험 퇴직정산</span><span>{won(calc.healthRetirementAdj)}</span></div>}
                  {calc.longTermRetirementAdj > 0 && <div className="flex justify-between text-xs text-gray-500"><span>장기요양 퇴직정산</span><span>{won(calc.longTermRetirementAdj)}</span></div>}
                  {calc.yearEndTax !== 0 && <div className={`flex justify-between text-xs ${calc.yearEndTax < 0 ? 'text-blue-500' : 'text-gray-500'}`}><span>연말정산 소득세{calc.yearEndTax < 0 ? ' (환급)' : ''}</span><span>{calc.yearEndTax < 0 ? '-' : ''}{won(Math.abs(calc.yearEndTax))}</span></div>}
                  {calc.yearEndLocalTax !== 0 && <div className={`flex justify-between text-xs ${calc.yearEndLocalTax < 0 ? 'text-blue-500' : 'text-gray-500'}`}><span>연말정산 지방소득세{calc.yearEndLocalTax < 0 ? ' (환급)' : ''}</span><span>{calc.yearEndLocalTax < 0 ? '-' : ''}{won(Math.abs(calc.yearEndLocalTax))}</span></div>}
                </>
              )}
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
              <span>총 공제액</span><span className="text-red-500">{won(calc.totalDeduction)}</span>
            </div>
            <div className="bg-blue-500 rounded-xl px-4 py-2.5 flex justify-between text-white font-bold">
              <span>실수령액</span><span>{won(calc.netPay)}</span>
            </div>
          </div>

          {/* 지급 여부 */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPaid} onChange={e => set('isPaid', e.target.checked)} className="w-4 h-4 accent-blue-500" />
              <span className="text-sm text-gray-700">지급 완료</span>
            </label>
            {form.isPaid && (
              <input type="date" value={form.paidDate} onChange={e => set('paidDate', e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">메모</label>
            <textarea value={form.memo} onChange={e => set('memo', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button"
              onClick={() => printPayslip(employee, { ...form, ...calc }, yearMonth)}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm">
              출력
            </button>
            <button type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {isEdit ? '수정 저장' : '저장'}
            </button>
          </div>
          {!isFreelancer && (
            <p className="text-[11px] text-gray-400 text-center">
              * 소득세는 간이세액표 근사치입니다. 부양가족 수에 따라 실제와 다를 수 있습니다.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ── 임금 계산기 모달 ──────────────────────────────────────────────────
function WageCalculatorModal({ initialBaseSalary, initialOvertime, onApply, onClose }) {
  const [mode, setMode] = useState('calc')
  const [form, setForm] = useState({
    minWage: 10320, weeklyHours: 40, weeklyOvertime: 12,
    targetHourly: 10320, basicSalary: initialBaseSalary || 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const weeklyHoliday = Math.min(form.weeklyHours / 5, 8)
  const monthlyBaseHours = Math.round((form.weeklyHours + weeklyHoliday) * 365 / 7 / 12 * 10) / 10
  const monthlyOvertimeHours = Math.round(form.weeklyOvertime * 365 / 7 / 12 * 10) / 10
  const weeklyTotal = Number(form.weeklyHours) + Number(form.weeklyOvertime)
  const isOverLimit = weeklyTotal > 52

  let calc = {}
  if (mode === 'calc') {
    const hourly = Number(form.targetHourly) || 0
    const basic = Math.round(hourly * monthlyBaseHours)
    const overtime = form.weeklyOvertime > 0 ? Math.round(hourly * monthlyOvertimeHours * 1.5) : 0
    const totalMonthly = basic + overtime
    const annualSalary = totalMonthly * 12
    const isLegal = hourly >= Number(form.minWage)
    const shortfall = isLegal ? 0 : Math.ceil((Number(form.minWage) - hourly) * monthlyBaseHours)
    calc = { hourly, basic, overtime, totalMonthly, annualSalary, isLegal, shortfall }
  } else {
    const basic = Number(form.basicSalary) || 0
    const hourly = monthlyBaseHours > 0 ? basic / monthlyBaseHours : 0
    const overtime = form.weeklyOvertime > 0 ? Math.round(hourly * monthlyOvertimeHours * 1.5) : 0
    const totalMonthly = basic + overtime
    const annualSalary = totalMonthly * 12
    const isLegal = hourly >= Number(form.minWage)
    const minBasic = Math.round(Number(form.minWage) * monthlyBaseHours)
    const shortfall = isLegal ? 0 : minBasic - basic
    calc = { hourly, basic, overtime, totalMonthly, annualSalary, isLegal, minBasic, shortfall }
  }

  const numFmt = (n) => (Math.round(n) || 0).toLocaleString('ko-KR')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-[60] sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">임금 계산기</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">법정 기준 내 임금 계산 및 최저임금 검증</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setMode('calc')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${mode === 'calc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>시급 → 월급 계산</button>
            <button onClick={() => setMode('verify')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${mode === 'verify' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>월급 → 시급 검증</button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-700">근로시간 설정</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">주 소정근로시간 (h)</label>
                <input type="number" value={form.weeklyHours} onChange={e => set('weeklyHours', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">주 포괄연장시간 (h)</label>
                <input type="number" value={form.weeklyOvertime} onChange={e => set('weeklyOvertime', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                <div className="text-gray-400">월 통상근로시간</div>
                <div className="font-semibold text-gray-700">{monthlyBaseHours.toFixed(1)}h</div>
                <div className="text-gray-400 text-[10px]">(주휴 {weeklyHoliday}h 포함)</div>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                <div className="text-gray-400">월 연장근로시간</div>
                <div className="font-semibold text-gray-700">{monthlyOvertimeHours.toFixed(1)}h</div>
                <div className="text-gray-400 text-[10px]">(가산율 1.5배)</div>
              </div>
            </div>
            {isOverLimit && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
                ⚠ 주 소정({form.weeklyHours}h) + 연장({form.weeklyOvertime}h) = {weeklyTotal}h — 주 52시간 초과
              </div>
            )}
            {!isOverLimit && weeklyTotal > 0 && (
              <div className="text-[11px] text-gray-400 text-right">주 총 근로: {weeklyTotal}h / 52h</div>
            )}
          </div>
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-blue-700">{mode === 'calc' ? '통상시급 설정' : '기본급 입력'}</div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">최저시급 기준 (원)</label>
              <input type="number" value={form.minWage} onChange={e => set('minWage', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
              <div className="text-[11px] text-blue-400 mt-1">2026년 10,320원 / 매년 변경 시 수정</div>
            </div>
            {mode === 'calc' ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">목표 통상시급 (원)</label>
                <input type="number" value={form.targetHourly} onChange={e => set('targetHourly', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">기본급 (원/월)</label>
                <input type="number" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
              </div>
            )}
          </div>
          <div className={`rounded-xl p-4 space-y-2 border ${calc.isLegal ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-gray-700">계산 결과</div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${calc.isLegal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {calc.isLegal ? '✓ 최저임금 충족' : '✗ 최저임금 미달'}
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">통상시급</span><span className="font-semibold">{numFmt(Math.round(calc.hourly))}원/h</span></div>
              <div className="flex justify-between"><span className="text-gray-500">기본급 (월)</span><span className="font-semibold">{numFmt(calc.basic)}원</span></div>
              {form.weeklyOvertime > 0 && <div className="flex justify-between"><span className="text-gray-500">포괄연장수당 (월, ×1.5)</span><span className="font-semibold">{numFmt(calc.overtime)}원</span></div>}
              <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold"><span className="text-gray-700">월 합계</span><span className="text-blue-600">{numFmt(calc.totalMonthly)}원</span></div>
              <div className="flex justify-between text-gray-400"><span>연봉 환산 (×12)</span><span>{numFmt(calc.annualSalary)}원</span></div>
            </div>
            {!calc.isLegal && calc.shortfall > 0 && (
              <div className="bg-red-100 rounded-lg px-3 py-2 text-xs text-red-700 mt-2">최저임금 충족을 위해 기본급을 {numFmt(calc.shortfall)}원 이상 인상 필요</div>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] text-gray-500 space-y-1">
            <div className="font-semibold text-gray-600 mb-1">계산 기준 (근로기준법)</div>
            <div>• 월 통상근로시간 = (주 소정 + 주휴) × 365/7/12</div>
            <div>• 주휴시간 = 주 소정시간÷5 (최대 8시간)</div>
            <div>• 연장가산 = 통상시급 × 1.5배 (50% 가산)</div>
            <div>• 연장근로 한도 = 주 12시간 (주 52시간제)</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 py-3 rounded-xl text-sm transition-colors">닫기</button>
            <button onClick={() => onApply({ baseSalary: calc.basic, comprehensiveOvertimePay: calc.overtime, hourlyWage: Math.round(calc.hourly) })}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors">직원 등록에 적용</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 4대보험 요율 설정 모달 ────────────────────────────────────────────
function RatesModal({ rates, onSave, onClose }) {
  const [form, setForm] = useState({ ...rates })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    const parsed = {
      healthRate: Number(form.healthRate) || DEFAULT_RATES.healthRate,
      longTermRate: Number(form.longTermRate) || DEFAULT_RATES.longTermRate,
      pensionRate: Number(form.pensionRate) || DEFAULT_RATES.pensionRate,
      pensionCap: Number(form.pensionCap) || DEFAULT_RATES.pensionCap,
      employmentRate: Number(form.employmentRate) || DEFAULT_RATES.employmentRate,
    }
    saveRates(parsed)
    onSave(parsed)
  }

  function handleReset() {
    if (!confirm('기본값으로 초기화할까요?')) return
    saveRates(DEFAULT_RATES)
    onSave({ ...DEFAULT_RATES })
  }

  const row = (label, key, unit = '%', hint = '') => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="text-xs text-gray-700">{label}</div>
        {hint && <div className="text-[11px] text-gray-400">{hint}</div>}
      </div>
      <div className="flex items-center gap-1">
        <input type="number" step="0.001" value={form[key]} onChange={e => set(key, e.target.value)}
          className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-blue-400" />
        <span className="text-xs text-gray-400 w-4">{unit}</span>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">4대보험 요율 설정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-blue-700 mb-1">건강보험 · 장기요양</div>
            {row('건강보험 (근로자 부담)', 'healthRate', '%', '총요율÷2, 예) 7.19%÷2 = 3.595%')}
            {row('장기요양 (건강보험료의)', 'longTermRate', '%', '건강보험료에 곱하는 비율')}
          </div>
          <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-indigo-700 mb-1">국민연금</div>
            {row('국민연금 (근로자 부담)', 'pensionRate', '%', '총요율÷2, 공식 4.5%')}
            {row('기준소득월액 상한', 'pensionCap', '원', '이 금액 초과분은 연금 미적용')}
          </div>
          <div className="bg-green-50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-green-700 mb-1">고용보험</div>
            {row('고용보험 (근로자 부담)', 'employmentRate', '%', '공식 0.9%')}
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] text-gray-500 space-y-0.5">
            <div>• 현재 설정: 노무사 파일 기준</div>
            <div>• 건강보험 3.595% / 장기요양 13.14% / 국민연금 4.75%</div>
            <div>• 공식 요율: 건강 3.545% / 장기 12.95% / 연금 4.5%</div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 py-2.5 rounded-xl text-sm transition-colors">기본값으로</button>
            <button onClick={handleSave} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 연차 추가 모달 ────────────────────────────────────────────────────
function LeaveAddModal({ employees, onSave, onClose }) {
  const [form, setForm] = useState({
    employeeId: employees[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    days: 1, type: '연차', reason: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.employeeId) return alert('직원을 선택하세요.')
    onSave({ ...form, id: Date.now().toString(), days: Number(form.days) })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">연차 기록 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">직원</label>
            <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">날짜</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">구분</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">사용 일수</label>
            <div className="flex gap-2">
              {[0.5, 1, 2, 3].map(d => (
                <button type="button" key={d} onClick={() => set('days', d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.days === d ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {d}일
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">사유 (선택)</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" placeholder="사유 입력" />
          </div>
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors">기록 추가</button>
        </form>
      </div>
    </div>
  )
}

// ── 연차 관리 섹션 ────────────────────────────────────────────────────
function LeaveSection({ employees, leaveRecords, addLeaveRecord, deleteLeaveRecord }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [showAdd, setShowAdd] = useState(false)
  const eligible = employees.filter(e => e.status === '재직' && e.employeeType !== '프리랜서')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8249;</button>
        <span className="font-semibold text-gray-800 w-16 text-center">{year}년</span>
        <button onClick={() => setYear(y => y + 1)} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8250;</button>
        <button onClick={() => setShowAdd(true)} className="ml-auto bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">+ 연차 기록</button>
      </div>
      {eligible.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm"><div className="text-3xl mb-2">📅</div>재직 중인 직원이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {eligible.map(emp => {
            const total = calcAnnualLeave(emp.hireDate, year)
            const records = leaveRecords.filter(r => r.employeeId === emp.id && r.date?.startsWith(String(year)))
            const used = records.reduce((s, r) => s + (r.days || 0), 0)
            const remaining = total - used
            const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
            return (
              <div key={emp.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-800">{emp.name}</div>
                    <div className="text-xs text-gray-400">{emp.position} · 입사 {emp.hireDate || '미설정'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-blue-600">{remaining}일 잔여</div>
                    <div className="text-xs text-gray-400">{used} / {total}일 사용</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-blue-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                {records.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {records.map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-400 shrink-0">{r.date}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium shrink-0 ${r.type === '연차' ? 'bg-blue-100 text-blue-600' : r.type === '반차' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>{r.type} {r.days}일</span>
                        <span className="flex-1 text-gray-400 truncate">{r.reason}</span>
                        <button onClick={() => { if (confirm('이 연차 기록을 삭제할까요?')) deleteLeaveRecord(r.id) }} className="text-red-300 hover:text-red-500 shrink-0 text-base leading-none">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {showAdd && <LeaveAddModal employees={eligible} onSave={record => { addLeaveRecord(record); setShowAdd(false) }} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── 추가근무 관리 ─────────────────────────────────────────────────────
function OvertimeView({ employees, overtimeRecords, yearMonth, prevMonth, nextMonth, upsertOvertimeRecord }) {
  const activeEmps = employees.filter(e => e.status === '재직' && e.employeeType === '정규직')
  const [editingId, setEditingId] = useState(null)
  const [forms, setForms] = useState({})

  function getForm(empId) {
    if (forms[empId]) return forms[empId]
    const rec = overtimeRecords.find(r => r.employeeId === empId && r.yearMonth === yearMonth)
    return rec ? { extraOvertimeHours: rec.extraOvertimeHours || 0, nightHours: rec.nightHours || 0, holidayHours: rec.holidayHours || 0, note: rec.note || '' }
               : { extraOvertimeHours: 0, nightHours: 0, holidayHours: 0, note: '' }
  }

  function setFormField(empId, k, v) {
    setForms(f => ({ ...f, [empId]: { ...getForm(empId), [k]: v } }))
  }

  function handleSave(emp) {
    const f = getForm(emp.id)
    upsertOvertimeRecord({
      employeeId: emp.id, yearMonth,
      extraOvertimeHours: Number(f.extraOvertimeHours) || 0,
      nightHours: Number(f.nightHours) || 0,
      holidayHours: Number(f.holidayHours) || 0,
      note: f.note || '',
      extraPay: calcOvertimeExtra(emp, f),
    })
    setEditingId(null)
    setForms(f2 => { const n = { ...f2 }; delete n[emp.id]; return n })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8249;</button>
        <span className="font-semibold text-gray-800 w-28 text-center">{fym(yearMonth)}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8250;</button>
      </div>
      <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-0.5">
        <div className="font-semibold mb-1">추가근무 수당 계산 기준</div>
        <div>• 추가연장 = 통상시급 × 시간 × 1.5 (50% 가산 포함)</div>
        <div>• 야간근로 (22:00~06:00) = 통상시급 × 시간 × 0.5</div>
        <div>• 휴일근로 = 통상시급 × 시간 × 1.5</div>
        <div>• 포괄연봉제 직원은 포괄시간 초과분만 입력</div>
      </div>
      {activeEmps.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">정규직 재직 중인 직원이 없습니다.</div>
      ) : (
        activeEmps.map(emp => {
          const rec = overtimeRecords.find(r => r.employeeId === emp.id && r.yearMonth === yearMonth)
          const isEditing = editingId === emp.id
          const f = getForm(emp.id)
          const extraPay = calcOvertimeExtra(emp, f)
          const hasData = rec && ((rec.extraOvertimeHours || 0) > 0 || (rec.nightHours || 0) > 0 || (rec.holidayHours || 0) > 0)

          return (
            <div key={emp.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-800">{emp.name}</div>
                  <div className="text-xs text-gray-400">
                    {emp.position} · 통상시급 {emp.hourlyWage ? won(emp.hourlyWage) : '미설정'}
                    {emp.contractType === '포괄연봉제' && emp.comprehensiveOvertimePay > 0 && (
                      <span className="ml-1.5 text-indigo-500">포괄연장 {won(emp.comprehensiveOvertimePay)}/월</span>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <button onClick={() => setEditingId(emp.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${hasData ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {hasData ? '수정' : '+ 입력'}
                  </button>
                )}
              </div>

              {!isEditing && hasData && (
                <div className="space-y-1.5 text-xs">
                  {rec.extraOvertimeHours > 0 && <div className="flex justify-between text-gray-600"><span>추가연장</span><span>{rec.extraOvertimeHours}h</span></div>}
                  {rec.nightHours > 0 && <div className="flex justify-between text-gray-600"><span>야간</span><span>{rec.nightHours}h</span></div>}
                  {rec.holidayHours > 0 && <div className="flex justify-between text-gray-600"><span>휴일</span><span>{rec.holidayHours}h</span></div>}
                  <div className="flex justify-between font-semibold text-amber-700 border-t border-amber-100 pt-1.5"><span>추가수당 합계</span><span>{won(rec.extraPay || 0)}</span></div>
                  {rec.note && <div className="text-gray-400">{rec.note}</div>}
                </div>
              )}

              {isEditing && (
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">추가연장(h)</label>
                      <input type="number" step="0.5" value={f.extraOvertimeHours} onChange={e => setFormField(emp.id, 'extraOvertimeHours', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">야간(h)</label>
                      <input type="number" step="0.5" value={f.nightHours} onChange={e => setFormField(emp.id, 'nightHours', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">휴일(h)</label>
                      <input type="number" step="0.5" value={f.holidayHours} onChange={e => setFormField(emp.id, 'holidayHours', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-amber-400" />
                    </div>
                  </div>
                  <input value={f.note} onChange={e => setFormField(emp.id, 'note', e.target.value)} placeholder="메모 (선택)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-amber-400" />
                  {emp.hourlyWage > 0 && (
                    <div className="bg-amber-50 rounded-lg px-3 py-2 flex justify-between text-sm font-semibold text-amber-700">
                      <span>계산된 추가수당</span><span>{won(extraPay)}</span>
                    </div>
                  )}
                  {!emp.hourlyWage && <div className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-500">통상시급이 미설정입니다. 인사관리에서 직원 수정 후 입력하세요.</div>}
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(null); setForms(f2 => { const n = { ...f2 }; delete n[emp.id]; return n }) }}
                      className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm hover:bg-gray-50">취소</button>
                    <button onClick={() => handleSave(emp)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-xl text-sm transition-colors">저장</button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ── 급여대장 ──────────────────────────────────────────────────────────
function PayrollLedgerView({ employees, payroll, yearMonth, prevMonth, nextMonth }) {
  const monthData = payroll.filter(p => p.yearMonth === yearMonth)
  const sum = (key) => monthData.reduce((acc, p) => acc + (p[key] || 0), 0)

  function exportCSV() {
    const headers = ['성명', '직책', '고용형태', '기본급', '연장수당', '추가수당', '직책수당', '식대', '교통비', '상여', '총지급액', '국민연금', '건강보험', '장기요양', '고용보험', '소득세', '지방세', '기타공제', '총공제액', '실수령액', '지급여부']
    const rows = monthData.map(p => {
      const emp = employees.find(e => e.id === p.employeeId)
      const otherDed = (p.programDeduction || 0) + (p.absentDeduction || 0) + (p.healthRetirementAdj || 0) + (p.longTermRetirementAdj || 0) + (p.yearEndTax || 0) + (p.yearEndLocalTax || 0)
      return [emp?.name || '', emp?.position || '', emp?.employeeType || '', p.baseSalary || 0, p.overtimePay || 0, p.extraPay || 0, p.positionAllowance || 0, p.mealAllowance || 0, p.transportAllowance || 0, p.bonus || 0, p.gross || 0, p.nationalPension || 0, p.healthInsurance || 0, p.longTermCare || 0, p.employmentInsurance || 0, p.incomeTax || 0, p.localIncomeTax || 0, otherDed, p.totalDeduction || 0, p.netPay || 0, p.isPaid ? '완료' : '미지급'].join(',')
    })
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `급여대장_${yearMonth}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8249;</button>
        <span className="font-semibold text-gray-800 w-28 text-center">{fym(yearMonth)}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8250;</button>
        {monthData.length > 0 && (
          <button onClick={exportCSV} className="ml-auto text-xs border border-green-200 text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">CSV 내보내기</button>
        )}
      </div>

      {monthData.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm"><div className="text-3xl mb-2">📋</div>이 달 급여 명세서가 없습니다.<br />급여명세서 탭에서 먼저 생성하세요.</div>
      ) : (
        <div className="space-y-3">
          {monthData.map(p => {
            const emp = employees.find(e => e.id === p.employeeId)
            if (!emp) return null
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div><div className="font-medium text-gray-800">{emp.name}</div><div className="text-xs text-gray-400">{emp.position} · {emp.employeeType}</div></div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isPaid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{p.isPaid ? '지급완료' : '미지급'}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="col-span-2 text-gray-400 font-medium mb-0.5">지급</div>
                  {p.baseSalary > 0 && <div className="flex justify-between"><span className="text-gray-500">기본급</span><span>{won(p.baseSalary)}</span></div>}
                  {p.overtimePay > 0 && <div className="flex justify-between"><span className="text-gray-500">연장수당</span><span>{won(p.overtimePay)}</span></div>}
                  {p.extraPay > 0 && <div className="flex justify-between"><span className="text-gray-500">추가연장</span><span>{won(p.extraPay)}</span></div>}
                  {p.positionAllowance > 0 && <div className="flex justify-between"><span className="text-gray-500">직책수당</span><span>{won(p.positionAllowance)}</span></div>}
                  {(p.mealAllowance || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">식대</span><span>{won(p.mealAllowance)}</span></div>}
                  {(p.transportAllowance || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">교통비</span><span>{won(p.transportAllowance)}</span></div>}
                  {p.bonus > 0 && <div className="flex justify-between"><span className="text-gray-500">{p.bonusType || '상여'}</span><span>{won(p.bonus)}</span></div>}
                  <div className="col-span-2 border-t border-dashed border-gray-100 my-1" />
                  <div className="col-span-2 text-gray-400 font-medium mb-0.5">공제</div>
                  {p.nationalPension > 0 && <div className="flex justify-between"><span className="text-gray-500">국민연금</span><span className="text-red-400">{won(p.nationalPension)}</span></div>}
                  {p.healthInsurance > 0 && <div className="flex justify-between"><span className="text-gray-500">건강보험</span><span className="text-red-400">{won(p.healthInsurance)}</span></div>}
                  {p.longTermCare > 0 && <div className="flex justify-between"><span className="text-gray-500">장기요양</span><span className="text-red-400">{won(p.longTermCare)}</span></div>}
                  {p.employmentInsurance > 0 && <div className="flex justify-between"><span className="text-gray-500">고용보험</span><span className="text-red-400">{won(p.employmentInsurance)}</span></div>}
                  {p.incomeTax > 0 && <div className="flex justify-between"><span className="text-gray-500">소득세</span><span className="text-red-400">{won(p.incomeTax)}</span></div>}
                  {p.localIncomeTax > 0 && <div className="flex justify-between"><span className="text-gray-500">지방소득세</span><span className="text-red-400">{won(p.localIncomeTax)}</span></div>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-xs text-gray-400">총지급 {won(p.gross)} / 총공제 {won(p.totalDeduction)}</div>
                  <div className="font-bold text-blue-600">{won(p.netPay)}</div>
                </div>
              </div>
            )
          })}

          <div className="bg-gray-800 rounded-2xl p-4 text-white">
            <div className="text-sm font-semibold mb-3">{fym(yearMonth)} 급여 합계</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-300">총 지급액</span><span className="font-medium">{won(sum('gross'))}</span></div>
              <div className="flex justify-between"><span className="text-gray-300">4대보험 합계</span><span>{won(sum('nationalPension') + sum('healthInsurance') + sum('longTermCare') + sum('employmentInsurance'))}</span></div>
              <div className="flex justify-between"><span className="text-gray-300">소득세+지방세</span><span>{won(sum('incomeTax') + sum('localIncomeTax'))}</span></div>
              <div className="flex justify-between border-t border-gray-600 pt-1.5"><span className="text-gray-300">총 공제액</span><span className="font-medium">{won(sum('totalDeduction'))}</span></div>
              <div className="flex justify-between text-base font-bold border-t border-gray-500 pt-2"><span>총 실수령액</span><span className="text-blue-300">{won(sum('netPay'))}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 4대보험 현황 ──────────────────────────────────────────────────────
function InsuranceView({ employees, payroll, yearMonth, prevMonth, nextMonth, rates }) {
  const monthData = payroll.filter(p => p.yearMonth === yearMonth)

  const companyPensionRate = 4.5
  const companyHealthRate = 3.545
  const companyLongTermRate = 12.95
  const companyEmploymentRate = 1.15

  function calcCompany(p) {
    const emp = employees.find(e => e.id === p.employeeId)
    if (!emp || emp.employeeType !== '정규직') return { pension: 0, health: 0, longTerm: 0, employment: 0 }
    const base = (p.baseSalary || 0) + (p.overtimePay || 0) + (p.extraPay || 0) + (p.positionAllowance || 0) + (p.bonus || 0)
    const pension = Math.floor(Math.min(base, (rates?.pensionCap || 6370000)) * (companyPensionRate / 100) / 10) * 10
    const health = Math.floor(base * (companyHealthRate / 100) / 10) * 10
    const longTerm = Math.floor(health * (companyLongTermRate / 100) / 10) * 10
    const employment = Math.floor(base * (companyEmploymentRate / 100) / 10) * 10
    return { pension, health, longTerm, employment }
  }

  const totalEmployee = {
    pension: monthData.reduce((s, p) => s + (p.nationalPension || 0), 0),
    health: monthData.reduce((s, p) => s + (p.healthInsurance || 0), 0),
    longTerm: monthData.reduce((s, p) => s + (p.longTermCare || 0), 0),
    employment: monthData.reduce((s, p) => s + (p.employmentInsurance || 0), 0),
  }
  const companyItems = monthData.map(p => calcCompany(p))
  const totalCompany = {
    pension: companyItems.reduce((s, c) => s + c.pension, 0),
    health: companyItems.reduce((s, c) => s + c.health, 0),
    longTerm: companyItems.reduce((s, c) => s + c.longTerm, 0),
    employment: companyItems.reduce((s, c) => s + c.employment, 0),
  }
  const empTotal = Object.values(totalEmployee).reduce((a, b) => a + b, 0)
  const compTotal = Object.values(totalCompany).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8249;</button>
        <span className="font-semibold text-gray-800 w-28 text-center">{fym(yearMonth)}</span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8250;</button>
      </div>

      {monthData.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">이 달 급여 명세서가 없습니다.</div>
      ) : (
        <>
          {monthData.map((p, idx) => {
            const emp = employees.find(e => e.id === p.employeeId)
            if (!emp) return null
            const comp = companyItems[idx]
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="font-medium text-gray-800 mb-3">{emp.name} <span className="text-xs font-normal text-gray-400">{emp.position}</span></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
                    <div className="font-semibold text-blue-700 mb-1">근로자 부담</div>
                    <div className="flex justify-between"><span className="text-gray-500">국민연금</span><span>{won(p.nationalPension || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">건강보험</span><span>{won(p.healthInsurance || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">장기요양</span><span>{won(p.longTermCare || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">고용보험</span><span>{won(p.employmentInsurance || 0)}</span></div>
                    <div className="flex justify-between font-semibold border-t border-blue-100 pt-1"><span>합계</span><span className="text-blue-700">{won((p.nationalPension || 0) + (p.healthInsurance || 0) + (p.longTermCare || 0) + (p.employmentInsurance || 0))}</span></div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 space-y-1.5">
                    <div className="font-semibold text-orange-700 mb-1">사업주 부담</div>
                    <div className="flex justify-between"><span className="text-gray-500">국민연금</span><span>{won(comp.pension)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">건강보험</span><span>{won(comp.health)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">장기요양</span><span>{won(comp.longTerm)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">고용보험</span><span>{won(comp.employment)}</span></div>
                    <div className="flex justify-between font-semibold border-t border-orange-100 pt-1"><span>합계</span><span className="text-orange-700">{won(comp.pension + comp.health + comp.longTerm + comp.employment)}</span></div>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="text-xs font-semibold text-gray-600 mb-3">월 4대보험 납부 합계</div>
            <div className="space-y-2 text-xs">
              {[['국민연금', totalEmployee.pension, totalCompany.pension],
                ['건강보험', totalEmployee.health, totalCompany.health],
                ['장기요양', totalEmployee.longTerm, totalCompany.longTerm],
                ['고용보험', totalEmployee.employment, totalCompany.employment],
              ].map(([label, emp, comp]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-16 text-gray-500">{label}</span>
                  <span className="flex-1 text-right text-blue-600">{won(emp)}</span>
                  <span className="text-gray-300">+</span>
                  <span className="flex-1 text-right text-orange-600">{won(comp)}</span>
                  <span className="text-gray-300">=</span>
                  <span className="w-24 text-right font-semibold text-gray-700">{won(emp + comp)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 font-bold border-t border-gray-200 pt-2">
                <span className="w-16 text-gray-700">합계</span>
                <span className="flex-1 text-right text-blue-700">{won(empTotal)}</span>
                <span className="text-gray-300">+</span>
                <span className="flex-1 text-right text-orange-700">{won(compTotal)}</span>
                <span className="text-gray-300">=</span>
                <span className="w-24 text-right text-gray-800">{won(empTotal + compTotal)}</span>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-gray-400">
              <div>사업주 요율: 국민연금 4.5% / 건강 3.545% / 장기요양 12.95% / 고용 1.15%</div>
              <div>* 산재보험은 업종별 별도 (건설업 등 별도 확인)</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 원천세 집계 ───────────────────────────────────────────────────────
function WithholdingView({ employees, payroll }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const activeEmps = employees.filter(e => e.employeeType !== '프리랜서' || e.employeeType === '프리랜서')

  const halfPeriods = [
    { label: '상반기', months: ['01', '02', '03', '04', '05', '06'], deadline: `${year}년 7월 10일` },
    { label: '하반기', months: ['07', '08', '09', '10', '11', '12'], deadline: `${year + 1}년 1월 10일` },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8249;</button>
        <span className="font-semibold text-gray-800 w-16 text-center">{year}년</span>
        <button onClick={() => setYear(y => y + 1)} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8250;</button>
      </div>

      <div className="bg-purple-50 rounded-xl px-4 py-3 text-xs text-purple-700">
        <div className="font-semibold mb-1">원천세 반기별 납부 신고</div>
        <div>• 상반기(1~6월) 징수분 → 7월 10일까지 신고·납부</div>
        <div>• 하반기(7~12월) 징수분 → 다음해 1월 10일까지 신고·납부</div>
        <div>• 소규모 사업자(상시 20인 이하)는 반기납부 가능</div>
      </div>

      {halfPeriods.map(period => {
        const monthPayrolls = period.months.flatMap(m => payroll.filter(p => p.yearMonth === `${year}-${m}`))
        const totalIncome = monthPayrolls.reduce((s, p) => s + (p.incomeTax || 0), 0)
        const totalLocal = monthPayrolls.reduce((s, p) => s + (p.localIncomeTax || 0), 0)
        const totalWithholding = monthPayrolls.reduce((s, p) => s + (p.withholdingTax || 0), 0)
        const grandTotal = totalIncome + totalLocal + totalWithholding

        return (
          <div key={period.label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-800">{period.label}</div>
              <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">신고기한: {period.deadline}</div>
            </div>

            <div className="space-y-1.5 mb-3">
              {period.months.map(m => {
                const mData = payroll.filter(p => p.yearMonth === `${year}-${m}`)
                const total = mData.reduce((s, p) => s + (p.incomeTax || 0) + (p.localIncomeTax || 0) + (p.withholdingTax || 0), 0)
                return (
                  <div key={m} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-gray-400">{Number(m)}월</span>
                    <span className="flex-1 text-gray-600">{mData.length > 0 ? `${mData.length}명` : <span className="text-gray-300">미등록</span>}</span>
                    {total > 0 ? <span className="font-medium text-gray-700">{won(total)}</span> : <span className="text-gray-300">-</span>}
                  </div>
                )
              })}
            </div>

            {grandTotal > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="text-xs text-gray-400 mb-2">직원별 {period.label} 합계</div>
                {activeEmps.map(emp => {
                  const empData = monthPayrolls.filter(p => p.employeeId === emp.id)
                  const empTax = empData.reduce((s, p) => s + (p.incomeTax || 0) + (p.localIncomeTax || 0) + (p.withholdingTax || 0), 0)
                  if (empTax === 0) return null
                  return <div key={emp.id} className="flex justify-between text-xs"><span className="text-gray-600">{emp.name}</span><span className="font-medium">{won(empTax)}</span></div>
                })}
              </div>
            )}

            <div className="mt-3 bg-purple-50 rounded-xl px-4 py-3 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-500">소득세 합계</span><span>{won(totalIncome + totalWithholding)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">지방소득세 합계</span><span>{won(totalLocal)}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-purple-100 pt-1.5">
                <span className="text-gray-700">납부 합계</span><span className="text-purple-700">{won(grandTotal)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 메인 HR 컴포넌트 ─────────────────────────────────────────────────
export default function HR() {
  const {
    employees, payroll, leaveRecords, overtimeRecords,
    addEmployee, updateEmployee, deleteEmployee,
    addPayroll, updatePayroll,
    addLeaveRecord, deleteLeaveRecord,
    upsertOvertimeRecord,
  } = useStore()

  const [subTab, setSubTab] = useState('인사관리')
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [payrollTarget, setPayrollTarget] = useState(null)
  const [yearMonth, setYearMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [rates, setRates] = useState(() => loadRates())

  const activeEmps = employees.filter(e => e.status === '재직')
  const monthPayroll = payroll.filter(p => p.yearMonth === yearMonth)

  function handleSaveEmployee(data) {
    if (data.id) updateEmployee(data.id, data)
    else addEmployee(data)
    setShowEmpModal(false)
    setEditingEmp(null)
  }

  function handleSavePayroll(data) {
    if (data.id) updatePayroll(data.id, data)
    else addPayroll(data)
    setShowPayrollModal(false)
    setPayrollTarget(null)
  }

  function openPayroll(emp) {
    const existing = payroll.find(p => p.employeeId === emp.id && p.yearMonth === yearMonth)
    setPayrollTarget({ employee: emp, payroll: existing || null })
    setShowPayrollModal(true)
  }

  function prevMonth() {
    const [y, m] = yearMonth.split('-').map(Number)
    setYearMonth(m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const [y, m] = yearMonth.split('-').map(Number)
    setYearMonth(m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`)
  }

  const typeColor = t => t === '정규직' ? 'bg-blue-100 text-blue-600' : t === '프리랜서' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'

  return (
    <div className="space-y-4">
      {/* 서브탭 (스크롤 가능) */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-0.5 overflow-x-auto">
        {HR_TABS.map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-xl transition-colors whitespace-nowrap ${subTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* 인사관리 */}
      {subTab === '인사관리' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">총 {employees.length}명 · 재직 {activeEmps.length}명</div>
            <button onClick={() => { setEditingEmp(null); setShowEmpModal(true) }}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">+ 직원 등록</button>
          </div>
          {employees.length === 0 ? (
            <div className="text-center py-14 text-gray-400"><div className="text-4xl mb-3">👥</div><div className="text-sm">등록된 직원이 없습니다</div></div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{emp.name.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-800">{emp.name}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${emp.status === '재직' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{emp.status}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${typeColor(emp.employeeType)}`}>{emp.employeeType}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{emp.position}{emp.phone ? ` · ${emp.phone}` : ''}</div>
                    {(emp.baseSalary > 0 || emp.dailyWage > 0) && (() => {
                      const monthly = (emp.baseSalary || 0) + (emp.comprehensiveOvertimePay || 0) + (emp.positionAllowance || 0) + (emp.mealAllowance || 0) + (emp.transportAllowance || 0)
                      const annual = monthly * 12
                      return (
                        <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600">연봉 {won(annual)}</span>
                            <span className="text-gray-400">월 {won(monthly)}</span>
                          </div>
                          <div>
                            {emp.employeeType === '일용직' ? `일당 ${won(emp.dailyWage)}`
                              : emp.contractType === '포괄연봉제' ? `기본급 ${won(emp.baseSalary)} + 포괄연장 ${won(emp.comprehensiveOvertimePay || 0)}`
                              : `기본급 ${won(emp.baseSalary)}`}
                            {(emp.mealAllowance || 0) > 0 && ` + 식대 ${won(emp.mealAllowance)}`}
                            {(emp.transportAllowance || 0) > 0 && ` + 교통비 ${won(emp.transportAllowance)}`}
                            {(emp.positionAllowance || 0) > 0 && ` + 직책 ${won(emp.positionAllowance)}`}
                          </div>
                          {emp.hireDate && <div className="text-gray-400">입사 {emp.hireDate}{emp.contractType === '포괄연봉제' && emp.hourlyWage > 0 ? ` · 통상시급 ${won(emp.hourlyWage)}` : ''}</div>}
                          {(emp.workPreset || emp.workStartTime) && (
                            <div className="text-gray-400">
                              {emp.workPreset ? `[${emp.workPreset}] ` : ''}{emp.workStartTime}~{emp.workEndTime}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditingEmp(emp); setShowEmpModal(true) }}
                      className="w-8 h-8 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-colors text-sm">✏</button>
                    <button onClick={() => { if (confirm(`${emp.name} 직원을 삭제할까요?`)) deleteEmployee(emp.id) }}
                      className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">&times;</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 급여명세서 */}
      {subTab === '급여명세서' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8249;</button>
            <span className="font-semibold text-gray-800 w-28 text-center">{fym(yearMonth)}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-500">&#8250;</button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">지급 {monthPayroll.filter(p => p.isPaid).length}/{monthPayroll.length}명</span>
              <button onClick={() => setShowRatesModal(true)}
                className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title="4대보험 요율 설정">요율⚙</button>
            </div>
          </div>
          {activeEmps.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">재직 중인 직원이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {activeEmps.map(emp => {
                const pr = monthPayroll.find(p => p.employeeId === emp.id)
                return (
                  <div key={emp.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">{emp.name.slice(0, 1)}</div>
                      <div className="flex-1"><div className="font-medium text-gray-800">{emp.name}</div><div className="text-xs text-gray-400">{emp.position} · {emp.employeeType}</div></div>
                      <div className="flex items-center gap-2">
                        {pr ? (
                          <>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${pr.isPaid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{pr.isPaid ? '지급완료' : '미지급'}</span>
                            <button onClick={() => openPayroll(emp)} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600">수정</button>
                          </>
                        ) : (
                          <button onClick={() => openPayroll(emp)} className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-1.5 rounded-xl transition-colors">+ 생성</button>
                        )}
                      </div>
                    </div>
                    {pr && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-sm">
                        <div className="flex gap-4 text-xs text-gray-400"><span>지급 {won(pr.gross)}</span><span>공제 {won(pr.totalDeduction)}</span></div>
                        <span className="font-bold text-gray-800">{won(pr.netPay)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {monthPayroll.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-gray-500 mb-2">{fym(yearMonth)} 합계</div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">총 지급액</span><span className="font-medium">{won(monthPayroll.reduce((s, p) => s + (p.gross || 0), 0))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">총 공제액</span><span className="text-red-500 font-medium">{won(monthPayroll.reduce((s, p) => s + (p.totalDeduction || 0), 0))}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2"><span className="text-gray-700">총 실수령액</span><span className="text-blue-600">{won(monthPayroll.reduce((s, p) => s + (p.netPay || 0), 0))}</span></div>
            </div>
          )}
        </div>
      )}

      {/* 추가근무 */}
      {subTab === '추가근무' && (
        <OvertimeView employees={employees} overtimeRecords={overtimeRecords} yearMonth={yearMonth} prevMonth={prevMonth} nextMonth={nextMonth} upsertOvertimeRecord={upsertOvertimeRecord} />
      )}

      {/* 급여대장 */}
      {subTab === '급여대장' && (
        <PayrollLedgerView employees={employees} payroll={payroll} yearMonth={yearMonth} prevMonth={prevMonth} nextMonth={nextMonth} />
      )}

      {/* 연차관리 */}
      {subTab === '연차관리' && (
        <LeaveSection employees={employees} leaveRecords={leaveRecords} addLeaveRecord={addLeaveRecord} deleteLeaveRecord={deleteLeaveRecord} />
      )}

      {/* 4대보험 */}
      {subTab === '4대보험' && (
        <InsuranceView employees={employees} payroll={payroll} yearMonth={yearMonth} prevMonth={prevMonth} nextMonth={nextMonth} rates={rates} />
      )}

      {/* 원천세 */}
      {subTab === '원천세' && (
        <WithholdingView employees={employees} payroll={payroll} />
      )}

      {/* 모달 */}
      {showEmpModal && (
        <EmployeeModal employee={editingEmp} onSave={handleSaveEmployee} onClose={() => { setShowEmpModal(false); setEditingEmp(null) }} />
      )}
      {showPayrollModal && payrollTarget && (
        <PayrollModal
          employee={payrollTarget.employee}
          payroll={payrollTarget.payroll}
          yearMonth={yearMonth}
          rates={rates}
          overtimeRecord={overtimeRecords.find(r => r.employeeId === payrollTarget.employee.id && r.yearMonth === yearMonth)}
          onSave={handleSavePayroll}
          onClose={() => { setShowPayrollModal(false); setPayrollTarget(null) }}
        />
      )}
      {showRatesModal && (
        <RatesModal rates={rates} onSave={r => { setRates(r); setShowRatesModal(false) }} onClose={() => setShowRatesModal(false)} />
      )}
    </div>
  )
}
