/* eslint-disable @next/next/no-img-element */
import Image from 'next/image'
import type { Dict } from '@/lib/i18n'
import { openStreetMapLink, staticMapUrl, tileMap } from '@/lib/map'

const WIDTH = 800
const HEIGHT = 400

/**
 * The location of a listing: a static map plus a link out to a real one.
 * See lib/map.ts for why this is not an interactive embed.
 */
export function PropertyMap({
  latitude,
  longitude,
  dict,
}: {
  latitude: number | null
  longitude: number | null
  dict: Dict
}) {
  const link = openStreetMapLink(latitude, longitude)

  if (!link) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">{dict.detail.noLocation}</p>
  }

  const options = { width: WIDTH, height: HEIGHT }
  const provider = staticMapUrl(latitude, longitude, options)
  const tiles = provider ? null : tileMap(latitude, longitude, options)

  return (
    <figure>
      <div
        className="relative max-w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-800"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        {provider ? (
          <Image
            src={provider}
            alt={dict.detail.mapAlt}
            width={WIDTH}
            height={HEIGHT}
            // The provider is configured at runtime, so its host cannot be in
            // remotePatterns, and it already renders at the size we asked for.
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          // A grid of OpenStreetMap tiles, positioned by CSS. Plain <img>
          // rather than next/image: these are fixed-size PNGs straight from the
          // tile server, so there is nothing for the optimiser to do, and
          // routing every tile through it would only add latency.
          // Centred rather than anchored, so a viewport narrower than the map
          // crops the edges and keeps the marker — the only part that matters —
          // in view. Anchoring at the top left showed a corner of the map and
          // pushed the pin off screen on a phone.
          <div
            role="img"
            aria-label={dict.detail.mapAlt}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-100 dark:bg-stone-800"
            style={{ width: WIDTH, height: HEIGHT }}
          >
            {tiles?.tiles.map((tile) => (
              <img
                key={`${tile.left}:${tile.top}`}
                src={tile.url}
                alt=""
                width={256}
                height={256}
                loading="lazy"
                className="absolute max-w-none"
                style={{ left: tile.left, top: tile.top }}
              />
            ))}

            {tiles ? (
              <span
                aria-hidden
                className="absolute block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-stone-900 shadow-md dark:bg-stone-100"
                style={{ left: tiles.marker.left, top: tiles.marker.top }}
              />
            ) : null}
          </div>
        )}
      </div>

      <figcaption className="mt-2 flex flex-wrap gap-x-3 text-sm text-stone-500 dark:text-stone-400">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-stone-900 dark:hover:text-stone-100"
        >
          {dict.detail.viewOnMap}
        </a>

        {/* The tile server's licence asks for visible attribution. */}
        {provider ? null : <span>© OpenStreetMap</span>}
      </figcaption>
    </figure>
  )
}
