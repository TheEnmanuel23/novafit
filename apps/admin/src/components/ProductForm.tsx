'use client'

import { useState, useRef, useEffect, useActionState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  ProductCategory,
  ProductUnitCategory,
  ProductWithDetails,
} from '@novafit/types'
import {
  PRODUCT_UNIT_GROUPS,
  getUnitDefinition,
} from '@novafit/supabase/src/queries/inventory'
import {
  createProductAction,
  updateProductAction,
  createProductCategoryAction,
  deleteProductAction,
} from '@/app/actions/inventory'

interface ImageSlot {
  id: string
  previewUrl: string
  existingUrl?: string
  file?: File
}

export function ProductForm({
  initialData,
  initialCategories,
  permissions,
}: {
  initialData?: ProductWithDetails
  initialCategories: ProductCategory[]
  permissions: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }
}) {
  const router = useRouter()
  const isEditing = !!initialData

  const boundAction = isEditing
    ? updateProductAction.bind(null, initialData.id)
    : createProductAction

  const [state, formAction, pending] = useActionState(boundAction, null)

  // Categories state
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialData?.category_id || ''
  )
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isPendingCategory, startCategoryTransition] = useTransition()

  // Form fields state
  const [quantity, setQuantity] = useState<number>(
    initialData ? Number(initialData.quantity_available) : 0
  )
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(
    initialData ? Number(initialData.low_stock_threshold) : 0
  )
  const [showInCatalog, setShowInCatalog] = useState<boolean>(
    initialData ? initialData.show_in_catalog : true
  )

  // Unit grouped selector state (replicates Treinta's 2-column cascading dropdown)
  const initialUnitDef = getUnitDefinition(initialData?.unit || 'unit')
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(initialUnitDef.code)
  const [activeUnitGroup, setActiveUnitGroup] = useState<ProductUnitCategory>(
    initialUnitDef.category
  )
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false)
  const unitMenuRef = useRef<HTMLDivElement>(null)

  // Up to 3 pictures state
  const [images, setImages] = useState<ImageSlot[]>(() => {
    if (!initialData?.images?.length) return []
    return initialData.images.slice(0, 3).map((img) => ({
      id: img.id,
      previewUrl: img.image_url,
      existingUrl: img.image_url,
    }))
  })
  const [imageError, setImageError] = useState<string | null>(null)
  const filePickerRef = useRef<HTMLInputElement>(null)
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null)

  // Delete confirmation modal
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (unitMenuRef.current && !unitMenuRef.current.contains(e.target as Node)) {
        setIsUnitMenuOpen(false)
      }
    }
    if (isUnitMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isUnitMenuOpen])

  const currentUnitDef = getUnitDefinition(selectedUnitCode)
  const currentGroupUnits =
    PRODUCT_UNIT_GROUPS.find((g) => g.category === activeUnitGroup)?.units ||
    PRODUCT_UNIT_GROUPS[0].units

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null)
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const maxBytes = 2 * 1024 * 1024 // 2MB recommendation in screenshot, allow up to 5MB hard limit
    const hardLimitBytes = 5 * 1024 * 1024

    for (const file of files) {
      if (file.size > hardLimitBytes) {
        setImageError(`La imagen "${file.name}" supera el límite máximo permitido (5MB).`)
        e.target.value = ''
        return
      }
      if (file.size > maxBytes) {
        // Non-blocking warning or allow up to 5MB
      }
    }

    if (replaceIndex !== null) {
      const file = files[0]
      const previewUrl = URL.createObjectURL(file)
      setImages((prev) =>
        prev.map((slot, idx) =>
          idx === replaceIndex
            ? {
                id: `new-${Date.now()}-${idx}`,
                previewUrl,
                file,
              }
            : slot
        )
      )
      setReplaceIndex(null)
    } else {
      const remainingSlots = 3 - images.length
      if (remainingSlots <= 0) {
        setImageError('Solo se permiten hasta 3 imágenes por producto.')
        e.target.value = ''
        return
      }
      const filesToAdd = files.slice(0, remainingSlots)
      const newSlots: ImageSlot[] = filesToAdd.map((file, i) => ({
        id: `new-${Date.now()}-${i}`,
        previewUrl: URL.createObjectURL(file),
        file,
      }))
      setImages((prev) => [...prev, ...newSlots].slice(0, 3))
    }

    e.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleTriggerAddImage = () => {
    setReplaceIndex(null)
    filePickerRef.current?.click()
  }

  const handleTriggerReplaceImage = (index: number) => {
    setReplaceIndex(index)
    filePickerRef.current?.click()
  }

  const handleQuickCreateCategory = () => {
    setCategoryError(null)
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setCategoryError('Ingresa el nombre de la categoría.')
      return
    }
    startCategoryTransition(async () => {
      const res = await createProductCategoryAction(trimmed)
      if (res.error) {
        setCategoryError(res.error)
      } else if (res.category) {
        setCategories((prev) =>
          [...prev, res.category].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
          )
        )
        setSelectedCategoryId(res.category.id)
        setNewCategoryName('')
        setIsAddingCategory(false)
      }
    })
  }

  const handleDeleteProduct = () => {
    if (!initialData) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const res = await deleteProductAction(initialData.id)
      if (res.error) {
        setDeleteError(res.error)
      } else {
        router.push('/inventory')
        router.refresh()
      }
    })
  }

  // Client-side submission handler so we can append our File objects into FormData
  const handleFormAction = (formData: FormData) => {
    let fileIdx = 0
    for (const slot of images) {
      if (slot.existingUrl) {
        formData.append('existing_images', slot.existingUrl)
      } else if (slot.file) {
        formData.set(`image_file_${fileIdx}`, slot.file)
        fileIdx++
      }
    }
    formAction(formData)
  }

  const isReadOnly = isEditing ? !permissions.canEdit : !permissions.canCreate

  return (
    <form action={handleFormAction} className="flex flex-col gap-6">
      {(state?.error || deleteError) && (
        <div className="bg-error/15 border border-error/30 text-error px-4 py-3 rounded-xl text-sm font-medium">
          {state?.error || deleteError}
        </div>
      )}

      <input type="hidden" name="unit" value={selectedUnitCode} />
      <input type="hidden" name="category_id" value={selectedCategoryId} />
      <input
        type="hidden"
        name="show_in_catalog"
        value={showInCatalog ? 'true' : 'false'}
      />

      {/* Hidden multi-file picker */}
      <input
        ref={filePickerRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={replaceIndex === null}
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Información básica (matches Treinta screenshot 1 & 3) */}
        <section className="glass p-6 rounded-2xl flex flex-col gap-5 lg:col-span-7">
          <h2 className="text-lg font-bold tracking-tight">Información básica</h2>

          {/* Up to 3 pictures uploader */}
          <div className="flex flex-col gap-2">
            {images.length === 0 ? (
              <button
                type="button"
                disabled={isReadOnly}
                onClick={handleTriggerAddImage}
                className="w-full rounded-2xl border-2 border-dashed border-accent/50 bg-accent/10 hover:bg-accent/15 transition-colors p-7 flex flex-col items-center justify-center gap-2 text-center cursor-pointer disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-accent">
                  Carga hasta 3 imagenes
                </span>
                <span className="text-xs text-accent/80">
                  Recomendamos: Tamaño de 500 x 500 px, formato PNG y peso máximo 2MB.
                </span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {images.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="relative w-32 h-32 rounded-2xl overflow-hidden border border-border bg-black/40 group"
                  >
                    <img
                      src={slot.previewUrl}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {!isReadOnly && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTriggerReplaceImage(idx)}
                          title="Cambiar imagen"
                          aria-label={`Cambiar imagen ${idx + 1}`}
                          className="w-7 h-7 rounded-full bg-white text-black shadow-md flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Quitar imagen"
                          aria-label={`Quitar imagen ${idx + 1}`}
                          className="w-7 h-7 rounded-full bg-black/80 text-white shadow-md flex items-center justify-center hover:bg-error transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {idx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white">
                        Principal
                      </span>
                    )}
                  </div>
                ))}

                {images.length < 3 && !isReadOnly && (
                  <button
                    type="button"
                    onClick={handleTriggerAddImage}
                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-accent/50 bg-accent/10 hover:bg-accent/15 transition-colors flex flex-col items-center justify-center gap-1.5 p-3 text-center cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-accent text-accent flex items-center justify-center font-bold">
                      +
                    </div>
                    <span className="text-xs font-bold text-accent leading-tight">
                      Añade {3 - images.length}{' '}
                      {3 - images.length === 1 ? 'imagen más' : 'imágenes más'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {imageError && (
              <span className="text-xs text-error font-medium">{imageError}</span>
            )}
          </div>

          {/* Nombre del producto */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-semibold text-foreground">
              Nombre del producto <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="name"
                name="name"
                type="text"
                required
                disabled={isReadOnly}
                defaultValue={initialData?.name || ''}
                placeholder="Camiseta, perfume, aretes..."
                className="input pr-12"
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                title="Producto de inventario"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="14" x="3" y="5" rx="2" />
                  <path d="M7 12h.01M11 12h.01M15 12h.01M17 9v6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Precio de venta + Grouped Unit Selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price" className="text-sm font-semibold text-foreground">
              Precio de venta <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 relative flex items-center">
                <span className="absolute left-4 text-sm font-semibold text-muted-foreground pointer-events-none">
                  C$
                </span>
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={isReadOnly}
                  defaultValue={initialData ? initialData.price : ''}
                  placeholder="0"
                  className="input pl-11"
                />
              </div>

              {/* Grouped Unit Dropdown matching Screenshot 4 */}
              <div className="sm:col-span-5 relative" ref={unitMenuRef}>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    setActiveUnitGroup(currentUnitDef.category)
                    setIsUnitMenuOpen((prev) => !prev)
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={isUnitMenuOpen}
                  className="input flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="truncate font-medium">
                    {currentUnitDef.shortLabel === 'Unidad'
                      ? 'Unidad'
                      : currentUnitDef.label}
                  </span>
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
                    className={`transition-transform duration-150 ${
                      isUnitMenuOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isUnitMenuOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 z-50 flex flex-col sm:flex-row bg-[#151722] border border-border-strong rounded-2xl shadow-2xl overflow-hidden min-w-[310px] sm:min-w-[390px]">
                    {/* Left Pane: Unit Categories (Conteo, Peso, Volumen, Longitud, Área) */}
                    <div className="w-full sm:w-40 border-b sm:border-b-0 sm:border-r border-border bg-black/30 py-1.5 flex flex-row sm:flex-col overflow-x-auto">
                      {PRODUCT_UNIT_GROUPS.map((group) => {
                        const isActiveGroup = activeUnitGroup === group.category
                        return (
                          <button
                            key={group.category}
                            type="button"
                            onMouseEnter={() => setActiveUnitGroup(group.category)}
                            onClick={() => setActiveUnitGroup(group.category)}
                            className={`px-4 py-2.5 text-left text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                              isActiveGroup
                                ? 'bg-white/10 text-white font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                          >
                            <span>{group.label}</span>
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
                              className="hidden sm:block opacity-70"
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </button>
                        )
                      })}
                    </div>

                    {/* Right Pane: Units within active group (e.g. Kilogramo (kg), Libra (lb), Gramo (g)...) */}
                    <div className="flex-1 py-1.5 flex flex-col max-h-64 overflow-y-auto">
                      {currentGroupUnits.map((unit) => {
                        const isSelected = selectedUnitCode === unit.code
                        return (
                          <button
                            key={unit.code}
                            type="button"
                            onClick={() => {
                              setSelectedUnitCode(unit.code)
                              setIsUnitMenuOpen(false)
                            }}
                            className={`px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-accent/20 text-accent font-semibold'
                                : 'text-foreground hover:bg-white/10'
                            }`}
                          >
                            <span>{unit.label}</span>
                            {isSelected && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <strong className="font-semibold text-foreground/80">
                Elige cómo lo vendes:
              </strong>{' '}
              por Unidad, Kilo, Gramo, Litro, Metro, etc.
            </p>
          </div>

          {/* Unidades & Costo row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="quantity_available"
                className="text-sm font-semibold text-foreground"
              >
                Unidades
              </label>
              <div className="flex items-center justify-between input !py-1.5 !px-3">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setQuantity((q) => Number((q - 1).toFixed(2)))}
                  aria-label="Disminuir unidades"
                  className="w-7 h-7 rounded-full border border-border-strong text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  −
                </button>
                <input
                  id="quantity_available"
                  name="quantity_available"
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-24 text-center bg-transparent font-bold text-sm focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setQuantity((q) => Number((q + 1).toFixed(2)))}
                  aria-label="Aumentar unidades"
                  className="w-7 h-7 rounded-full border border-foreground text-foreground hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cost" className="text-sm font-semibold text-foreground">
                Costo
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-sm font-semibold text-muted-foreground pointer-events-none">
                  C$
                </span>
                <input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isReadOnly}
                  defaultValue={initialData ? initialData.cost : 0}
                  placeholder="0"
                  className="input pl-11"
                />
              </div>
            </div>
          </div>

          {/* Alerta de unidades bajas */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor="low_stock_threshold"
                className="text-sm font-semibold text-foreground"
              >
                Alerta de unidades bajas
              </label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Te avisamos cuando queden estas unidades o menos.
            </p>
            <div className="flex items-center justify-between input !py-1.5 !px-3">
              <button
                type="button"
                disabled={isReadOnly || lowStockThreshold <= 0}
                onClick={() =>
                  setLowStockThreshold((q) => Math.max(0, Number((q - 1).toFixed(2))))
                }
                aria-label="Disminuir alerta de unidades bajas"
                className="w-7 h-7 rounded-full border border-border-strong text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
              >
                −
              </button>
              <input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                step="any"
                min="0"
                disabled={isReadOnly}
                value={lowStockThreshold}
                onChange={(e) =>
                  setLowStockThreshold(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-24 text-center bg-transparent font-bold text-sm focus:outline-none"
              />
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() =>
                  setLowStockThreshold((q) => Number((q + 1).toFixed(2)))
                }
                aria-label="Aumentar alerta de unidades bajas"
                className="w-7 h-7 rounded-full border border-foreground text-foreground hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Categoría (optional, with inline button to create if it doesn't exist) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="category_select"
                className="text-sm font-semibold text-foreground"
              >
                Categoría
              </label>
              {!isReadOnly && (
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
              )}
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
                    disabled={isPendingCategory}
                    onClick={handleQuickCreateCategory}
                    className="btn btn-primary !min-h-10 px-4 text-xs rounded-xl"
                  >
                    {isPendingCategory ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                {categoryError && (
                  <span className="text-xs text-error">{categoryError}</span>
                )}
              </div>
            )}

            <div className="relative">
              <select
                id="category_select"
                disabled={isReadOnly}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="input appearance-none pr-10 cursor-pointer"
              >
                <option value="">Selecciona o crea una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
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
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Descripción & Additional details (matches Screenshot 4 right side) */}
        <section className="glass p-6 rounded-2xl flex flex-col gap-5 lg:col-span-5">
          <h2 className="text-lg font-bold tracking-tight">Detalles adicionales</h2>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-sm font-semibold text-foreground"
            >
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              disabled={isReadOnly}
              defaultValue={initialData?.description || ''}
              placeholder="Agrega detalles, notas de costo, envío o características del producto..."
              className="input min-h-[110px] py-3 resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="barcode" className="text-sm font-semibold text-foreground">
              Código de barras / SKU (Opcional)
            </label>
            <input
              id="barcode"
              name="barcode"
              type="text"
              disabled={isReadOnly}
              defaultValue={initialData?.barcode || ''}
              placeholder="Ej. 7501055300075"
              className="input"
            />
          </div>

          {/* Catálogo virtual toggle card */}
          <label className="flex items-start justify-between gap-3 p-4 rounded-xl border border-success/40 bg-success/10 cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground">
                Mostrar en catálogo virtual
              </span>
              <span className="text-xs text-muted-foreground">
                Tus clientes pueden ver y pedir este producto.
              </span>
            </div>
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={showInCatalog}
              onChange={(e) => setShowInCatalog(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-success rounded cursor-pointer"
            />
          </label>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {!isReadOnly && (
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary w-full rounded-xl shadow-lg shadow-accent/25"
              >
                {pending
                  ? 'Guardando...'
                  : isEditing
                  ? 'Guardar cambios'
                  : 'Crear producto'}
              </button>
            )}

            <Link
              href="/inventory"
              className="btn btn-ghost w-full rounded-xl text-center"
            >
              Cancelar y volver
            </Link>

            {isEditing && permissions.canDelete && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="btn w-full rounded-xl bg-error/15 text-error border border-error/30 hover:bg-error/25 mt-2 text-sm"
              >
                Eliminar producto
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Delete confirmation dialog */}
      {isConfirmingDelete && initialData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#12131c] border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold">¿Eliminar producto?</h3>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas eliminar{' '}
              <strong className="text-foreground">{initialData.name}</strong> del
              inventario?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(false)}
                className="btn btn-ghost !min-h-10 px-4 text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProduct}
                className="btn btn-error !min-h-10 px-5 text-xs rounded-xl"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

