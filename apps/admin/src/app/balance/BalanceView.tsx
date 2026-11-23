'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { parseISO, startOfWeek, endOfWeek, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type { PaymentMethod, SaleWithDetails } from '@novafit/types'
import { APP_TIMEZONE, toTimezoneYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { markSaleAsPaidAction } from '@/app/actions/sales'

type PeriodFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
type BalanceTab = 'incomes' | 'outcomes' | 'receivables' | 'payables'

function formatMoney(num: number): string {
  return num.toLocaleString('es-NI', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formats a sale concept like Treinta.co:
 * If receipt_name is set, shows receipt_name.
 * Otherwise generates "Venta DDMMYYHHmm" in America/Managua timezone (e.g. "Venta 2311260908")
 * plus item summary underneath.
 */
function getSaleConceptTitle(sale: SaleWithDetails): string {
  if (sale.receipt_name && sale.receipt_name.trim()) {
    return sale.receipt_name.trim()
  }
  const stamp = formatInTimeZone(sale.sale_date, APP_TIMEZONE, 'ddMMyyHHmm')
  return `Venta ${stamp}`
}

/**
 * Formats timestamp like Treinta screenshot: "23 de nov de 2026 9:08"
 */
function formatTreintaDateTime(dateInput: string): string {
  if (!dateInput) return 'N/A'
  return formatInTimeZone(dateInput, APP_TIMEZONE, "d 'de' MMM 'de' yyyy H:mm", {
    locale: es,
  })
}

export function BalanceView({
  initialSales,
  paymentMethods,
  defaultTodayYMD,
  canEditSales,
}: {
  initialSales: SaleWithDetails[]
  paymentMethods: PaymentMethod[]
  defaultTodayYMD: string
  canEditSales: boolean
}) {
  const router = useRouter()

  // Period frequency filter matching Screenshot 2: Diario, Semanal, Mensual, Anual, Rango personalizado
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

  // Additional filters
  const [searchConcept, setSearchConcept] = useState<string>('')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)

  // Main 4 Tabs: Ingresos, Egresos, Por cobrar, Por pagar
  const [activeTab, setActiveTab] = useState<BalanceTab>('incomes')

  // Mark credit sale as paid state
  const [isMarkingPaid, startMarkPaidTransition] = useTransition()
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleWithDetails | null>(
    null
  )

  // Filter sales by the active date period, payment method, and concept search
  const periodFilteredSales = useMemo(() => {
    const q = searchConcept.trim().toLowerCase()

    let weekStart = ''
    let weekEnd = ''
    if (frequency === 'weekly' && selectedDay) {
      const parsed = parseISO(selectedDay)
      weekStart = format(startOfWeek(parsed, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      weekEnd = format(endOfWeek(parsed, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    }

    return initialSales.filter((sale) => {
      const saleYMD = toTimezoneYYYYMMDD(sale.sale_date, APP_TIMEZONE)

      // 1. Date Period Check
      if (frequency === 'daily') {
        if (saleYMD !== selectedDay) return false
      } else if (frequency === 'weekly') {
        if (saleYMD < weekStart || saleYMD > weekEnd) return false
      } else if (frequency === 'monthly') {
        if (!saleYMD.startsWith(selectedMonth)) return false
      } else if (frequency === 'yearly') {
        if (!saleYMD.startsWith(selectedYear)) return false
      } else if (frequency === 'custom') {
        if (customStartDate && saleYMD < customStartDate) return false
        if (customEndDate && saleYMD > customEndDate) return false
      }

      // 2. Payment Method Filter
      if (selectedPaymentMethodId !== 'all') {
        if (sale.payment_method_id !== selectedPaymentMethodId) return false
      }

      // 3. Search by concept, items, client name, or receipt details
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
    frequency,
    selectedDay,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    selectedPaymentMethodId,
    searchConcept,
  ])

  // Split into Ingresos (paid sales) and Por cobrar (credit sales)
  const incomeSales = useMemo(
    () => periodFilteredSales.filter((s) => s.payment_status === 'paid'),
    [periodFilteredSales]
  )

  const receivableSales = useMemo(
    () => periodFilteredSales.filter((s) => s.payment_status === 'credit'),
    [periodFilteredSales]
  )

  // Summary metrics matching Screenshot 1
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
    startMarkPaidTransition(async () => {
      const res = await markSaleAsPaidAction(saleId)
      if (!res.error) {
        setFeedbackMessage('Venta marcada como Pagada y movida a Ingresos.')
        setTimeout(() => setFeedbackMessage(null), 3500)
        setSelectedSaleDetail(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
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
          <h1 className="text-2xl font-bold tracking-tight">Balance</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sales"
            className="btn btn-primary !min-h-10 px-4 text-xs rounded-xl shadow-lg shadow-accent/20"
          >
            + Nueva venta
          </Link>
        </div>
      </header>

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

      {/* Filter Row matching Screenshot 1 & 2: [Filtrar] [Mensual v] [nov 2026] [Buscar concepto...] */}
      <div className="flex flex-wrap items-center gap-2.5">
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

        {/* Search concept input */}
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
      </div>

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

      {/* 3 Summary Cards matching Screenshot 1: Balance, Ventas totales, Gastos totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Balance */}
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

        {/* Card 2: Ventas totales */}
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

        {/* Card 3: Gastos totales */}
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

      {/* 4 Tabs: Ingresos | Egresos | Por cobrar | Por pagar */}
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
              {/* TAB: INGRESOS */}
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

              {/* TAB: EGRESOS (Empty for now as requested) */}
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

              {/* TAB: POR COBRAR (Shows sales done Al crédito) */}
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

              {/* TAB: POR PAGAR (Empty for now as requested) */}
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

      {/* Sale Detail / Credit Collection Modal when a row is clicked */}
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

            {/* Line Items */}
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
      {/* Concepto */}
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

      {/* Valor */}
      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
        <span className={isCredit ? 'text-warning' : 'text-foreground'}>
          C${formatMoney(sale.total)}
        </span>
      </td>

      {/* Medio de pago */}
      <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
        {sale.payment_method?.name || 'Efectivo'}
        {sale.custom_payment_method ? ` (${sale.custom_payment_method})` : ''}
      </td>

      {/* Fecha y hora */}
      <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap">
        {formatTreintaDateTime(sale.sale_date)}
      </td>
    </tr>
  )
}

