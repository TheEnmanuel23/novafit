'use client'

import { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  PaymentMethod,
  ProductCategory,
  ProductWithDetails,
  SalePaymentStatus,
  SaleWithDetails,
} from '@novafit/types'
import { formatDateTime } from '@novafit/supabase/src/utils/date'
import { getUnitDefinition } from '@novafit/supabase/src/queries/inventory'
import { createSaleAction, deleteSaleAction } from '@/app/actions/sales'
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector'

interface CartItem {
  productId: string
  productName: string
  imageUrl: string | null
  unitLabel: string
  quantity: number
  unitPrice: number
  unitCost: number
  stockAvailable: number
}

interface ClientOption {
  id: string
  member_id: string
  name: string
  username: string
  phone: string | null
}

interface StaffOption {
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

const PRESET_INSTALLMENTS = [1, 2, 3, 4, 5, 6] as const

export function SalesView({
  initialProducts,
  initialCategories,
  paymentMethods,
  clients,
  staffList,
  currentStaff,
  initialSales,
  defaultTodayYMD,
  permissions,
}: {
  initialProducts: ProductWithDetails[]
  initialCategories: ProductCategory[]
  paymentMethods: PaymentMethod[]
  clients: ClientOption[]
  staffList: StaffOption[]
  currentStaff: StaffOption
  initialSales: SaleWithDetails[]
  defaultTodayYMD: string
  permissions: {
    canView: boolean
    canCreate: boolean
    canDelete: boolean
  }
}) {
  const router = useRouter()

  // Active tab: 'products' (Venta de productos) | 'free' (Venta libre) | 'history' (Historial de ventas)
  const [activeTab, setActiveTab] = useState<'products' | 'free' | 'history'>(
    permissions.canCreate ? 'products' : 'history'
  )

  // Step 0: Filters (identical to Inventory products list)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Cart state for product sales
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)

  // Free sale (Venta libre) state
  const [freeAmountStr, setFreeAmountStr] = useState('')
  const [freeConcept, setFreeConcept] = useState('')

