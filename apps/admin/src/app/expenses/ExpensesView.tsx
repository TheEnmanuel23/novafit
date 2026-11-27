'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type {
  ExpenseCategory,
  ExpensePaymentStatus,
  ExpenseWithDetails,
  PaymentMethod,
} from '@novafit/types'
import { APP_TIMEZONE, toTimezoneYYYYMMDD } from '@novafit/supabase/src/utils/date'
import {
  createExpenseAction,
  createExpenseCategoryAction,
  deleteExpenseAction,
  markExpenseAsPaidAction,
  updateExpenseAction,
} from '@/app/actions/expenses'
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector'

type ExpenseTab = 'new' | 'history'

type StaffOption = {
  id: string
  name: string
  username: string
}

function formatMoney(num: number): string {
  return num.toLocaleString('es-NI', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatExpenseDateTime(dateInput: string | null | undefined): string {
  if (!dateInput) return 'N/A'
  return formatInTimeZone(dateInput, APP_TIMEZONE, "d 'de' MMM 'de' yyyy H:mm", {
    locale: es,
  })
}

export function ExpensesView({
  initialCategories,
  paymentMethods,
  staffList,
  currentStaff,
  initialExpenses,
  defaultTodayYMD,
  permissions,
}: {
  initialCategories: ExpenseCategory[]
  paymentMethods: PaymentMethod[]
  staffList: StaffOption[]
  currentStaff: StaffOption
  initialExpenses: ExpenseWithDetails[]
  defaultTodayYMD: string
  permissions: {
    canView: boolean
    canCreate: boolean
    canDelete: boolean
  }
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ExpenseTab>(
    permissions.canCreate ? 'new' : 'history'
  )

  // Categories state
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isCreatingCategory, startCategoryTransition] = useTransition()

  // New expense form state
  const defaultCashId =
    paymentMethods.find((pm) => pm.key === 'cash')?.id || paymentMethods[0]?.id || ''

  const [paymentStatus, setPaymentStatus] = useState<ExpensePaymentStatus>('paid')
  const [totalStr, setTotalStr] = useState('')
  const [concept, setConcept] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState(defaultCashId)
  const [customPaymentMethod, setCustomPaymentMethod] = useState('')
  const [expenseDateYMD, setExpenseDateYMD] = useState(defaultTodayYMD)
  const [assignedStaffId, setAssignedStaffId] = useState(currentStaff.id)
  const [notes, setNotes] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [isSubmitting, startSubmitTransition] = useTransition()

  // History filters & edit/delete modals
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'credit'>('all')
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithDetails | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [isMutating, startMutateTransition] = useTransition()

  // Edit modal fields
  const [editConcept, setEditConcept] = useState('')
  const [editTotalStr, setEditTotalStr] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editPaymentStatus, setEditPaymentStatus] = useState<ExpensePaymentStatus>('paid')
  const [editPaymentMethodId, setEditPaymentMethodId] = useState(defaultCashId)
  const [editCustomPaymentMethod, setEditCustomPaymentMethod] = useState('')
  const [editExpenseDateYMD, setEditExpenseDateYMD] = useState(defaultTodayYMD)
  const [editAssignedStaffId, setEditAssignedStaffId] = useState(currentStaff.id)
  const [editNotes, setEditNotes] = useState('')

  const selectedPaymentMethod = paymentMethods.find((pm) => pm.id === paymentMethodId)
  const editSelectedPaymentMethod = paymentMethods.find(
    (pm) => pm.id === editPaymentMethodId
  )
  const impactsCashRegister =
    paymentStatus === 'paid' && selectedPaymentMethod?.key === 'cash'

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return initialExpenses.filter((exp) => {
      if (filterCategoryId !== 'all' && exp.category_id !== filterCategoryId) return false
      if (filterStatus !== 'all' && exp.payment_status !== filterStatus) return false
      if (q) {
        const conceptMatch = exp.concept.toLowerCase().includes(q)
        const catMatch = (exp.category?.name || '').toLowerCase().includes(q)
        const staffMatch = (exp.assigned_staff?.name || '').toLowerCase().includes(q)
        const notesMatch = (exp.notes || '').toLowerCase().includes(q)
        if (!conceptMatch && !catMatch && !staffMatch && !notesMatch) return false
      }
      return true
    })
  }, [initialExpenses, searchQuery, filterCategoryId, filterStatus])

  const handleQuickCreateCategory = () => {
    setCategoryError(null)
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setCategoryError('Ingresa el nombre de la categoría.')
      return
    }
    startCategoryTransition(async () => {
      const res = await createExpenseCategoryAction(trimmed)
      if (res.error) {
        setCategoryError(res.error)
      } else if (res.category) {
        setCategories((prev) =>
          [...prev, res.category as ExpenseCategory].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
          )
        )
        setCategoryId(res.category.id)
        setNewCategoryName('')
        setIsAddingCategory(false)
      }
    })
  }

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const amount = parseFloat(totalStr)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.')
      return
    }
    if (!concept.trim()) {
      setFormError('Ingresa el concepto del gasto.')
      return
    }

    startSubmitTransition(async () => {
      const res = await createExpenseAction({
        categoryId: categoryId || null,
        concept: concept.trim(),
        expenseDateYMD,
        paymentStatus,
        paymentMethodId,
        customPaymentMethod:
          selectedPaymentMethod?.key === 'other'
            ? customPaymentMethod.trim()
            : undefined,
        assignedStaffId,
        total: amount,
        notes: notes.trim() || undefined,
      })

      if (res.error) {
        setFormError(res.error)
      } else {
        setTotalStr('')
        setConcept('')
        setNotes('')
        setCustomPaymentMethod('')
        setPaymentStatus('paid')
        setExpenseDateYMD(defaultTodayYMD)
        setFeedbackMessage('¡Gasto registrado correctamente!')
        setTimeout(() => setFeedbackMessage(null), 3500)
        setActiveTab('history')
        router.refresh()
      }
    })
  }

  const openEditModal = (exp: ExpenseWithDetails) => {
    setModalError(null)
    setEditingExpense(exp)
    setEditConcept(exp.concept)
    setEditTotalStr(String(exp.total))
    setEditCategoryId(exp.category_id || '')
    setEditPaymentStatus(exp.payment_status)
    setEditPaymentMethodId(exp.payment_method_id || defaultCashId)
    setEditCustomPaymentMethod(exp.custom_payment_method || '')
    setEditExpenseDateYMD(toTimezoneYYYYMMDD(exp.expense_date, APP_TIMEZONE))
    setEditAssignedStaffId(exp.assigned_staff_id || currentStaff.id)
    setEditNotes(exp.notes || '')
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setModalError(null)
    const amount = parseFloat(editTotalStr)
    if (isNaN(amount) || amount <= 0) {
      setModalError('Ingresa un monto válido mayor a 0.')
      return
    }

    startMutateTransition(async () => {
      const res = await updateExpenseAction({
        expenseId: editingExpense.id,
        categoryId: editCategoryId || null,
        concept: editConcept.trim(),
        expenseDateYMD: editExpenseDateYMD,
        paymentStatus: editPaymentStatus,
        paymentMethodId: editPaymentMethodId,
        customPaymentMethod:
          editSelectedPaymentMethod?.key === 'other'
            ? editCustomPaymentMethod.trim()
            : undefined,
        assignedStaffId: editAssignedStaffId || null,
        total: amount,
        notes: editNotes.trim() || undefined,
      })

      if (res.error) {
        setModalError(res.error)
      } else {
        setEditingExpense(null)
        setFeedbackMessage('Gasto actualizado correctamente.')
        setTimeout(() => setFeedbackMessage(null), 3500)
        router.refresh()
      }
    })
  }

  const handleMarkPaid = (expenseId: string) => {
    setModalError(null)
    startMutateTransition(async () => {
      const res = await markExpenseAsPaidAction(expenseId)
      if (res.error) {
        setFormError(res.error)
      } else {
        setFeedbackMessage('Gasto marcado como Pagado y movido a Egresos.')
        setTimeout(() => setFeedbackMessage(null), 3500)
        router.refresh()
      }
    })
  }

  const handleConfirmDelete = () => {
    if (!expenseToDelete) return
    setModalError(null)
    startMutateTransition(async () => {
      const res = await deleteExpenseAction(expenseToDelete.id)
      if (res.error) {
        setModalError(res.error)
      } else {
        setExpenseToDelete(null)
        setFeedbackMessage('Gasto eliminado correctamente.')
        setTimeout(() => setFeedbackMessage(null), 3500)
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registra egresos, compras y pagos pendientes
            </p>
          </div>
        </div>

        <Link
          href="/balance"
          className="btn btn-ghost !min-h-10 px-4 text-xs rounded-full self-start sm:self-auto"
        >
          Ver Balance / Caja
        </Link>
      </header>

      {/* Segmented Tabs */}
      <div className="grid grid-cols-2 p-1.5 rounded-xl bg-surface border border-border">
        {permissions.canCreate && (
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-error text-white shadow-md shadow-error/25'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            + Nuevo gasto
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            !permissions.canCreate ? 'col-span-2' : ''
          } ${
            activeTab === 'history'
              ? 'bg-accent text-white shadow-md shadow-accent/25'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Historial ({initialExpenses.length})
        </button>
      </div>

      {feedbackMessage && (
        <div className="bg-success/15 border border-success/30 text-success px-4 py-3 rounded-xl text-sm font-semibold">
          {feedbackMessage}
        </div>
      )}

      {/* ─── TAB 1: NEW EXPENSE FORM ─── */}
      {activeTab === 'new' && permissions.canCreate && (
        <form
          onSubmit={handleCreateExpense}
          className="glass p-5 sm:p-6 rounded-2xl border border-border max-w-2xl w-full mx-auto flex flex-col gap-5"
        >
          {formError && (
            <div className="bg-error/15 border border-error/30 text-error px-4 py-3 rounded-xl text-sm font-medium">
              {formError}
            </div>
          )}

          {/* Payment status toggle: Pagada vs Al crédito */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Estado del gasto
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-border">
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  paymentStatus === 'paid'
                    ? 'bg-error text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pagada (Egreso)
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('credit')}
                className={`py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  paymentStatus === 'credit'
                    ? 'bg-warning text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Al crédito (Por pagar)
              </button>
            </div>
          </div>

          {/* Total amount */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense_total" className="text-sm font-semibold">
              Monto total (C$) <span className="text-error">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-lg font-bold text-error pointer-events-none">
                C$
              </span>
              <input
                id="expense_total"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                required
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                placeholder="0.00"
                className="input pl-12 text-2xl font-black tabular-nums h-14"
              />
            </div>
          </div>

          {/* Concept */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense_concept" className="text-sm font-semibold">
              Concepto <span className="text-error">*</span>
            </label>
            <input
              id="expense_concept"
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. Compra de cloro y bolsas, pago de agua..."
              className="input"
            />
          </div>

          {/* Category (with inline quick-create) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="expense_category" className="text-sm font-semibold">
                Categoría
              </label>
              <button
                type="button"
                onClick={() => {
                  setCategoryError(null)
                  setIsAddingCategory((prev) => !prev)
                }}
                className="text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                {isAddingCategory ? 'Cancelar' : '+ Crear categoría'}
              </button>
            </div>

            {isAddingCategory && (
              <div className="p-3 rounded-xl bg-surface border border-accent/40 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la nueva categoría..."
                    className="input !min-h-10 py-1.5 text-sm flex-1"
                  />
                  <button
                    type="button"
                    disabled={isCreatingCategory}
                    onClick={handleQuickCreateCategory}
                    className="btn btn-primary !min-h-10 px-4 text-xs rounded-xl"
                  >
                    {isCreatingCategory ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                {categoryError && (
                  <span className="text-xs text-error">{categoryError}</span>
                )}
              </div>
            )}

            <select
              id="expense_category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input cursor-pointer"
            >
              <option value="">Selecciona una categoría (opcional)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment method (shared squared icon cards from Sales) */}
          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            selectedId={paymentMethodId}
            onSelect={setPaymentMethodId}
            customValue={customPaymentMethod}
            onCustomChange={setCustomPaymentMethod}
            label="Medio de pago"
            required
            headerRight={
              impactsCashRegister ? (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                  Descuenta del efectivo en caja
                </span>
              ) : null
            }
          />

          {/* Date & Who (both editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense_date" className="text-sm font-semibold">
                Fecha
              </label>
              <input
                id="expense_date"
                type="date"
                required
                value={expenseDateYMD}
                onChange={(e) => setExpenseDateYMD(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense_staff" className="text-sm font-semibold">
                Responsable / Quién
              </label>
              <select
                id="expense_staff"
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="input cursor-pointer"
              >
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comments / notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense_notes" className="text-sm font-semibold">
              Comentarios / Detalles (Opcional)
            </label>
            <textarea
              id="expense_notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Proveedor, número de factura, observaciones..."
              className="input min-h-[84px] py-2.5 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-error w-full rounded-xl shadow-lg shadow-error/25 mt-1"
          >
            {isSubmitting ? 'Guardando gasto...' : 'Registrar gasto'}
          </button>
        </form>
      )}

      {/* ─── TAB 2: EXPENSES HISTORY ─── */}
      {activeTab === 'history' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto, categoría, responsable o notas..."
              className="input !min-h-10 py-2 text-sm flex-1"
            />
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="input !min-h-10 py-2 text-xs sm:w-52 cursor-pointer"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | 'paid' | 'credit')
              }
              className="input !min-h-10 py-2 text-xs sm:w-44 cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagados (Egresos)</option>
              <option value="credit">Al crédito (Por pagar)</option>
            </select>
          </div>

          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="overflow-auto max-h-[68dvh] overscroll-contain">
              <table className="w-full text-left border-separate border-spacing-0 min-w-[820px] text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-muted-foreground">
                    <th className="sticky top-0 left-0 z-30 bg-[#141621] border-b border-r border-white/10 py-3.5 px-3 sm:px-4 w-[170px] min-w-[170px] sm:w-[220px] sm:min-w-[220px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                      Concepto / Categoría
                    </th>
                    <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[115px]">
                      Total
                    </th>
                    <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[135px]">
                      Medio de pago
                    </th>
                    <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[110px]">
                      Estado
                    </th>
                    <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[130px]">
                      Responsable
                    </th>
                    <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[165px]">
                      Fecha
                    </th>
                    <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-4 min-w-[140px] text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 px-4 text-center text-muted-foreground"
                      >
                        No hay gastos registrados con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="sticky left-0 z-10 bg-[#10121b] group-hover:bg-[#171925] transition-colors border-b border-r border-white/10 py-3 px-3 sm:px-4 w-[170px] min-w-[170px] max-w-[170px] sm:w-[220px] sm:min-w-[220px] sm:max-w-[240px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {exp.concept}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {exp.category?.name || 'Sin categoría'}
                            </span>
                            {exp.notes && (
                              <span className="text-[10px] text-muted-foreground/80 italic truncate">
                                {exp.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border-b border-border py-3 px-3 font-bold text-error whitespace-nowrap tabular-nums">
                          -C${formatMoney(exp.total)}
                        </td>
                        <td className="border-b border-border py-3 px-3 text-xs whitespace-nowrap">
                          {exp.payment_method?.name || 'Efectivo'}
                          {exp.custom_payment_method
                            ? ` (${exp.custom_payment_method})`
                            : ''}
                        </td>
                        <td className="border-b border-border py-3 px-3 whitespace-nowrap">
                          {exp.payment_status === 'paid' ? (
                            <span className="badge badge-expired !text-[10px]">
                              Pagado
                            </span>
                          ) : (
                            <span className="badge badge-warning !text-[10px]">
                              Por pagar
                            </span>
                          )}
                        </td>
                        <td className="border-b border-border py-3 px-3 text-xs whitespace-nowrap">
                          {exp.assigned_staff?.name || 'Staff'}
                        </td>
                        <td className="border-b border-border py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatExpenseDateTime(exp.expense_date)}
                        </td>
                        <td className="border-b border-border py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            {exp.payment_status === 'credit' && permissions.canCreate && (
                              <button
                                type="button"
                                disabled={isMutating}
                                onClick={() => handleMarkPaid(exp.id)}
                                className="text-xs font-semibold text-success hover:underline cursor-pointer"
                              >
                                Pagar
                              </button>
                            )}
                            {permissions.canCreate && (
                              <button
                                type="button"
                                onClick={() => openEditModal(exp)}
                                className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                              >
                                Editar
                              </button>
                            )}
                            {permissions.canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalError(null)
                                  setExpenseToDelete(exp)
                                }}
                                className="text-xs font-semibold text-error hover:underline cursor-pointer"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Editar gasto</h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-muted-foreground hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="bg-error/15 border border-error/30 text-error px-3.5 py-2.5 rounded-xl text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground font-semibold">Concepto *</label>
                <input
                  type="text"
                  required
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  className="input !min-h-10 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">
                    Total (C$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editTotalStr}
                    onChange={(e) => setEditTotalStr(e.target.value)}
                    className="input !min-h-10 py-1.5 text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">Estado</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) =>
                      setEditPaymentStatus(e.target.value as ExpensePaymentStatus)
                    }
                    className="input !min-h-10 py-1.5 text-xs"
                  >
                    <option value="paid">Pagado (Egreso)</option>
                    <option value="credit">Al crédito (Por pagar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">Categoría</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="input !min-h-10 py-1.5 text-xs"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">
                    Medio de pago
                  </label>
                  <select
                    value={editPaymentMethodId}
                    onChange={(e) => setEditPaymentMethodId(e.target.value)}
                    className="input !min-h-10 py-1.5 text-xs"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editSelectedPaymentMethod?.key === 'other' && (
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">
                    Especificar medio de pago
                  </label>
                  <input
                    type="text"
                    value={editCustomPaymentMethod}
                    onChange={(e) => setEditCustomPaymentMethod(e.target.value)}
                    className="input !min-h-10 py-1.5 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">Fecha</label>
                  <input
                    type="date"
                    required
                    value={editExpenseDateYMD}
                    onChange={(e) => setEditExpenseDateYMD(e.target.value)}
                    className="input !min-h-10 py-1.5 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-semibold">
                    Responsable
                  </label>
                  <select
                    value={editAssignedStaffId}
                    onChange={(e) => setEditAssignedStaffId(e.target.value)}
                    className="input !min-h-10 py-1.5 text-xs"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-muted-foreground font-semibold">
                  Comentarios
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="input !min-h-[60px] py-2 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => setEditingExpense(null)}
                  className="btn btn-ghost !min-h-10 px-4 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="btn btn-primary !min-h-10 px-5 text-xs rounded-xl"
                >
                  {isMutating ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">¿Eliminar este gasto?</h3>
            <p className="text-sm text-muted-foreground">
              Se eliminará el gasto{' '}
              <strong className="text-foreground">{expenseToDelete.concept}</strong> por{' '}
              <strong className="text-error">
                C${formatMoney(expenseToDelete.total)}
              </strong>
              .
            </p>
            {modalError && (
              <div className="bg-error/15 border border-error/30 text-error px-3.5 py-2.5 rounded-xl text-xs font-medium">
                {modalError}
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setExpenseToDelete(null)}
                className="btn btn-ghost !min-h-10 px-4 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleConfirmDelete}
                className="btn btn-error !min-h-10 px-5 text-xs rounded-xl"
              >
                {isMutating ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

