'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { GalleryImage } from '@/lib/types'

/**
 * A gallery with one large image and a row of thumbnails.
 *
 * The only thing that needs the client is remembering which image is selected,
 * so this is the single interactive island on the detail page; everything
 * around it stays server-rendered.
 */
export function PropertyGallery({
  images,
  title,
}: {
  images: GalleryImage[]
  title: string
}) {
  const [selected, setSelected] = useState(0)

  if (images.length === 0) {
    return null
  }

  // Guard against an index left over from a shorter gallery.
  const active = images[Math.min(selected, images.length - 1)]

  return (
    <div>
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
        <Image
          src={active.sourceUrl}
          alt={active.altText ?? title}
          fill
          // The hero image of the page: fetched eagerly so it is the LCP element
          // rather than a late-loading surprise.
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.sourceUrl}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={image.altText ?? `${title} (${index + 1})`}
                aria-current={index === selected}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-offset-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:ring-offset-stone-950 dark:focus-visible:ring-stone-100 ${
                  index === selected
                    ? 'ring-2 ring-stone-900 dark:ring-stone-100'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={image.sourceUrl}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
