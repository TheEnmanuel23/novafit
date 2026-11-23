'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseISO, startOfWeek, endOfWeek, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type {
  CashRegisterSessionWithDetails,
  PaymentMethod,
  SaleWithDetails,
} from '@novafit/types'
import { APP_TIMEZONE, toTimezoneYYYYMMDD } from '@novafit/supabase/src/utils/date'
import {
  markSaleAsPaidAction,
  openCashRegisterAction,
  closeCashRegisterAction,
} from '@/app/actions/sales'

type TopBalanceSection = 'transactions' | 'cash_closures'
type PeriodFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
type BalanceTab = 'incomes' | 'outcomes' | 'receivables' | 'payables'

function formatMoney(num: number): string {
  return num.toLocaleString('es-NI', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function getSaleConceptTitle(sale: SaleWithDetails): string {
  if (sale.receipt_name && sale.receipt_name.trim()) {
    return sale.receipt_name.trim()
  }
  const stamp = formatInTimeZone(sale.sale_date, APP_TIMEZONE, 'ddMMyyHHmm')
  return `Venta ${stamp}`
}

function formatTreintaDateTime(dateInput: string | null | undefined): string {
  if (!dateInput) return 'N/A'
  return formatInTimeZone(dateInput, APP_TIMEZONE, "d 'de' MMM 'de' yyyy H:mm", {
    locale: es,
  })
}

export function BalanceView({
  initialSales,
  paymentMethods,
  initialCashSessions,
  openCashSession,
  defaultTodayYMD,
  canEditSales,
  canManageCash,
}: {
  initialSales: SaleWithDetails[]
  paymentMethods: PaymentMethod[]
  initialCashSessions: CashRegisterSessionWithDetails[]
  openCashSession: CashRegisterSessionWithDetails | null
  defaultTodayYMD: string
  canEditSales: boolean
  canManageCash: boolean
}) {
  const router = useRouter()

  // Top-level switcher matching Screenshot 1 & 2: [Transacciones] | [Cierres de caja]
  const [topSection, setTopSection] = useState<TopBalanceSection>('transactions')

  // Period frequency filter: Diario, Semanal, Mensual, Anual, Rango personalizado
  const [frequency, setFrequency] = useState<PeriodFrequency>('monthly')
  const [selectedDay, setSelectedDay] = useState<string>(defaultTodayYMD)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    defaultTodayYMD.slice(0, 7) // YYYY-MM
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    defaultTodayYMD.slice(0, 4) // YYYY
  )
  const [customStartDate, setCustomStartDate] = useState<string>(
    `${defaultTodayYMD.slice(0, 7)}-01`
  )
  const [customEndDate, setCustomEndDate] = useState<string>(defaultTodayYMD)

  // Additional filters for Transacciones
  const [searchConcept, setSearchConcept] = useState<string>('')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)

  // Inner 4 Tabs inside Transacciones: Ingresos, Egresos, Por cobrar, Por pagar
  const [activeTab, setActiveTab] = useState<BalanceTab>('incomes')

  // Feedback & transitions
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [isMarkingPaid, startMarkPaidTransition] = useTransition()
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleWithDetails | null>(
    null
  )

  // Cash Register ("Abrir caja" / "Cerrar caja") modals state
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false)
  const [openingAmountStr, setOpeningAmountStr] = useState('0')
  const [openingNotes, setOpeningNotes] = useState('')
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false)
  const [countedCashStr, setCountedCashStr] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [isCashPending, startCashTransition] = useTransition()
  const [selectedCashSessionDetail, setSelectedCashSessionDetail] =
    useState<CashRegisterSessionWithDetails | null>(null)

  // Helper to check if a YYYY-MM-DD falls within the active period filter
  const matchesActivePeriod = useMemo(() => {
    let weekStart = ''
    let weekEnd = ''
    if (frequency === 'weekly' && selectedDay) {
      const parsed = parseISO(selectedDay)
      weekStart = format(startOfWeek(parsed, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      weekEnd = format(endOfWeek(parsed, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    }

    return (ymd: string) => {
      if (frequency === 'daily') return ymd === selectedDay
      if (frequency === 'weekly') return ymd >= weekStart && ymd <= weekEnd
      if (frequency === 'monthly') return ymd.startsWith(selectedMonth)
      if (frequency === 'yearly') return ymd.startsWith(selectedYear)
      if (frequency === 'custom') {
        if (customStartDate && ymd < customStartDate) return false
        if (customEndDate && ymd > customEndDate) return false
        return true
      }
      return true
    }
  }, [
    frequency,
    selectedDay,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
  ])

  // Filter sales by the active date period, payment method, and concept search
  const periodFilteredSales = useMemo(() => {
    const q = searchConcept.trim().toLowerCase()

    return initialSales.filter((sale) => {
      const saleYMD = toTimezoneYYYYMMDD(sale.sale_date, APP_TIMEZONE)

      if (!matchesActivePeriod(saleYMD)) return false

      if (selectedPaymentMethodId !== 'all') {
        if (sale.payment_method_id !== selectedPaymentMethodId) return false
      }

      if (q) {
        const conceptTitle = getSaleConceptTitle(sale).toLowerCase()
        const itemsText = sale.items
          .map((i) => i.product_name.toLowerCase())
          .join(' ')
        const clientText = (sale.member?.name || '').toLowerCase()
        const detailsText = (sale.receipt_details || '').toLowerCase()

        if (
          !conceptTitle.includes(q) &&
          !itemsText.includes(q) &&
          !clientText.includes(q) &&
          !detailsText.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [
    initialSales,
    matchesActivePeriod,
    selectedPaymentMethodId,
    searchConcept,
  ])

  // Filter cash register closures by the active date period
  const periodFilteredCashSessions = useMemo(() => {
    return initialCashSessions.filter((session) => {
      const refDate = session.closed_at || session.opened_at
      const ymd = toTimezoneYYYYMMDD(refDate, APP_TIMEZONE)
      return matchesActivePeriod(ymd)
    })
  }, [initialCashSessions, matchesActivePeriod])

  // Live metrics for the currently open cash register shift
  const currentShiftMetrics = useMemo(() => {
    if (!openCashSession) {
      return {
        openingAmount: 0,
        cashSales: 0,
        otherSales: 0,
        totalSales: 0,
        expectedCash: 0,
      }
    }

    const openedAtTime = new Date(openCashSession.opened_at).getTime()
    let cashSales = 0
    let otherSales = 0

    for (const s of initialSales) {
      if (s.payment_status !== 'paid') continue
      const saleTime = new Date(s.sale_date).getTime()
      if (saleTime >= openedAtTime) {
        const amt = Number(s.total || 0)
        if (s.payment_method?.key === 'cash' || !s.payment_method) {
          cashSales += amt
        } else {
          otherSales += amt
        }
      }
    }

    const openingAmount = Number(openCashSession.opening_amount || 0)
    const expectedCash = Number((openingAmount + cashSales).toFixed(2))
    return {
      openingAmount,
      cashSales: Number(cashSales.toFixed(2)),
      otherSales: Number(otherSales.toFixed(2)),
      totalSales: Number((cashSales + otherSales).toFixed(2)),
      expectedCash,
    }
  }, [openCashSession, initialSales])

  // Split into Ingresos (paid sales) and Por cobrar (credit sales)
  const incomeSales = useMemo(
    () => periodFilteredSales.filter((s) => s.payment_status === 'paid'),
    [periodFilteredSales]
  )

  const receivableSales = useMemo(
    () => periodFilteredSales.filter((s) => s.payment_status === 'credit'),
    [periodFilteredSales]
  )

  const totalIncomes = useMemo(
    () => incomeSales.reduce((acc, s) => acc + Number(s.total || 0), 0),
    [incomeSales]
  )
  const totalOutcomes = 0 // Egresos empty for now
  const netBalance = totalIncomes - totalOutcomes
  const totalReceivables = useMemo(
    () => receivableSales.reduce((acc, s) => acc + Number(s.total || 0), 0),
    [receivableSales]
  )

  const handleMarkAsPaid = (saleId: string) => {
    setFeedbackError(null)
    startMarkPaidTransition(async () => {
      const res = await markSaleAsPaidAction(saleId)
      if (res.error) {
        setFeedbackError(res.error)
      } else {
        setFeedbackMessage('Venta marcada como Pagada y movida a Ingresos.')
        setTimeout(() => setFeedbackMessage(null), 3500)
        setSelectedSaleDetail(null)
        router.refresh()
      }
    })
  }

  const handleOpenCashRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackError(null)
    const amount = parseFloat(openingAmountStr) || 0

    startCashTransition(async () => {
      const res = await openCashRegisterAction(amount, openingNotes)
      if (res.error) {
        setFeedbackError(res.error)
      } else {
        setIsOpenCashModalOpen(false)
        setOpeningAmountStr('0')
        setOpeningNotes('')
        setFeedbackMessage('¡Caja abierta correctamente!')
        setTimeout(() => setFeedbackMessage(null), 3500)
        router.refresh()
      }
    })
  }

  const handleCloseCashRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!openCashSession) return
    setFeedbackError(null)
    const counted = parseFloat(countedCashStr)
    if (isNaN(counted) || counted < 0) {
      setFeedbackError('Ingresa el monto de efectivo contado en caja.')
      return
    }

    startCashTransition(async () => {
      const res = await closeCashRegisterAction({
        sessionId: openCashSession.id,
        countedCashAmount: counted,
        notes: closingNotes,
      })
      if (res.error) {
        setFeedbackError(res.error)
      } else {
        setIsCloseCashModalOpen(false)
        setCountedCashStr('')
        setClosingNotes('')
        setTopSection('cash_closures')
        setFeedbackMessage('¡Cierre de caja registrado exitosamente!')
        setTimeout(() => setFeedbackMessage(null), 4000)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header matching Treinta: "Balance" on left, "Abrir caja" / "Cerrar caja" on right */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground"
            title="Volver al Panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">Balance</h1>
              {openCashSession ? (
                <span className="badge badge-active !text-[10px]">
                  ● Caja abierta
                </span>
              ) : (
                <span className="badge badge-no-plan !text-[10px]">
                  Caja cerrada
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canManageCash && (
            <>
              {openCashSession ? (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackError(null)
                    setCountedCashStr(String(currentShiftMetrics.expectedCash))
                    setIsCloseCashModalOpen(true)
                  }}
                  className="btn !min-h-10 px-4 text-xs font-bold rounded-full bg-warning text-black hover:bg-warning/90 shadow-lg shadow-warning/20"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Cerrar caja
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackError(null)
                    setOpeningAmountStr('0')
                    setIsOpenCashModalOpen(true)
                  }}
                  className="btn !min-h-10 px-5 text-xs font-bold rounded-full bg-[#1e2433] hover:bg-[#272f42] text-white border border-white/15 shadow-md"
                >
                  <span className="text-warning">👑</span>
                  Abrir caja
                </button>
              )}
            </>
          )}

          <Link
            href="/sales"
            className="btn btn-primary !min-h-10 px-4 text-xs rounded-full shadow-lg shadow-accent/20"
          >
            + Nueva venta
          </Link>
        </div>
      </header>

      {/* Top Segmented Bar matching Screenshot 2: [Transacciones] | [Cierres de caja] */}
      <div className="grid grid-cols-2 p-1.5 rounded-xl bg-surface border border-border">
        <button
          type="button"
          onClick={() => setTopSection('transactions')}
          className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            topSection === 'transactions'
              ? 'bg-[#1e2433] text-white shadow-sm border border-white/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Transacciones
        </button>
        <button
          type="button"
          onClick={() => setTopSection('cash_closures')}
          className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            topSection === 'cash_closures'
              ? 'bg-[#1e2433] text-white shadow-sm border border-white/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Cierres de caja</span>
          {periodFilteredCashSessions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[11px]">
              {periodFilteredCashSessions.length}
            </span>
          )}
        </button>
      </div>

      {/* Feedback messages */}
      {feedbackError && (
        <div className="bg-error/15 border border-error/30 text-error px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{feedbackError}</span>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {feedbackMessage && (
        <div className="bg-success/15 border border-success/30 text-success px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Period & Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        {topSection === 'transactions' && (
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`btn !min-h-11 px-4 text-xs rounded-xl border transition-colors ${
              isFilterOpen || selectedPaymentMethodId !== 'all'
                ? 'bg-accent/20 border-accent text-white'
                : 'btn-ghost border-border'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="21" y2="21" />
              <line x1="4" x2="20" y1="14" y2="14" />
              <line x1="4" x2="20" y1="7" y2="7" />
              <circle cx="9" cy="7" r="2" />
              <circle cx="15" cy="14" r="2" />
              <circle cx="11" cy="21" r="2" />
            </svg>
            Filtrar
            {selectedPaymentMethodId !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
        )}

        {/* Period Frequency Selector (Diario, Semanal, Mensual, Anual, Rango personalizado) */}
        <div className="relative">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as PeriodFrequency)}
            aria-label="Frecuencia de periodo"
            className="input !min-h-11 !w-auto pr-9 pl-3.5 py-2 text-xs font-semibold rounded-xl appearance-none cursor-pointer"
          >
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
            <option value="custom">Rango personalizado</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground text-[10px]">
            ▼
          </div>
        </div>

        {/* Date Picker matching active frequency */}
        {frequency === 'daily' && (
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            aria-label="Seleccionar día"
            className="input !min-h-11 !w-auto px-3.5 py-2 text-xs font-medium rounded-xl"
          />
        )}

        {frequency === 'weekly' && (
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            aria-label="Seleccionar semana"
            className="input !min-h-11 !w-auto px-3.5 py-2 text-xs font-medium rounded-xl"
          />
        )}

        {frequency === 'monthly' && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Seleccionar mes"
            className="input !min-h-11 !w-auto px-3.5 py-2 text-xs font-medium rounded-xl"
          />
        )}

        {frequency === 'yearly' && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            aria-label="Seleccionar año"
            className="input !min-h-11 !w-auto px-3.5 py-2 text-xs font-medium rounded-xl cursor-pointer"
          >
            {[2024, 2025, 2026, 2027, 2028].map((yr) => (
              <option key={yr} value={String(yr)}>
                {yr}
              </option>
            ))}
          </select>
        )}

        {frequency === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              aria-label="Fecha inicial"
              className="input !min-h-11 !w-auto px-3 py-2 text-xs rounded-xl"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              aria-label="Fecha final"
              className="input !min-h-11 !w-auto px-3 py-2 text-xs rounded-xl"
            />
          </div>
        )}

        {topSection === 'transactions' && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchConcept}
              onChange={(e) => setSearchConcept(e.target.value)}
              placeholder="Buscar concepto..."
              aria-label="Buscar concepto"
              className="input !min-h-11 pl-10 pr-8 py-2 text-xs rounded-xl"
            />
            {searchConcept && (
              <button
                type="button"
                onClick={() => setSearchConcept('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── TOP SECTION 1: TRANSACCIONES ─── */}
      {topSection === 'transactions' && (
        <>
          {/* Expandable Payment Method filter pill bar when "Filtrar" is clicked */}
          {isFilterOpen && (
            <div className="glass p-3.5 rounded-2xl border border-border flex flex-wrap items-center gap-2 animate-in fade-in">
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                Medio de pago:
              </span>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethodId('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                  selectedPaymentMethodId === 'all'
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos
              </button>
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethodId(pm.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                    selectedPaymentMethodId === pm.id
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {pm.name}
                </button>
              ))}
            </div>
          )}

          {/* 3 Summary Cards: Balance, Ventas totales, Gastos totales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass p-4 rounded-2xl border border-border flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  Balance
                </span>
                <span className="text-2xl font-black text-foreground">
                  C${formatMoney(netBalance)}
                </span>
              </div>
            </div>

            <div className="glass p-4 rounded-2xl border border-border flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="12" x="2" y="6" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  Ventas totales
                </span>
                <span className="text-2xl font-black text-success">
                  C${formatMoney(totalIncomes)}
                </span>
              </div>
            </div>

            <div className="glass p-4 rounded-2xl border border-border flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="12" x="2" y="6" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  Gastos totales
                </span>
                <span className="text-2xl font-black text-error">
                  C${formatMoney(totalOutcomes)}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Inner Tabs: Ingresos | Egresos | Por cobrar | Por pagar */}
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setActiveTab('incomes')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer border-b-2 ${
                  activeTab === 'incomes'
                    ? 'border-foreground text-foreground bg-white/[0.04]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                }`}
              >
                Ingresos ({incomeSales.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('outcomes')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer border-b-2 ${
                  activeTab === 'outcomes'
                    ? 'border-foreground text-foreground bg-white/[0.04]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                }`}
              >
                Egresos (0)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('receivables')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'receivables'
                    ? 'border-warning text-warning bg-warning/10'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                }`}
              >
                <span>Por cobrar ({receivableSales.length})</span>
                {totalReceivables > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-black">
                    C${formatMoney(totalReceivables)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payables')}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer border-b-2 ${
                  activeTab === 'payables'
                    ? 'border-foreground text-foreground bg-white/[0.04]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                }`}
              >
                Por pagar (0)
              </button>
            </div>

            {/* Table Content: Concepto | Valor | Medio de pago | Fecha y hora */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-white/[0.03] text-xs font-semibold text-muted-foreground">
                    <th className="py-3.5 px-5">Concepto</th>
                    <th className="py-3.5 px-4 w-36">Valor</th>
                    <th className="py-3.5 px-4 w-44">Medio de pago</th>
                    <th className="py-3.5 px-5 w-56">Fecha y hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {activeTab === 'incomes' &&
                    (incomeSales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-14 px-4 text-center text-muted-foreground text-sm"
                        >
                          No hay ingresos registrados en este periodo.
                        </td>
                      </tr>
                    ) : (
                      incomeSales.map((sale) => (
                        <BalanceSaleRow
                          key={sale.id}
                          sale={sale}
                          isCredit={false}
                          onSelect={() => setSelectedSaleDetail(sale)}
                        />
                      ))
                    ))}

                  {activeTab === 'outcomes' && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-14 px-4 text-center text-muted-foreground text-sm"
                      >
                        No hay egresos registrados.
                      </td>
                    </tr>
                  )}

                  {activeTab === 'receivables' &&
                    (receivableSales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-14 px-4 text-center text-muted-foreground text-sm"
                        >
                          No hay ventas al crédito pendientes por cobrar en este periodo.
                        </td>
                      </tr>
                    ) : (
                      receivableSales.map((sale) => (
                        <BalanceSaleRow
                          key={sale.id}
                          sale={sale}
                          isCredit={true}
                          onSelect={() => setSelectedSaleDetail(sale)}
                        />
                      ))
                    ))}

                  {activeTab === 'payables' && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-14 px-4 text-center text-muted-foreground text-sm"
                      >
                        No hay cuentas por pagar registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── TOP SECTION 2: CIERRES DE CAJA ─── */}
      {topSection === 'cash_closures' && (
        <div className="flex flex-col gap-4">
          {/* Active Open Cash Register Shift Banner */}
          {openCashSession && (
            <div className="glass p-5 rounded-2xl border-2 border-success/50 bg-success/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="badge badge-active !text-[10px]">
                    Turno actual en curso
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Abierta el {formatTreintaDateTime(openCashSession.opened_at)} por{' '}
                    <strong className="text-foreground">
                      {openCashSession.opened_by_staff?.name || 'Staff'}
                    </strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Base inicial: </span>
                    <strong className="text-foreground">
                      C${formatMoney(currentShiftMetrics.openingAmount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ventas efectivo: </span>
                    <strong className="text-success">
                      +C${formatMoney(currentShiftMetrics.cashSales)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Otros medios: </span>
                    <strong className="text-foreground">
                      C${formatMoney(currentShiftMetrics.otherSales)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Efectivo esperado en caja: </span>
                    <strong className="text-base font-black text-white">
                      C${formatMoney(currentShiftMetrics.expectedCash)}
                    </strong>
                  </div>
                </div>
              </div>

              {canManageCash && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackError(null)
                    setCountedCashStr(String(currentShiftMetrics.expectedCash))
                    setIsCloseCashModalOpen(true)
                  }}
                  className="btn !min-h-10 px-5 text-xs font-bold rounded-xl bg-warning text-black hover:bg-warning/90 shrink-0"
                >
                  Realizar cierre de caja
                </button>
              )}
            </div>
          )}

          {/* List of Cash Closures or Empty State matching Screenshot 2 */}
          {periodFilteredCashSessions.length === 0 ? (
            <div className="glass py-20 px-4 rounded-2xl border border-border flex flex-col items-center justify-center text-center gap-3">
              <div className="text-4xl select-none">🔎</div>
              <p className="text-sm text-muted-foreground max-w-md">
                <strong className="text-foreground font-bold">
                  No se encontraron cierres de caja con estos filtros
                </strong>{' '}
                Intenta buscar usando otros criterios
              </p>
              {canManageCash && !openCashSession && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackError(null)
                    setOpeningAmountStr('0')
                    setIsOpenCashModalOpen(true)
                  }}
                  className="btn btn-primary !min-h-10 px-5 text-xs rounded-xl mt-2"
                >
                  Abrir caja ahora
                </button>
              )}
            </div>
          ) : (
            <div className="glass rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-white/[0.03] text-xs font-semibold text-muted-foreground">
                      <th className="py-3.5 px-4">Estado / Apertura</th>
                      <th className="py-3.5 px-3">Cierre</th>
                      <th className="py-3.5 px-3">Base inicial</th>
                      <th className="py-3.5 px-3">Ventas efectivo</th>
                      <th className="py-3.5 px-3">Efectivo esperado</th>
                      <th className="py-3.5 px-3">Efectivo contado</th>
                      <th className="py-3.5 px-4 text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {periodFilteredCashSessions.map((session) => {
                      const isOpen = session.status === 'open'
                      const diff = Number(session.difference_amount ?? 0)

                      return (
                        <tr
                          key={session.id}
                          onClick={() => setSelectedCashSessionDetail(session)}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <span className="badge badge-active !text-[10px]">
                                    Abierta
                                  </span>
                                ) : (
                                  <span className="badge badge-no-plan !text-[10px]">
                                    Cerrada
                                  </span>
                                )}
                                <span className="font-semibold text-xs">
                                  {formatTreintaDateTime(session.opened_at)}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                Abierta por: {session.opened_by_staff?.name || 'Staff'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-xs">
                            {session.closed_at ? (
                              <div className="flex flex-col">
                                <span className="text-foreground font-medium">
                                  {formatTreintaDateTime(session.closed_at)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Por: {session.closed_by_staff?.name || 'Staff'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-warning font-semibold">En curso</span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-medium">
                            C${formatMoney(session.opening_amount)}
                          </td>

                          <td className="py-3.5 px-3 font-medium text-success">
                            {isOpen
                              ? `C$${formatMoney(currentShiftMetrics.cashSales)}`
                              : `C$${formatMoney(session.cash_sales_total)}`}
                          </td>

                          <td className="py-3.5 px-3 font-bold">
                            {isOpen
                              ? `C$${formatMoney(currentShiftMetrics.expectedCash)}`
                              : `C$${formatMoney(session.expected_cash_amount)}`}
                          </td>

                          <td className="py-3.5 px-3 font-bold">
                            {session.counted_cash_amount !== null
                              ? `C$${formatMoney(session.counted_cash_amount)}`
                              : '—'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold">
                            {session.difference_amount !== null ? (
                              <span
                                className={
                                  diff < 0
                                    ? 'text-error'
                                    : diff > 0
                                    ? 'text-warning'
                                    : 'text-success'
                                }
                              >
                                {diff > 0 ? '+' : ''}C${formatMoney(diff)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: ABRIR CAJA ─── */}
      {isOpenCashModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-cash-title"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 id="open-cash-title" className="text-lg font-bold">
                  Abrir caja
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ingresa el monto base de efectivo con el que inicias turno
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenCashModalOpen(false)}
                className="text-muted-foreground hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenCashRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="opening_amount" className="text-sm font-semibold">
                  Base inicial en efectivo (C$) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-base font-bold text-muted-foreground">
                    C$
                  </span>
                  <input
                    id="opening_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingAmountStr}
                    onChange={(e) => setOpeningAmountStr(e.target.value)}
                    className="input pl-11 text-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="opening_notes" className="text-sm font-semibold">
                  Observaciones (Opcional)
                </label>
                <textarea
                  id="opening_notes"
                  rows={2}
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  placeholder="Ej. Turno de la mañana..."
                  className="input min-h-[70px] py-2.5 text-sm resize-y"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCashPending}
                  onClick={() => setIsOpenCashModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCashPending}
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-accent/25"
                >
                  {isCashPending ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CERRAR CAJA ─── */}
      {isCloseCashModalOpen && openCashSession && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-cash-title"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 id="close-cash-title" className="text-lg font-bold">
                  Cierre de caja
                </h2>
                <p className="text-xs text-muted-foreground">
                  Abierta el {formatTreintaDateTime(openCashSession.opened_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseCashModalOpen(false)}
                className="text-muted-foreground hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Summary of current shift */}
            <div className="p-4 rounded-2xl bg-black/40 border border-border flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base inicial en efectivo:</span>
                <span className="font-semibold text-foreground">
                  C${formatMoney(currentShiftMetrics.openingAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Ventas cobradas en efectivo:
                </span>
                <span className="font-semibold text-success">
                  +C${formatMoney(currentShiftMetrics.cashSales)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Ventas por otros medios (Tarjeta, Transferencia, etc.):
                </span>
                <span className="font-semibold text-foreground">
                  C${formatMoney(currentShiftMetrics.otherSales)}
                </span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-sm font-black">
                <span>Efectivo esperado en caja:</span>
                <span className="text-accent">
                  C${formatMoney(currentShiftMetrics.expectedCash)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCloseCashRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="counted_cash" className="text-sm font-semibold">
                  Efectivo real contado en caja (C$) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-base font-bold text-muted-foreground">
                    C$
                  </span>
                  <input
                    id="counted_cash"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={countedCashStr}
                    onChange={(e) => setCountedCashStr(e.target.value)}
                    placeholder="0.00"
                    className="input pl-11 text-lg font-bold"
                  />
                </div>

                {/* Live difference indicator */}
                {countedCashStr !== '' && !isNaN(parseFloat(countedCashStr)) && (
                  <div className="flex justify-between text-xs mt-1 px-1">
                    <span className="text-muted-foreground">Diferencia:</span>
                    {(() => {
                      const diff = Number(
                        (
                          parseFloat(countedCashStr) - currentShiftMetrics.expectedCash
                        ).toFixed(2)
                      )
                      return (
                        <strong
                          className={
                            diff < 0
                              ? 'text-error'
                              : diff > 0
                              ? 'text-warning'
                              : 'text-success'
                          }
                        >
                          {diff > 0 ? '+' : ''}C${formatMoney(diff)}{' '}
                          {diff === 0
                            ? '(Cuadre exacto)'
                            : diff < 0
                            ? '(Faltante)'
                            : '(Sobrante)'}
                        </strong>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="closing_notes" className="text-sm font-semibold">
                  Notas de cierre (Opcional)
                </label>
                <textarea
                  id="closing_notes"
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Observaciones del cierre o justificación de diferencia..."
                  className="input min-h-[70px] py-2.5 text-sm resize-y"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCashPending}
                  onClick={() => setIsCloseCashModalOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCashPending}
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-accent/25"
                >
                  {isCashPending ? 'Cerrando caja...' : 'Confirmar cierre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DETALLE DE CIERRE DE CAJA ─── */}
      {selectedCashSessionDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Detalle de caja</h3>
                  {selectedCashSessionDetail.status === 'open' ? (
                    <span className="badge badge-active !text-[10px]">Abierta</span>
                  ) : (
                    <span className="badge badge-no-plan !text-[10px]">Cerrada</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Apertura: {formatTreintaDateTime(selectedCashSessionDetail.opened_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCashSessionDetail(null)}
                className="text-muted-foreground hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Abierta por:</span>
                <span className="font-semibold">
                  {selectedCashSessionDetail.opened_by_staff?.name || 'Staff'}
                </span>
              </div>
              {selectedCashSessionDetail.closed_at && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha de cierre:</span>
                    <span className="font-semibold">
                      {formatTreintaDateTime(selectedCashSessionDetail.closed_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cerrada por:</span>
                    <span className="font-semibold">
                      {selectedCashSessionDetail.closed_by_staff?.name || 'Staff'}
                    </span>
                  </div>
                </>
              )}
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base inicial:</span>
                <span className="font-bold">
                  C${formatMoney(selectedCashSessionDetail.opening_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ventas en efectivo:</span>
                <span className="font-bold text-success">
                  C${formatMoney(selectedCashSessionDetail.cash_sales_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ventas otros medios:</span>
                <span className="font-bold">
                  C${formatMoney(selectedCashSessionDetail.other_sales_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total ventas del turno:</span>
                <span className="font-bold">
                  C${formatMoney(selectedCashSessionDetail.total_sales)}
                </span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo esperado:</span>
                <span className="font-bold">
                  C${formatMoney(selectedCashSessionDetail.expected_cash_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo contado:</span>
                <span className="font-bold">
                  {selectedCashSessionDetail.counted_cash_amount !== null
                    ? `C$${formatMoney(selectedCashSessionDetail.counted_cash_amount)}`
                    : '—'}
                </span>
              </div>
              {selectedCashSessionDetail.difference_amount !== null && (
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>Diferencia:</span>
                  <span
                    className={
                      selectedCashSessionDetail.difference_amount < 0
                        ? 'text-error'
                        : selectedCashSessionDetail.difference_amount > 0
                        ? 'text-warning'
                        : 'text-success'
                    }
                  >
                    {selectedCashSessionDetail.difference_amount > 0 ? '+' : ''}
                    C${formatMoney(selectedCashSessionDetail.difference_amount)}
                  </span>
                </div>
              )}
              {selectedCashSessionDetail.notes && (
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-muted-foreground">Notas:</span>
                  <div className="p-2.5 rounded-xl bg-surface border border-border text-foreground">
                    {selectedCashSessionDetail.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCashSessionDetail(null)}
                className="btn btn-ghost !min-h-10 px-5 text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail / Credit Collection Modal when a transaction row is clicked */}
      {selectedSaleDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">
                    {getSaleConceptTitle(selectedSaleDetail)}
                  </h3>
                  {selectedSaleDetail.payment_status === 'credit' ? (
                    <span className="badge badge-warning !text-[10px]">Por cobrar</span>
                  ) : (
                    <span className="badge badge-active !text-[10px]">Pagada</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTreintaDateTime(selectedSaleDetail.sale_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="text-muted-foreground hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-foreground">
                  {selectedSaleDetail.member
                    ? `${selectedSaleDetail.member.name} (${selectedSaleDetail.member.username})`
                    : 'Cliente general'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medio de pago:</span>
                <span className="font-semibold text-foreground">
                  {selectedSaleDetail.payment_method?.name || 'Efectivo'}
                  {selectedSaleDetail.custom_payment_method
                    ? ` (${selectedSaleDetail.custom_payment_method})`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cantidad de pagos:</span>
                <span className="font-semibold text-foreground">
                  {selectedSaleDetail.installments_count}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendedor asignado:</span>
                <span className="font-semibold text-foreground">
                  {selectedSaleDetail.assigned_staff?.name || 'Staff'}
                </span>
              </div>
              {selectedSaleDetail.receipt_details && (
                <div className="flex flex-col gap-0.5 pt-1">
                  <span className="text-muted-foreground">Detalle del comprobante:</span>
                  <span className="text-foreground bg-surface p-2 rounded-lg border border-border">
                    {selectedSaleDetail.receipt_details}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Detalle de venta
              </span>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {selectedSaleDetail.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span>
                      <strong>{item.quantity}x</strong> {item.product_name}
                    </span>
                    <span className="font-semibold">
                      C${formatMoney(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {selectedSaleDetail.discount > 0 && (
                <div className="flex justify-between text-xs text-warning pt-1 border-t border-white/5">
                  <span>Descuento</span>
                  <span>-C${formatMoney(selectedSaleDetail.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-success">
                  C${formatMoney(selectedSaleDetail.total)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              {selectedSaleDetail.payment_status === 'credit' && canEditSales && (
                <button
                  type="button"
                  disabled={isMarkingPaid}
                  onClick={() => handleMarkAsPaid(selectedSaleDetail.id)}
                  className="btn btn-success !min-h-10 px-4 text-xs rounded-xl flex-1"
                >
                  {isMarkingPaid ? 'Procesando...' : '✓ Marcar como cobrada (Pagada)'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="btn btn-ghost !min-h-10 px-5 text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BalanceSaleRow({
  sale,
  isCredit,
  onSelect,
}: {
  sale: SaleWithDetails
  isCredit: boolean
  onSelect: () => void
}) {
  const conceptTitle = getSaleConceptTitle(sale)
  const itemsSummary = sale.items
    .map((i) => `${i.quantity}x ${i.product_name}`)
    .join(', ')

  return (
    <tr
      onClick={onSelect}
      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
    >
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isCredit
                ? 'bg-warning/15 text-warning'
                : 'bg-success/15 text-success'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground">{conceptTitle}</span>
            <span className="text-xs text-muted-foreground truncate max-w-md">
              {itemsSummary}
              {sale.member ? ` • ${sale.member.name}` : ''}
            </span>
          </div>
        </div>
      </td>

      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
        <span className={isCredit ? 'text-warning' : 'text-foreground'}>
          C${formatMoney(sale.total)}
        </span>
      </td>

      <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
        {sale.payment_method?.name || 'Efectivo'}
        {sale.custom_payment_method ? ` (${sale.custom_payment_method})` : ''}
      </td>

      <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap">
        {formatTreintaDateTime(sale.sale_date)}
      </td>
    </tr>
  )
}
