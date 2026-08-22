/**
 * The location map is a static image, not an interactive map.
 *
 * A Leaflet or Google Maps embed is hundreds of kilobytes of JavaScript on a
 * page whose largest element is a photo — it would blow the Core Web Vitals
 * budget in the design doc to show a pin that never moves.
 *
 * The obvious alternative, a static-map API, either needs a key or is a
 * courtesy service that can vanish: the one this file used first,
 * staticmap.openstreetmap.de, no longer resolves at all. So the map is built
 * from raw OpenStreetMap tiles instead — a handful of <img> tags positioned by
 * CSS, no key, no script, and no third party between us and the tile server.
 *
 * A paid provider can still take over: see NEXT_PUBLIC_STATIC_MAP_URL below.
 */

/** OpenStreetMap serves 256×256 tiles; everything here is in those units. */
const TILE_SIZE = 256

export type Tile = {
  url: string
  /** Pixel offset of this tile inside the viewport. */
  left: number
  top: number
}

export type TileMap = {
  tiles: Tile[]
  /** Where the listing itself sits inside the viewport, for the marker. */
  marker: { left: number; top: number }
  width: number
  height: number
}

/**
 * Web Mercator: longitude is a straight linear mapping, latitude is not.
 * Returns fractional tile coordinates, so the remainder is the position inside
 * a tile.
 */
export function tileCoordinates(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom
  const latRad = (latitude * Math.PI) / 180

  return {
    x: ((longitude + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  }
}

export function tileUrl(x: number, y: number, zoom: number): string {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}

export type MapOptions = {
  zoom?: number
  width?: number
  height?: number
}

/**
 * The tiles needed to fill a width×height viewport centred on a coordinate,
 * each with the offset it should be placed at.
 *
 * Returns null when either coordinate is missing, so a listing without
 * geocoding renders no map rather than a pin in the Atlantic at 0,0.
 */
export function tileMap(
  latitude: number | null,
  longitude: number | null,
  options: MapOptions = {},
): TileMap | null {
  if (latitude === null || longitude === null) {
    return null
  }

  const { zoom = 15, width = 800, height = 400 } = options

  const centre = tileCoordinates(latitude, longitude, zoom)
  const centrePx = { x: centre.x * TILE_SIZE, y: centre.y * TILE_SIZE }

  // The viewport, in world pixels, and the tile grid that covers it.
  const originPx = { x: centrePx.x - width / 2, y: centrePx.y - height / 2 }
  const firstTile = { x: Math.floor(originPx.x / TILE_SIZE), y: Math.floor(originPx.y / TILE_SIZE) }
  const lastTile = {
    x: Math.floor((originPx.x + width) / TILE_SIZE),
    y: Math.floor((originPx.y + height) / TILE_SIZE),
  }

  // Tiles wrap around the antimeridian; latitude does not, so clamp it instead.
  const n = 2 ** zoom
  const wrap = (value: number) => ((value % n) + n) % n

  const tiles: Tile[] = []

  for (let ty = firstTile.y; ty <= lastTile.y; ty += 1) {
    if (ty < 0 || ty >= n) {
      continue
    }

    for (let tx = firstTile.x; tx <= lastTile.x; tx += 1) {
      tiles.push({
        url: tileUrl(wrap(tx), ty, zoom),
        left: tx * TILE_SIZE - originPx.x,
        top: ty * TILE_SIZE - originPx.y,
      })
    }
  }

  return {
    tiles,
    marker: { left: centrePx.x - originPx.x, top: centrePx.y - originPx.y },
    width,
    height,
  }
}

/**
 * An optional escape hatch: a deployment that would rather pay a provider than
 * lean on the OSM tile servers sets NEXT_PUBLIC_STATIC_MAP_URL to a template
 * with {lat} {lon} {zoom} {width} {height} placeholders, and gets a single
 * image instead of the tile grid.
 *
 * Returns null when unset, or when the listing has no coordinates.
 */
export function staticMapUrl(
  latitude: number | null,
  longitude: number | null,
  options: MapOptions & { template?: string } = {},
): string | null {
  const template = options.template ?? process.env.NEXT_PUBLIC_STATIC_MAP_URL

  if (!template || latitude === null || longitude === null) {
    return null
  }

  const { zoom = 15, width = 800, height = 400 } = options

  const values: Record<string, string> = {
    lat: String(latitude),
    lon: String(longitude),
    zoom: String(zoom),
    width: String(width),
    height: String(height),
  }

  return template.replace(/\{(lat|lon|zoom|width|height)\}/g, (_match, key: string) => values[key])
}

/**
 * A link out to the full interactive map, for the visitor who wants to explore
 * the surroundings. That belongs on the map provider's own site, not in our
 * bundle.
 */
export function openStreetMapLink(
  latitude: number | null,
  longitude: number | null,
  zoom = 16,
): string | null {
  if (latitude === null || longitude === null) {
    return null
  }

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`
}
