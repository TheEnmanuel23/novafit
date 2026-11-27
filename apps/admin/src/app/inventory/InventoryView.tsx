'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  ProductCategory,
  ProductHistory,
  ProductWithDetails,
} from '@novafit/types'
import { formatDateTime } from '@novafit/supabase/src/utils/date'
import { getUnitDefinition } from '@novafit/supabase/src/queries/inventory'
import {
  updateProductInlineAction,
  deleteProductAction,
  createProductCategoryAction,
  deleteProductCategoryAction,
  fetchProductHistoryAction,
} from '@/app/actions/inventory'

interface InventoryPermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre del producto',
  description: 'Descripción',
  price: 'Precio de venta',
  cost: 'Costo',
  quantity_available: 'Cantidad disponible',
  low_stock_threshold: 'Alerta de unidades bajas',
  unit: 'Unidad de medida',
  category_id: 'Categoría',
  barcode: 'Código de barras',
  sku: 'SKU',
  show_in_catalog: 'Mostrar en catálogo virtual',
  images: 'Imágenes',
  deleted: 'Estado de eliminación',
}

function formatCurrencyValue(num: number): string {
  return num.toLocaleString('es-NI', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatHistoryValue(fieldName: string | null, val: string | null): string {
  if (val === null || val === '') return 'Vacío'
  if (fieldName === 'price' || fieldName === 'cost') {
    const num = Number(val)
    if (!isNaN(num)) return `C$ ${formatCurrencyValue(num)}`
  }
  if (fieldName === 'unit') {
    return getUnitDefinition(val).label
  }
  if (fieldName === 'show_in_catalog') {
    return val === 'true' ? 'Sí' : 'No'
  }
  return val
}

export function InventoryView({
  initialProducts,
  initialCategories,
  permissions,
}: {
  initialProducts: ProductWithDetails[]
  initialCategories: ProductCategory[]
  permissions: InventoryPermissions
}) {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithDetails[]>(initialProducts)
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)

  // Categories modal state
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDesc, setNewCategoryDesc] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isPendingCategory, startCategoryTransition] = useTransition()

  // History modal state
  const [historyProduct, setHistoryProduct] = useState<ProductWithDetails | null>(null)
  const [historyEntries, setHistoryEntries] = useState<ProductHistory[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Delete product confirmation modal
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null)
  const [isDeletingProduct, startDeleteTransition] = useTransition()

  // Sync when server props refresh
  useMemo(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  useMemo(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  // Summary metrics
  const totalReferences = products.length
  const totalInventoryCost = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = Math.max(0, Number(p.quantity_available) || 0)
      const cost = Math.max(0, Number(p.cost) || 0)
      return sum + qty * cost
    }, 0)
  }, [products])

  // Filtered and sorted products (always sorted by name A-Z, combined search + selected category)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return [...products]
      .filter((p) => {
        // Category filter applies regardless of whether search field is populated
        if (selectedCategory === 'out_of_stock') {
          if (Number(p.quantity_available) > 0) return false
        } else if (selectedCategory !== 'all') {
          if (p.category_id !== selectedCategory) return false
        }

        // Name search filter
        if (q) {
          const matchesName = p.name.toLowerCase().includes(q)
          const matchesBarcode = (p.barcode || '').toLowerCase().includes(q)
          if (!matchesName && !matchesBarcode) return false
        }
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [products, searchQuery, selectedCategory])

  const handleOpenHistory = async (product: ProductWithDetails) => {
    setHistoryProduct(product)
    setHistoryEntries([])
    setHistoryError(null)
    setIsHistoryLoading(true)

    const res = await fetchProductHistoryAction(product.id)
    setIsHistoryLoading(false)
    if (res.error) {
      setHistoryError(res.error)
    } else {
      setHistoryEntries(res.history || [])
    }
  }

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    setCategoryError(null)
    if (!newCategoryName.trim()) {
      setCategoryError('El nombre de la categoría es obligatorio.')
      return
    }

    startCategoryTransition(async () => {
      const res = await createProductCategoryAction(newCategoryName, newCategoryDesc)
      if (res.error) {
        setCategoryError(res.error)
      } else if (res.category) {
        setCategories((prev) =>
          [...prev, res.category].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
          )
        )
        setNewCategoryName('')
        setNewCategoryDesc('')
        router.refresh()
      }
    })
  }

  const handleDeleteCategory = (catId: string) => {
    setCategoryError(null)
    startCategoryTransition(async () => {
      const res = await deleteProductCategoryAction(catId)
      if (res.error) {
        setCategoryError(res.error)
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== catId))
        if (selectedCategory === catId) {
          setSelectedCategory('all')
        }
        router.refresh()
      }
    })
  }

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return
    const targetId = productToDelete.id
    const targetName = productToDelete.name
    setFeedbackError(null)

    startDeleteTransition(async () => {
      const res = await deleteProductAction(targetId)
      if (res.error) {
        setFeedbackError(res.error)
        setProductToDelete(null)
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== targetId))
        setProductToDelete(null)
        setFeedbackSuccess(`Producto "${targetName}" eliminado del inventario.`)
        setTimeout(() => setFeedbackSuccess(null), 3500)
        router.refresh()
      }
    })
  }

  const handleInlineSave = async (
    productId: string,
    field: 'price' | 'cost' | 'quantity_available',
    newValue: number
  ) => {
    setFeedbackError(null)
    const target = products.find((p) => p.id === productId)
    if (!target) return false

    const oldValue = Number(target[field])
    if (oldValue === newValue) return true

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: newValue } : p))
    )

    const res = await updateProductInlineAction(productId, field, newValue)
    if (res.error) {
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, [field]: oldValue } : p))
      )
      setFeedbackError(res.error)
      return false
    }

    router.refresh()
    return true
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header matching Treinta.co */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
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
            <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
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
                <rect width="16" height="20" x="4" y="2" rx="2" />
                <line x1="8" x2="16" y1="6" y2="6" />
                <line x1="8" x2="16" y1="10" y2="10" />
                <line x1="8" x2="12" y1="14" y2="14" />
              </svg>
              <span>Total de referencias</span>
              <strong className="text-foreground font-bold">{totalReferences}</strong>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5">
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
                <rect width="20" height="12" x="2" y="6" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
              <span>Costo total de inventario</span>
              <strong className="text-foreground font-bold">
                C${formatCurrencyValue(totalInventoryCost)}
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {(permissions.canCreate || permissions.canEdit) && (
            <button
              type="button"
              onClick={() => {
                setCategoryError(null)
                setIsCategoriesModalOpen(true)
              }}
              className="btn btn-ghost !min-h-11 px-4 text-sm rounded-xl border border-border-strong hover:border-accent"
            >
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
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <circle cx="6.5" cy="17.5" r="3.5" />
              </svg>
              Categorías
            </button>
          )}

          {permissions.canCreate && (
            <Link
              href="/inventory/new"
              className="btn btn-primary !min-h-11 px-5 text-sm rounded-xl shadow-lg shadow-accent/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Crear productos
            </Link>
          )}
        </div>
      </header>

      {/* Alerts */}
      {feedbackError && (
        <div className="bg-error/15 border border-error/30 text-error px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{feedbackError}</span>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="text-error/80 hover:text-error font-bold ml-4"
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
            className="text-success/80 hover:text-success font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full max-w-md">
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
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="input !min-h-11 pl-10 pr-9 py-2 text-sm rounded-xl bg-surface border-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Clickable Category Filter Pills */}
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
              selectedCategory === 'out_of_stock'
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border'
            }`}
          >
            <span>Sin stock</span>
          </button>

          {categories.map((cat) => {
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

          {(permissions.canCreate || permissions.canEdit) && (
            <button
              type="button"
              onClick={() => {
                setCategoryError(null)
                setIsCategoriesModalOpen(true)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-accent-subtle text-accent hover:bg-accent/25 border border-accent/30 transition-all cursor-pointer flex items-center gap-1"
              title="Agregar nueva categoría"
            >
              <span>+ Categoría</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="glass overflow-hidden rounded-2xl border border-border">
        <div className="overflow-auto max-h-[68dvh] overscroll-contain">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[840px] sm:min-w-[940px]">
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground">
                <th className="sticky top-0 left-0 z-30 bg-[#141621] border-b border-r border-white/10 py-3.5 px-3 sm:px-4 w-[148px] min-w-[148px] max-w-[148px] sm:w-[230px] sm:min-w-[230px] sm:max-w-[260px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                  <div className="flex items-center gap-1.5">
                    <span>Producto</span>
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-muted-foreground/40 text-[10px] shrink-0"
                      title="Haz clic en el nombre para editar los detalles del producto"
                    >
                      i
                    </span>
                  </div>
                </th>
                <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[136px]">
                  Precio
                </th>
                <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[136px]">
                  Costo
                </th>
                <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[108px]">
                  <span className="block leading-tight">
                    Cantidad
                    <br />
                    disponible
                  </span>
                </th>
                <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[110px]">
                  Ganancia
                </th>
                <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-3 min-w-[76px]">
                  %
                </th>
                <th className="sticky top-0 z-20 bg-[#141621] border-b border-border py-3.5 px-4 min-w-[136px] text-right">
                  Historial
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-muted-foreground">
                    {products.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <p>No hay productos registrados en el inventario todavía.</p>
                        {permissions.canCreate && (
                          <Link
                            href="/inventory/new"
                            className="btn btn-primary !min-h-10 px-4 text-xs rounded-xl"
                          >
                            + Crear primer producto
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p>No se encontraron productos con los filtros seleccionados.</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <ProductTableRow
                    key={product.id}
                    product={product}
                    canEdit={permissions.canEdit}
                    canDelete={permissions.canDelete}
                    onInlineSave={handleInlineSave}
                    onOpenHistory={() => handleOpenHistory(product)}
                    onRequestDelete={() => setProductToDelete(product)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Categories Management Modal */}
      {isCategoriesModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="categories-modal-title"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 id="categories-modal-title" className="text-lg font-bold">
                  Categorías de productos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Crea o administra las categorías del inventario
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="text-muted-foreground hover:text-white p-1"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {categoryError && (
              <div className="bg-error/15 border border-error/30 text-error px-3 py-2 rounded-xl text-xs">
                {categoryError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="flex flex-col gap-3">
              <div className="input-group">
                <label className="input-label !mb-1" htmlFor="new-category-name">
                  Nueva categoría *
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-category-name"
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej. Suplemento, Bebida, Accesorios..."
                    className="input !min-h-10 py-2 text-sm flex-1"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isPendingCategory}
                    className="btn btn-primary !min-h-10 px-4 text-xs rounded-xl whitespace-nowrap"
                  >
                    {isPendingCategory ? 'Creando...' : '+ Agregar'}
                  </button>
                </div>
              </div>
            </form>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categorías existentes ({categories.length})
              </span>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No hay categorías creadas.
                </p>
              ) : (
                categories.map((cat) => {
                  const count = products.filter((p) => p.category_id === cat.id).length
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface border border-border text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({count} {count === 1 ? 'producto' : 'productos'})
                        </span>
                      </div>
                      {permissions.canDelete && (
                        <button
                          type="button"
                          disabled={isPendingCategory}
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-xs text-error hover:underline px-2 py-1"
                          title="Eliminar categoría"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="btn btn-ghost !min-h-10 px-5 text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product History Modal */}
      {historyProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4 border-b border-border pb-3">
              <div>
                <h2 id="history-modal-title" className="text-lg font-bold">
                  Historial del producto
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {historyProduct.name} • Creado el {formatDateTime(historyProduct.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="text-muted-foreground hover:text-white p-1"
                aria-label="Cerrar historial"
              >
                ✕
              </button>
            </div>

            {historyError && (
              <div className="bg-error/15 border border-error/30 text-error px-3 py-2 rounded-xl text-xs">
                {historyError}
              </div>
            )}

            <div className="overflow-auto max-h-[60vh] overscroll-contain rounded-xl border border-border">
              {isHistoryLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                  <div className="spinner" />
                  <span>Cargando historial...</span>
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  No hay registros de cambios para este producto.
                </div>
              ) : (
                <table className="w-full text-left border-separate border-spacing-0 min-w-[560px] text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="sticky top-0 left-0 z-30 bg-[#161824] border-b border-r border-white/10 py-2.5 px-3 min-w-[130px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                        Fecha y hora
                      </th>
                      <th className="sticky top-0 z-20 bg-[#161824] border-b border-border py-2.5 px-3 min-w-[130px]">
                        Acción / Campo
                      </th>
                      <th className="sticky top-0 z-20 bg-[#161824] border-b border-border py-2.5 px-3 min-w-[110px]">
                        Valor anterior
                      </th>
                      <th className="sticky top-0 z-20 bg-[#161824] border-b border-border py-2.5 px-3 min-w-[110px]">
                        Valor nuevo
                      </th>
                      <th className="sticky top-0 z-20 bg-[#161824] border-b border-border py-2.5 px-3 min-w-[110px]">
                        Usuario
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map((item) => {
                      const isCreated = item.action === 'created'
                      const isDeleted = item.action === 'deleted'
                      const fieldLabel = item.field_name
                        ? FIELD_LABELS[item.field_name] || item.field_name
                        : 'Creación de producto'

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="sticky left-0 z-10 bg-[#12131c] group-hover:bg-[#191b27] transition-colors border-b border-r border-white/10 py-2.5 px-3 whitespace-nowrap text-muted-foreground shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
                            {formatDateTime(item.created_at)}
                          </td>
                          <td className="border-b border-border py-2.5 px-3 font-semibold">
                            {isCreated ? (
                              <span className="badge badge-active !text-[10px] !py-0.5 !px-2">
                                Producto creado
                              </span>
                            ) : isDeleted ? (
                              <span className="badge badge-expired !text-[10px] !py-0.5 !px-2">
                                Producto eliminado
                              </span>
                            ) : (
                              <span className="text-foreground">{fieldLabel}</span>
                            )}
                          </td>
                          <td className="border-b border-border py-2.5 px-3 text-muted-foreground">
                            {isCreated
                              ? '—'
                              : formatHistoryValue(item.field_name, item.old_value)}
                          </td>
                          <td className="border-b border-border py-2.5 px-3 text-foreground font-medium">
                            {formatHistoryValue(item.field_name, item.new_value)}
                          </td>
                          <td className="border-b border-border py-2.5 px-3 text-muted-foreground">
                            {item.staff?.name || 'Sistema'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="btn btn-ghost !min-h-10 px-5 text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <h2 id="delete-modal-title" className="text-lg font-bold text-foreground">
              ¿Eliminar producto?
            </h2>
            <p className="text-sm text-muted-foreground">
              Estás a punto de eliminar{' '}
              <strong className="text-foreground">{productToDelete.name}</strong> del
              inventario.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="btn btn-ghost !min-h-10 px-4 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="btn btn-error !min-h-10 px-5 text-xs rounded-xl"
              >
                {isDeletingProduct ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductTableRow({
  product,
  canEdit,
  canDelete,
  onInlineSave,
  onOpenHistory,
  onRequestDelete,
}: {
  product: ProductWithDetails
  canEdit: boolean
  canDelete: boolean
  onInlineSave: (
    productId: string,
    field: 'price' | 'cost' | 'quantity_available',
    value: number
  ) => Promise<boolean>
  onOpenHistory: () => void
  onRequestDelete: () => void
}) {
  const [priceStr, setPriceStr] = useState(String(product.price))
  const [costStr, setCostStr] = useState(String(product.cost))
  const [qtyStr, setQtyStr] = useState(String(product.quantity_available))
  const [savingField, setSavingField] = useState<string | null>(null)

  // Sync local input strings if product prop changes externally
  useMemo(() => {
    setPriceStr(String(product.price))
  }, [product.price])

  useMemo(() => {
    setCostStr(String(product.cost))
  }, [product.cost])

  useMemo(() => {
    setQtyStr(String(product.quantity_available))
  }, [product.quantity_available])

  const currentPrice = Number(priceStr)
  const currentCost = Number(costStr)
  const currentQty = Number(qtyStr)

  const validPrice = !isNaN(currentPrice) ? currentPrice : product.price
  const validCost = !isNaN(currentCost) ? currentCost : product.cost
  const validQty = !isNaN(currentQty) ? currentQty : product.quantity_available

  const profit = validPrice - validCost
  const marginPercent =
    validPrice > 0 ? Math.round(((validPrice - validCost) / validPrice) * 100) : 0

  const primaryImage = product.images?.[0]?.image_url || null
  const isNegativeOrLowStock =
    validQty < 0 ||
    (product.low_stock_threshold > 0 && validQty <= product.low_stock_threshold)

  const commitField = async (
    field: 'price' | 'cost' | 'quantity_available',
    rawStr: string,
    fallbackVal: number,
    setter: (v: string) => void
  ) => {
    const parsed = parseFloat(rawStr.replace(',', '.'))
    if (isNaN(parsed)) {
      setter(String(fallbackVal))
      return
    }
    if ((field === 'price' || field === 'cost') && parsed < 0) {
      setter(String(fallbackVal))
      return
    }
    if (parsed === fallbackVal) {
      setter(String(fallbackVal))
      return
    }
    setSavingField(field)
    const ok = await onInlineSave(product.id, field, parsed)
    setSavingField(null)
    if (!ok) {
      setter(String(fallbackVal))
    }
  }

  return (
    <tr className="hover:bg-white/[0.03] transition-colors group">
      {/* Merged Photo + Name Cell (Sticky Left Column) */}
      <td className="sticky left-0 z-10 bg-[#10121b] group-hover:bg-[#171925] transition-colors border-b border-r border-white/10 py-3 px-3 sm:px-4 w-[148px] min-w-[148px] max-w-[148px] sm:w-[230px] sm:min-w-[230px] sm:max-w-[260px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/15 border border-accent/25 text-accent flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <Link
              href={`/inventory/${product.id}`}
              className="font-semibold text-xs sm:text-sm text-foreground underline decoration-white/30 hover:text-accent hover:decoration-accent transition-colors truncate"
              title={product.name}
            >
              {product.name}
            </Link>
            {product.category && (
              <span className="text-[11px] text-muted-foreground truncate">
                {product.category.name}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Inline Editable Price */}
      <td className="border-b border-border py-3 px-3 min-w-[136px]">
        <div
          className={`flex items-center rounded-xl border px-2.5 py-2 bg-black/30 transition-colors min-w-[114px] ${
            savingField === 'price'
              ? 'border-accent'
              : 'border-white/15 focus-within:border-accent'
          }`}
        >
          <span className="text-muted-foreground text-xs font-medium mr-1 select-none shrink-0">
            C$
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            disabled={!canEdit}
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            onBlur={() => commitField('price', priceStr, product.price, setPriceStr)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            aria-label={`Precio de ${product.name}`}
            className="w-full min-w-[68px] bg-transparent text-sm font-medium text-foreground tabular-nums focus:outline-none disabled:opacity-60"
          />
        </div>
      </td>

      {/* Inline Editable Cost */}
      <td className="border-b border-border py-3 px-3 min-w-[136px]">
        <div
          className={`flex items-center rounded-xl border px-2.5 py-2 bg-black/30 transition-colors min-w-[114px] ${
            savingField === 'cost'
              ? 'border-accent'
              : 'border-white/15 focus-within:border-accent'
          }`}
        >
          <span className="text-muted-foreground text-xs font-medium mr-1 select-none shrink-0">
            C$
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            disabled={!canEdit}
            value={costStr}
            onChange={(e) => setCostStr(e.target.value)}
            onBlur={() => commitField('cost', costStr, product.cost, setCostStr)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            aria-label={`Costo de ${product.name}`}
            className="w-full min-w-[68px] bg-transparent text-sm font-medium text-foreground tabular-nums focus:outline-none disabled:opacity-60"
          />
        </div>
      </td>

      {/* Inline Editable Quantity Available */}
      <td className="border-b border-border py-3 px-3 min-w-[108px]">
        <div
          className={`flex items-center rounded-xl border px-2.5 py-2 bg-black/30 transition-colors min-w-[84px] ${
            validQty < 0
              ? 'border-error text-error'
              : isNegativeOrLowStock
              ? 'border-warning/60'
              : savingField === 'quantity_available'
              ? 'border-accent'
              : 'border-white/15 focus-within:border-accent'
          }`}
        >
          <input
            type="number"
            step="any"
            inputMode="decimal"
            disabled={!canEdit}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            onBlur={() =>
              commitField(
                'quantity_available',
                qtyStr,
                product.quantity_available,
                setQtyStr
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            aria-label={`Cantidad disponible de ${product.name}`}
            className="w-full min-w-[56px] bg-transparent text-sm font-medium text-center tabular-nums focus:outline-none disabled:opacity-60"
          />
        </div>
      </td>

      {/* Profit Margin (Ganancia) */}
      <td className="border-b border-border py-3 px-3 font-medium whitespace-nowrap tabular-nums">
        <span className={profit < 0 ? 'text-error' : 'text-foreground'}>
          C${formatCurrencyValue(profit)}
        </span>
      </td>

      {/* Profit Percentage (%) */}
      <td className="border-b border-border py-3 px-3 tabular-nums">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
            marginPercent < 0
              ? 'bg-error-subtle text-error'
              : 'bg-success-subtle text-success'
          }`}
        >
          {marginPercent}%
        </span>
      </td>

      {/* History & Delete Actions */}
      <td className="border-b border-border py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="text-xs font-semibold text-foreground underline hover:text-accent transition-colors cursor-pointer"
          >
            Ver historial
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={onRequestDelete}
              title={`Eliminar ${product.name}`}
              aria-label={`Eliminar ${product.name}`}
              className="text-muted-foreground hover:text-error transition-colors p-1 cursor-pointer"
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

