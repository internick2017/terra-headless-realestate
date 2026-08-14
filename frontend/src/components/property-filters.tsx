'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import type { Dict } from '@/lib/i18n'

const TYPES = ['house', 'apartment', 'land', 'commercial'] as const

/**
 * Filter controls that write their state into the query string rather than into
 * component state, so a filtered view can be reloaded, shared or bookmarked and
 * still show the same listings. The server reads the same params back.
 */
export function PropertyFilters({
  dict,
  neighborhoods,
}: {
  dict: Dict
  neighborhoods: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set(key, value)
      } else {
        // Drop the key entirely rather than leaving "?operation=" behind.
        params.delete(key)
      }

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const value = (key: string) => searchParams.get(key) ?? ''
  const hasFilters = Array.from(searchParams.keys()).length > 0

  const selectClass =
    'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900'

  return (
    <form
      className="mb-8 grid gap-4 rounded-xl border border-stone-200 p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-stone-800"
      // The URL is the state; there is nothing to submit.
      onSubmit={(event) => event.preventDefault()}
      aria-label={dict.filters.title}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
          {dict.filters.operation}
        </span>
        <select
          className={selectClass}
          value={value('operation')}
          onChange={(event) => update('operation', event.target.value)}
        >
          <option value="">{dict.filters.any}</option>
          <option value="sale">{dict.property.forSale}</option>
          <option value="rent">{dict.property.forRent}</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
          {dict.filters.type}
        </span>
        <select
          className={selectClass}
          value={value('type')}
          onChange={(event) => update('type', event.target.value)}
        >
          <option value="">{dict.filters.any}</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {dict.property.types[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
          {dict.filters.minPrice}
        </span>
        <input
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          className={selectClass}
          value={value('minPrice')}
          onChange={(event) => update('minPrice', event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
          {dict.filters.maxPrice}
        </span>
        <input
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          className={selectClass}
          value={value('maxPrice')}
          onChange={(event) => update('maxPrice', event.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
          {dict.filters.bedrooms}
        </span>
        <select
          className={selectClass}
          value={value('bedrooms')}
          onChange={(event) => update('bedrooms', event.target.value)}
        >
          <option value="">{dict.filters.any}</option>
          {[1, 2, 3, 4].map((count) => (
            <option key={count} value={count}>
              {count}+
            </option>
          ))}
        </select>
      </label>

      {neighborhoods.length > 0 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
            {dict.nav.neighborhoods}
          </span>
          <select
            className={selectClass}
            value={value('neighborhood')}
            onChange={(event) => update('neighborhood', event.target.value)}
          >
            <option value="">{dict.filters.any}</option>
            {neighborhoods.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {hasFilters ? (
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => router.replace(pathname, { scroll: false })}
            className="text-sm font-medium text-stone-600 underline-offset-4 hover:underline dark:text-stone-400"
          >
            {dict.filters.clear}
          </button>
        </div>
      ) : null}
    </form>
  )
}