  // Checkout Modal ("Continuar") state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [saleDateYMD, setSaleDateYMD] = useState(defaultTodayYMD)
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>('paid')
  const [installmentPreset, setInstallmentPreset] = useState<number | 'other'>(1)
  const [customInstallmentsStr, setCustomInstallmentsStr] = useState('7')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>(
    paymentMethods[0]?.id || ''
  )
  const [customPaymentMethodText, setCustomPaymentMethodText] = useState('')
  const [assignedStaffId, setAssignedStaffId] = useState<string>(currentStaff.id)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [clientSearch, setClientSearch] = useState('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const clientSearchInputRef = useRef<HTMLInputElement>(null)
  const [discountStr, setDiscountStr] = useState('0')
  const [receiptName, setReceiptName] = useState('')
  const [receiptDetails, setReceiptDetails] = useState('')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node)
      ) {
        setIsClientDropdownOpen(false)
      }
    }
    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      setTimeout(() => clientSearchInputRef.current?.focus(), 0)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isClientDropdownOpen])

  const selectedClient = useMemo(() => {
    if (!selectedMemberId) return null
    return clients.find((c) => c.member_id === selectedMemberId) || null
  }, [clients, selectedMemberId])

  // Feedback & transitions
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)
  const [isSubmittingSale, startSaleTransition] = useTransition()

  // Delete sale confirmation state
  const [saleToDelete, setSaleToDelete] = useState<SaleWithDetails | null>(null)
  const [isDeletingSale, startDeleteSaleTransition] = useTransition()

  // Filter products sorted by name, combining search + selected category
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return [...initialProducts]
      .filter((p) => {
        if (selectedCategory === 'out_of_stock') {
          if (Number(p.quantity_available) > 0) return false
        } else if (selectedCategory !== 'all') {
          if (p.category_id !== selectedCategory) return false
        }

        if (q) {
          const matchesName = p.name.toLowerCase().includes(q)
          const matchesBarcode = (p.barcode || '').toLowerCase().includes(q)
          if (!matchesName && !matchesBarcode) return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [initialProducts, searchQuery, selectedCategory])

  // Filtered clients for client selector dropdown
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    )
  }, [clients, clientSearch])

  // Click a product card -> add to cart (or focus it in the top/bottom panel)
  const handleSelectProduct = (product: ProductWithDetails) => {
    setFeedbackError(null)
    const existing = cart.find((item) => item.productId === product.id)
    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Number((item.quantity + 1).toFixed(2)) }
            : item
        )
      )
    } else {
      const unitDef = getUnitDefinition(product.unit)
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        imageUrl: product.images?.[0]?.image_url || null,
        unitLabel: unitDef.shortLabel,
        quantity: 1,
        unitPrice: Number(product.price),
        unitCost: Number(product.cost),
        stockAvailable: Number(product.quantity_available),
      }
      setCart((prev) => [newItem, ...prev])
    }
    setActiveProductId(product.id)
  }

  const updateCartItemQuantity = (productId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId))
      if (activeProductId === productId) {
        setActiveProductId(null)
      }
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Number(nextQty.toFixed(2)) }
          : item
      )
    )
  }

  const updateCartItemPrice = (productId: string, nextPrice: number) => {
    const safePrice = isNaN(nextPrice) || nextPrice < 0 ? 0 : nextPrice
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, unitPrice: safePrice } : item
      )
    )
  }

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
    if (activeProductId === productId) {
      setActiveProductId(null)
    }
  }

  // Subtotal, discount, total calculation
  const isFreeSaleMode = activeTab === 'free'
  const freeAmountNum = Math.max(0, parseFloat(freeAmountStr) || 0)

  const cartSubtotal = useMemo(() => {
    return Number(
      cart
        .reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
        .toFixed(2)
    )
  }, [cart])

  const currentSubtotal = isFreeSaleMode ? freeAmountNum : cartSubtotal
  const discountNum = Math.min(
    currentSubtotal,
    Math.max(0, parseFloat(discountStr) || 0)
  )
  const finalTotal = Number(Math.max(0, currentSubtotal - discountNum).toFixed(2))

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0)
  }, [cart])

  const selectedPaymentMethod = useMemo(() => {
    return paymentMethods.find((pm) => pm.id === selectedPaymentMethodId) || null
  }, [paymentMethods, selectedPaymentMethodId])

  const handleOpenCheckout = () => {
    setFeedbackError(null)
    if (isFreeSaleMode) {
      if (freeAmountNum <= 0) {
        setFeedbackError('Ingresa un monto mayor a C$ 0 para continuar con la venta libre.')
        return
      }
    } else {
      if (cart.length === 0) {
        setFeedbackError('Selecciona al menos un producto de la lista para continuar.')
        return
      }
    }

    setSaleDateYMD(defaultTodayYMD)
    setIsCheckoutOpen(true)
  }

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackError(null)

    const resolvedInstallments =
      installmentPreset === 'other'
        ? Math.max(1, parseInt(customInstallmentsStr, 10) || 1)
        : installmentPreset

    startSaleTransition(async () => {
      const res = await createSaleAction({
        saleType: isFreeSaleMode ? 'free' : 'products',
        saleDateYMD,
        paymentStatus,
        installmentsCount: resolvedInstallments,
        paymentMethodId: selectedPaymentMethodId,
        customPaymentMethod:
          selectedPaymentMethod?.key === 'other' ? customPaymentMethodText : undefined,
        assignedStaffId,
        memberId: selectedMemberId || null,
        discount: discountNum,
        receiptName: receiptName.trim() || undefined,
        receiptDetails: receiptDetails.trim() || undefined,
        items: isFreeSaleMode
          ? []
          : cart.map((c) => ({
              productId: c.productId,
              productName: c.productName,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              unitCost: c.unitCost,
            })),
        freeSaleAmount: isFreeSaleMode ? freeAmountNum : undefined,
        freeSaleConcept: isFreeSaleMode
          ? freeConcept.trim() || receiptName.trim() || 'Venta libre'
          : undefined,
      })

      if (res.error) {
        setFeedbackError(res.error)
      } else {
        // Reset state
        setCart([])
        setActiveProductId(null)
        setIsCartDrawerOpen(false)
        setFreeAmountStr('')
        setFreeConcept('')
        setDiscountStr('0')
        setReceiptName('')
        setReceiptDetails('')
        setSelectedMemberId('')
        setPaymentStatus('paid')
        setInstallmentPreset(1)
        setIsCheckoutOpen(false)
        setFeedbackSuccess('¡Venta registrada exitosamente e inventario actualizado!')
        setTimeout(() => setFeedbackSuccess(null), 4000)
        router.refresh()
      }
    })
  }

  const handleConfirmDeleteSale = () => {
    if (!saleToDelete) return
    const targetId = saleToDelete.id
    startDeleteSaleTransition(async () => {
      const res = await deleteSaleAction(targetId, true)
      if (res.error) {
        setFeedbackError(res.error)
      } else {
        setSaleToDelete(null)
        setFeedbackSuccess('Venta anulada y stock restaurado.')
        setTimeout(() => setFeedbackSuccess(null), 3500)
        router.refresh()
      }
    })
  }

  // Active item highlighted at the top/side panel on mobile-first
  const activeCartItem = useMemo(() => {
    if (activeProductId) {
      const found = cart.find((c) => c.productId === activeProductId)
      if (found) return found
    }
    return cart[0] || null
  }, [cart, activeProductId])

  return (
    <div className="flex flex-col gap-5">
      {/* Header + Mode Switcher */}
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
            <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
            <p className="text-xs text-muted-foreground">
              Punto de venta, venta libre e historial
            </p>
          </div>
        </div>

        {/* Mode Segmented Tabs */}
        <div className="grid grid-cols-3 bg-surface p-1 rounded-xl border border-border w-full sm:w-auto">
          {permissions.canCreate && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-accent text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Productos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('free')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'free'
                    ? 'bg-accent text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Venta libre
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-accent text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Historial ({initialSales.length})
          </button>
        </div>
      </header>

      {/* Feedback Banner */}
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

      {feedbackSuccess && (
        <div className="bg-success/15 border border-success/30 text-success px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{feedbackSuccess}</span>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── TAB 1: PRODUCT SALES (Mobile-First Grid + Active Item Panel + Sticky Bottom Bar) ─── */}
      {activeTab === 'products' && permissions.canCreate && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Main Area: Filters + Product Grid with Pictures */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            {/* Step 0: Filters identical to Inventory (Search by name + clickable category pills) */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar producto por nombre..."
                  className="input !min-h-11 pl-10 pr-9 py-2 text-sm rounded-xl bg-surface border-border"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Clickable Categories Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCategory === 'all'
                      ? 'bg-warning text-black border-warning shadow-sm'
                      : 'bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border'
                  }`}
                >
                  Ver todos
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('out_of_stock')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCategory === 'out_of_stock'
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border'
                  }`}
                >
                  Sin stock
                </button>

                {initialCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-warning text-black border-warning shadow-sm'
                          : 'bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mobile-First Active Selected Product Control Card (Top panel when a product is clicked) */}
            {activeCartItem && (
              <div className="lg:hidden glass p-4 rounded-2xl border-2 border-accent/60 bg-accent/10 flex flex-col gap-3 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {activeCartItem.imageUrl ? (
                      <img
                        src={activeCartItem.imageUrl}
                        alt={activeCartItem.productName}
                        className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-accent/25 text-accent font-bold flex items-center justify-center shrink-0">
                        {activeCartItem.productName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                        Producto seleccionado
                      </span>
                      <h3 className="font-bold text-sm truncate">
                        {activeCartItem.productName}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCartItem(activeCartItem.productId)}
                    className="text-xs text-error hover:underline font-semibold shrink-0"
                  >
                    Quitar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Quantity with - and + icons */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Cantidad ({activeCartItem.unitLabel})
                    </span>
                    <div className="flex items-center justify-between bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQuantity(
                            activeCartItem.productId,
                            activeCartItem.quantity - 1
                          )
                        }
                        aria-label="Disminuir cantidad"
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={activeCartItem.quantity}
                        onChange={(e) =>
                          updateCartItemQuantity(
                            activeCartItem.productId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-14 text-center bg-transparent font-bold text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQuantity(
                            activeCartItem.productId,
                            activeCartItem.quantity + 1
                          )
                        }
                        aria-label="Aumentar cantidad"
                        className="w-8 h-8 rounded-lg bg-accent text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Editable Unit Price */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Precio unitario (Editable)
                    </span>
                    <div className="flex items-center bg-black/40 border border-white/15 focus-within:border-accent rounded-xl px-3 py-1.5 h-[46px]">
                      <span className="text-xs font-semibold text-muted-foreground mr-1.5">
                        C$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={activeCartItem.unitPrice}
                        onChange={(e) =>
                          updateCartItemPrice(
                            activeCartItem.productId,
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full bg-transparent font-bold text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Grid with Pictures */}
            {filteredProducts.length === 0 ? (
              <div className="glass p-10 rounded-2xl text-center text-muted-foreground text-sm">
                No se encontraron productos disponibles.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((c) => c.productId === product.id)
                  const primaryImage = product.images?.[0]?.image_url || null
                  const isLowOrZero = Number(product.quantity_available) <= 0

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className={`glass p-3 rounded-2xl text-left flex flex-col gap-2.5 transition-all cursor-pointer relative group hover-lift ${
                        inCart
                          ? 'border-2 border-accent bg-accent/10'
                          : 'border border-border hover:border-white/25'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 z-10 min-w-6 h-6 px-1.5 rounded-full bg-accent text-white font-black text-xs flex items-center justify-center shadow-lg">
                          {inCart.quantity}
                        </span>
                      )}

                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <span className="text-2xl font-black text-accent/70">
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 flex-1 justify-between">
                        <div>
                          <div className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug">
                            {product.name}
                          </div>
                          {product.category && (
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {product.category.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
                          <span className="font-black text-sm text-accent">
                            C${formatMoney(product.price)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isLowOrZero
                                ? 'bg-error/15 text-error'
                                : 'bg-white/5 text-muted-foreground'
                            }`}
                          >
                            {product.quantity_available} disp.
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Side Panel (Desktop sticky panel) + Mobile Drawer for Selected Items */}
          <aside className="lg:col-span-5 xl:col-span-4 glass p-5 rounded-2xl border border-border flex flex-col gap-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-bold text-base">Canasta de venta</h2>
                <p className="text-xs text-muted-foreground">
                  Ajusta cantidad (− / +) y precio unitario
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCart([])
                    setActiveProductId(null)
                  }}
                  className="text-xs text-error hover:underline font-medium cursor-pointer"
                >
                  Vaciar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-50"
                >
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                <span>Toca un producto de la lista para agregarlo a la venta.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                {cart.map((item) => {
                  const isFocused = activeProductId === item.productId
                  return (
                    <div
                      key={item.productId}
                      onClick={() => setActiveProductId(item.productId)}
                      className={`p-3 rounded-xl border transition-colors flex flex-col gap-2.5 ${
                        isFocused
                          ? 'bg-accent/10 border-accent/50'
                          : 'bg-black/30 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-accent/20 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                              {item.productName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Subtotal:{' '}
                              <strong className="text-foreground">
                                C${formatMoney(item.quantity * item.unitPrice)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCartItem(item.productId)
                          }}
                          className="text-muted-foreground hover:text-error p-1 text-xs cursor-pointer"
                          title="Quitar producto"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Stepper with - and + */}
                        <div className="flex items-center justify-between bg-black/50 border border-white/15 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateCartItemQuantity(item.productId, item.quantity - 1)
                            }}
                            aria-label="Disminuir"
                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartItemQuantity(
                                item.productId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center bg-transparent font-bold text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateCartItemQuantity(item.productId, item.quantity + 1)
                            }}
                            aria-label="Aumentar"
                            className="w-7 h-7 rounded-lg bg-accent text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Editable Price */}
                        <div className="flex items-center bg-black/50 border border-white/15 focus-within:border-accent rounded-xl px-2.5 py-1">
                          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                            C$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateCartItemPrice(
                                item.productId,
                                parseFloat(e.target.value)
                              )
                            }
                            aria-label={`Precio de ${item.productName}`}
                            className="w-full bg-transparent font-bold text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="border-t border-border pt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
                </span>
                <span className="text-xl font-black text-success">
                  C${formatMoney(cartSubtotal)}
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className="btn btn-primary w-full rounded-xl shadow-lg shadow-accent/25"
              >
                Continuar
              </button>
            </div>
          </aside>

          {/* Mobile Sticky Bottom Checkout Bar */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[640px] px-4 z-40">
              <div className="bg-[#151722]/95 backdrop-blur-xl border border-accent/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="flex flex-col text-left"
                >
                  <span className="text-[11px] text-accent font-bold flex items-center gap-1">
                    Ver {cart.length} {cart.length === 1 ? 'producto' : 'productos'} (
                    {totalItemsCount} und.) ▲
                  </span>
                  <span className="text-lg font-black text-white">
                    C${formatMoney(cartSubtotal)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="btn btn-primary !min-h-11 px-6 rounded-xl text-sm font-bold shadow-lg shadow-accent/30"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* Mobile Bottom Sheet Drawer when user taps "Ver X productos" */}
          {isCartDrawerOpen && (
            <div
              className="lg:hidden fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
            >
              <div className="bg-[#12131c] border-t border-border rounded-t-3xl p-5 max-h-[82vh] flex flex-col gap-4 animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-base">Productos seleccionados</h3>
                    <p className="text-xs text-muted-foreground">
                      Edita la cantidad o el precio antes de continuar
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted-foreground hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-surface border border-border flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{item.productName}</span>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.productId)}
                          className="text-xs text-error font-semibold"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between bg-black/40 border border-white/15 rounded-xl px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItemQuantity(item.productId, item.quantity - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-white/10 text-white font-bold"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartItemQuantity(
                                item.productId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-14 text-center bg-transparent font-bold text-sm focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItemQuantity(item.productId, item.quantity + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-accent text-white font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center bg-black/40 border border-white/15 rounded-xl px-3 py-1.5">
                          <span className="text-xs text-muted-foreground mr-1.5">C$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateCartItemPrice(
                                item.productId,
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full bg-transparent font-bold text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Subtotal</span>
                    <span className="text-xl font-black text-success">
                      C${formatMoney(cartSubtotal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartDrawerOpen(false)
                      handleOpenCheckout()
                    }}
                    className="btn btn-primary px-8 rounded-xl"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: VENTA LIBRE (Free Sale without selecting an existing product) ─── */}
      {activeTab === 'free' && permissions.canCreate && (
        <div className="max-w-lg mx-auto w-full glass p-6 rounded-2xl border border-border flex flex-col gap-5">
          <div>
            <span className="badge badge-active !text-[10px] mb-2">Venta libre</span>
            <h2 className="text-lg font-bold">Registrar venta sin producto</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registra un ingreso o venta rápida sin descontar un producto del inventario.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="free-amount" className="text-sm font-semibold">
              Valor de la venta (C$) <span className="text-error">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-lg font-bold text-muted-foreground">
                C$
              </span>
              <input
                id="free-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={freeAmountStr}
                onChange={(e) => setFreeAmountStr(e.target.value)}
                placeholder="0.00"
                className="input pl-12 text-xl font-black"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="free-concept" className="text-sm font-semibold">
              Concepto o descripción (Opcional)
            </label>
            <input
              id="free-concept"
              type="text"
              value={freeConcept}
              onChange={(e) => setFreeConcept(e.target.value)}
              placeholder="Ej. Servicio personalizado, hidratación, pase especial..."
              className="input"
            />
          </div>

          <button
            type="button"
            disabled={freeAmountNum <= 0}
            onClick={handleOpenCheckout}
            className="btn btn-primary w-full rounded-xl shadow-lg shadow-accent/25 mt-2"
          >
            Continuar
          </button>
        </div>
      )}

      {/* ─── TAB 3: SALES HISTORY ─── */}
      {activeTab === 'history' && (
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="overflow-auto max-h-[68dvh] overscroll-contain">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[820px] text-sm">
              <thead>
                <tr className="text-xs font-semibold text-muted-foreground">
                  <th className="sticky top-0 left-0 z-30 bg-[#141621] border-b border-r border-white/10 py-3.5 px-3 sm:px-4 min-w-[130px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                    Fecha
                  </th>
                  <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[190px]">
                    Comprobante / Productos
                  </th>
                  <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[130px]">
                    Cliente
                  </th>
                  <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[140px]">
                    Método / Pagos
                  </th>
                  <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[100px]">
                    Estado
                  </th>
                  <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[125px]">
                    Vendedor
                  </th>
                  <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-4 min-w-[120px] text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {initialSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No hay ventas registradas todavía.
                    </td>
                  </tr>
                ) : (
                  initialSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="sticky left-0 z-10 bg-[#10121b] group-hover:bg-[#171925] transition-colors border-b border-r border-white/10 py-3 px-3 sm:px-4 whitespace-nowrap text-xs text-muted-foreground shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                        {formatDateTime(sale.sale_date)}
                      </td>
                      <td className="border-b border-border py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>
                              {sale.receipt_name ||
                                (sale.sale_type === 'free'
                                  ? 'Venta libre'
                                  : `Venta (${sale.items.length})`)}
                            </span>
                            {sale.sale_type === 'free' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold">
                                Libre
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sale.items
                              .map((i) => `${i.quantity}x ${i.product_name}`)
                              .join(', ')}
                          </div>
                          {sale.receipt_details && (
                            <div className="text-[11px] text-muted-foreground/80 italic">
                              {sale.receipt_details}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-border py-3 px-3 text-xs">
                        {sale.member ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {sale.member.name}
                            </div>
                            <div className="text-muted-foreground">
                              {sale.member.username}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Cliente general</span>
                        )}
                      </td>
                      <td className="border-b border-border py-3 px-3 text-xs">
                        <div className="font-medium text-foreground">
                          {sale.payment_method?.name || 'Efectivo'}
                          {sale.custom_payment_method
                            ? ` (${sale.custom_payment_method})`
                            : ''}
                        </div>
                        <div className="text-muted-foreground">
                          {sale.installments_count}{' '}
                          {sale.installments_count === 1 ? 'pago' : 'pagos'}
                        </div>
                      </td>
                      <td className="border-b border-border py-3 px-3">
                        {sale.payment_status === 'paid' ? (
                          <span className="badge badge-active !text-[11px]">Pagada</span>
                        ) : (
                          <span className="badge badge-warning !text-[11px]">
                            A crédito
                          </span>
                        )}
                      </td>
                      <td className="border-b border-border py-3 px-3 text-xs">
                        <div className="font-medium">
                          {sale.assigned_staff?.name || 'Staff'}
                        </div>
                        {sale.creator &&
                          sale.assigned_staff &&
                          sale.creator.id !== sale.assigned_staff.id && (
                            <div className="text-[10px] text-muted-foreground">
                              Reg. por {sale.creator.name}
                            </div>
                          )}
                      </td>
                      <td className="border-b border-border py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <div className="flex items-center justify-end gap-2.5">
                          <div>
                            <div className="font-black text-sm text-success">
                              C${formatMoney(sale.total)}
                            </div>
                            {sale.discount > 0 && (
                              <div className="text-[10px] text-warning">
                                Desc: -C${formatMoney(sale.discount)}
                              </div>
                            )}
                          </div>
                          {permissions.canDelete && (
                            <button
                              type="button"
                              onClick={() => setSaleToDelete(sale)}
                              title="Anular venta"
                              className="text-muted-foreground hover:text-error p-1 cursor-pointer"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
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
      )}

      {/* ─── CHECKOUT MODAL ("Continuar" Step) ─── */}
      {isCheckoutOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90dvh] overflow-y-auto overscroll-contain flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 id="checkout-modal-title" className="text-lg font-bold">
                  Confirmar venta
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isFreeSaleMode
                    ? 'Venta libre'
                    : `${cart.length} ${
                        cart.length === 1 ? 'producto' : 'productos'
                      } seleccionados`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="flex flex-col gap-4">
              {/* 1. Toggle Pagada / A Crédito */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado de la venta
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-border">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('paid')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentStatus === 'paid'
                        ? 'bg-success text-white shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>✓ Pagada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('credit')}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentStatus === 'credit'
                        ? 'bg-warning text-black shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>A Crédito</span>
                  </button>
                </div>
              </div>

              {/* 2. Current Date by default */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sale_date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fecha de la venta
                </label>
                <input
                  id="sale_date"
                  type="date"
                  required
                  value={saleDateYMD}
                  onChange={(e) => setSaleDateYMD(e.target.value)}
                  className="input !min-h-11 text-sm"
                />
              </div>

              {/* 3. Amount of payments: 1, 2, 3, 4, 5, 6, Otro (input text) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cantidad de pagos
                </span>
                <div className="grid grid-cols-7 gap-1.5">
                  {PRESET_INSTALLMENTS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setInstallmentPreset(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        installmentPreset === num
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInstallmentPreset('other')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      installmentPreset === 'other'
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Otro
                  </button>
                </div>

                {installmentPreset === 'other' && (
                  <div className="mt-1">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customInstallmentsStr}
                      onChange={(e) => setCustomInstallmentsStr(e.target.value)}
                      placeholder="Ingresa el número de pagos..."
                      className="input !min-h-10 text-sm"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 4. Method of payment (1-click cards with icon above label, from payment_methods table) */}
              <PaymentMethodSelector
                paymentMethods={paymentMethods}
                selectedId={selectedPaymentMethodId}
                onSelect={setSelectedPaymentMethodId}
                customValue={customPaymentMethodText}
                onCustomChange={setCustomPaymentMethodText}
              />

              {/* 5. Assign Employee (defaults to signed-in user, editable on their behalf) */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="assigned_staff"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Empleado asignado
                </label>
                <div className="relative">
                  <select
                    id="assigned_staff"
                    value={assignedStaffId}
                    onChange={(e) => setAssignedStaffId(e.target.value)}
                    className="input !min-h-11 text-sm appearance-none pr-10 cursor-pointer"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.username})
                        {st.id === currentStaff.id ? ' — Tú' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                    ▼
                  </div>
                </div>
              </div>

              {/* 6. Single searchable dropdown to select the client */}
              <div className="flex flex-col gap-1.5" ref={clientDropdownRef}>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cliente (Opcional)
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsClientDropdownOpen((prev) => !prev)
                      if (!isClientDropdownOpen) {
                        setClientSearch('')
                      }
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isClientDropdownOpen}
                    className="input !min-h-11 text-sm flex items-center justify-between text-left cursor-pointer"
                  >
                    <span
                      className={`truncate ${
                        selectedClient ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {selectedClient
                        ? `${selectedClient.name} — ${selectedClient.username}`
                        : 'Cliente general (Sin seleccionar)'}
                    </span>
                    <span
                      className={`text-muted-foreground text-xs transition-transform duration-150 ${
                        isClientDropdownOpen ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {isClientDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 z-50 bg-[#151722] border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                      {/* Built-in search box inside the dropdown */}
                      <div className="p-2 border-b border-border bg-black/30 relative">
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
                          className="absolute left-4.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                          ref={clientSearchInputRef}
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Buscar cliente por nombre, código o teléfono..."
                          className="w-full bg-surface border border-border focus:border-accent rounded-xl pl-8 pr-7 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none"
                        />
                        {clientSearch && (
                          <button
                            type="button"
                            onClick={() => setClientSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div
                        role="listbox"
                        className="max-h-56 overflow-y-auto divide-y divide-white/5"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={!selectedMemberId}
                          onClick={() => {
                            setSelectedMemberId('')
                            setIsClientDropdownOpen(false)
                            setClientSearch('')
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            !selectedMemberId
                              ? 'bg-accent/20 text-accent font-bold'
                              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                          }`}
                        >
                          <span>Cliente general (Sin seleccionar)</span>
                          {!selectedMemberId && <span>✓</span>}
                        </button>

                        {filteredClients.length === 0 ? (
                          <div className="px-3.5 py-4 text-center text-xs text-muted-foreground">
                            No se encontraron clientes con &ldquo;{clientSearch}&rdquo;
                          </div>
                        ) : (
                          filteredClients.map((client) => {
                            const isSelected = selectedMemberId === client.member_id
                            return (
                              <button
                                key={client.member_id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSelectedMemberId(client.member_id)
                                  setIsClientDropdownOpen(false)
                                  setClientSearch('')
                                }}
                                className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-accent/20 text-accent font-bold'
                                    : 'text-foreground hover:bg-white/5'
                                }`}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate font-medium">
                                    {client.name}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {client.username}
                                    {client.phone ? ` • ${client.phone}` : ''}
                                  </span>
                                </div>
                                {isSelected && <span className="ml-2">✓</span>}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Nombre del comprobante & Detalle del comprobante */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="receipt_name"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Nombre del comprobante
                  </label>
                  <input
                    id="receipt_name"
                    type="text"
                    value={receiptName}
                    onChange={(e) => setReceiptName(e.target.value)}
                    placeholder="Ej. Comprobante #001 o nombre en recibo..."
                    className="input !min-h-11 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="receipt_details"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Detalle del comprobante
                  </label>
                  <textarea
                    id="receipt_details"
                    rows={2}
                    value={receiptDetails}
                    onChange={(e) => setReceiptDetails(e.target.value)}
                    placeholder="Notas o detalles adicionales del comprobante..."
                    className="input min-h-[70px] py-2.5 text-sm resize-y"
                  />
                </div>
              </div>

              {/* 8. Discount field and Total with discount */}
              <div className="p-4 rounded-2xl bg-black/40 border border-border flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-bold text-foreground">
                    C${formatMoney(currentSubtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="discount_input" className="text-xs font-semibold">
                    Descuento (C$)
                  </label>
                  <div className="flex items-center bg-surface border border-border focus-within:border-accent rounded-xl px-3 py-1.5 w-36">
                    <span className="text-xs text-muted-foreground mr-1.5">C$</span>
                    <input
                      id="discount_input"
                      type="number"
                      step="0.01"
                      min="0"
                      max={currentSubtotal}
                      value={discountStr}
                      onChange={(e) => setDiscountStr(e.target.value)}
                      className="w-full bg-transparent text-right font-bold text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Total con descuento</span>
                  <span className="text-2xl font-black text-success">
                    C${formatMoney(finalTotal)}
                  </span>
                </div>

                {installmentPreset !== 1 && (
                  <div className="text-[11px] text-muted-foreground text-right">
                    {installmentPreset === 'other'
                      ? Math.max(1, parseInt(customInstallmentsStr, 10) || 1)
                      : installmentPreset}{' '}
                    pagos de{' '}
                    <strong className="text-foreground">
                      C$
                      {formatMoney(
                        finalTotal /
                          (installmentPreset === 'other'
                            ? Math.max(1, parseInt(customInstallmentsStr, 10) || 1)
                            : installmentPreset)
                      )}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSubmittingSale}
                  onClick={() => setIsCheckoutOpen(false)}
                  className="btn btn-ghost flex-1 rounded-xl"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSale}
                  className="btn btn-primary flex-1 rounded-xl shadow-lg shadow-accent/30"
                >
                  {isSubmittingSale ? 'Guardando...' : 'Guardar venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
      {saleToDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">¿Anular esta venta?</h3>
            <p className="text-sm text-muted-foreground">
              Se eliminará el registro de venta por{' '}
              <strong className="text-foreground">
                C${formatMoney(saleToDelete.total)}
              </strong>{' '}
              y se devolverán las unidades vendidas al inventario.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingSale}
                onClick={() => setSaleToDelete(null)}
                className="btn btn-ghost !min-h-10 px-4 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingSale}
                onClick={handleConfirmDeleteSale}
                className="btn btn-error !min-h-10 px-5 text-xs rounded-xl"
              >
                {isDeletingSale ? 'Anulando...' : 'Sí, anular venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

