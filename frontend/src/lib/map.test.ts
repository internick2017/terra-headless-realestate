import { describe, expect, it } from 'vitest'
import { openStreetMapLink, staticMapUrl, tileCoordinates, tileMap, tileUrl } from './map'

describe('tileCoordinates', () => {
  it('puts 0,0 at the centre of the world', () => {
    // At zoom 1 the world is 2×2 tiles, so Null Island lands on the corner
    // where all four meet.
    expect(tileCoordinates(0, 0, 1)).toEqual({ x: 1, y: 1 })
  })

  it('maps the west and east edges to the ends of the grid', () => {
    expect(tileCoordinates(0, -180, 1).x).toBe(0)
    expect(tileCoordinates(0, 180, 1).x).toBe(2)
  })

  it('round-trips through the inverse projection', () => {
    // The strongest check available without a second implementation to compare
    // against: undo the projection with the standard inverse formulae and see
    // whether the original coordinate comes back.
    const invert = (x: number, y: number, zoom: number) => {
      const n = 2 ** zoom
      return {
        longitude: (x / n) * 360 - 180,
        latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
      }
    }

    for (const [latitude, longitude] of [
      [52.52, 13.405],
      [-26.08, -53.05],
      [35.68, 139.69],
      [0, 0],
    ]) {
      const { x, y } = tileCoordinates(latitude, longitude, 15)
      const back = invert(x, y, 15)

      expect(back.latitude).toBeCloseTo(latitude, 9)
      expect(back.longitude).toBeCloseTo(longitude, 9)
    }
  })

  it('places the southern hemisphere below the equator', () => {
    // Larger y means further south in this projection.
    expect(tileCoordinates(-26.08, -53.05, 10).y).toBeGreaterThan(2 ** 10 / 2)
  })
})

describe('tileUrl', () => {
  it('addresses a tile by zoom, x and y', () => {
    expect(tileUrl(17600, 10746, 15)).toBe('https://tile.openstreetmap.org/15/17600/10746.png')
  })
})

describe('tileMap', () => {
  const map = tileMap(52.52, 13.405, { zoom: 15, width: 800, height: 400 })

  it('covers the whole viewport with tiles', () => {
    expect(map).not.toBeNull()

    for (const tile of map!.tiles) {
      // Every tile must start before the far edge and end after the near one,
      // or there would be a gap in the map.
      expect(tile.left).toBeLessThan(800)
      expect(tile.top).toBeLessThan(400)
      expect(tile.left + 256).toBeGreaterThan(0)
      expect(tile.top + 256).toBeGreaterThan(0)
    }
  })

  it('leaves no hole: the tiles tile', () => {
    const lefts = [...new Set(map!.tiles.map((tile) => tile.left))].sort((a, b) => a - b)
    const tops = [...new Set(map!.tiles.map((tile) => tile.top))].sort((a, b) => a - b)

    // Columns and rows are one tile apart, and there is one tile per pair.
    for (let i = 1; i < lefts.length; i += 1) expect(lefts[i] - lefts[i - 1]).toBe(256)
    for (let i = 1; i < tops.length; i += 1) expect(tops[i] - tops[i - 1]).toBe(256)
    expect(map!.tiles.length).toBe(lefts.length * tops.length)
  })

  it('puts the marker at the centre of the viewport', () => {
    expect(map!.marker.left).toBeCloseTo(400, 6)
    expect(map!.marker.top).toBeCloseTo(200, 6)
  })

  it('reports back the size it was asked for', () => {
    expect(map!.width).toBe(800)
    expect(map!.height).toBe(400)
  })

  it('returns null when the listing has no coordinates', () => {
    expect(tileMap(null, 13.405)).toBeNull()
    expect(tileMap(52.52, null)).toBeNull()
  })

  it('keeps a coordinate of exactly zero', () => {
    // 0 is a real longitude (Greenwich), not a missing value.
    expect(tileMap(51.48, 0)).not.toBeNull()
  })

  it('wraps around the antimeridian instead of asking for a negative tile', () => {
    const edge = tileMap(0, 179.999, { zoom: 3, width: 800, height: 400 })

    for (const tile of edge!.tiles) {
      const x = Number(tile.url.split('/')[4])
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(2 ** 3)
    }
  })

  it('does not ask for tiles off the top or bottom of the world', () => {
    const pole = tileMap(85, 0, { zoom: 2, width: 800, height: 400 })

    for (const tile of pole!.tiles) {
      const y = Number(tile.url.split('/')[5].replace('.png', ''))
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(2 ** 2)
    }
  })
})

describe('staticMapUrl', () => {
  it('is null unless a provider template is configured', () => {
    expect(staticMapUrl(52.52, 13.405)).toBeNull()
  })

  it('substitutes every placeholder, repeats included', () => {
    const url = staticMapUrl(-26.08, -53.05, {
      zoom: 14,
      width: 600,
      height: 300,
      template: 'https://maps.test/{lat},{lon}/{zoom}/{width}x{height}?pin={lat},{lon}',
    })

    expect(url).toBe('https://maps.test/-26.08,-53.05/14/600x300?pin=-26.08,-53.05')
  })

  it('is null without coordinates even when configured', () => {
    expect(staticMapUrl(null, null, { template: '{lat}' })).toBeNull()
  })
})

describe('openStreetMapLink', () => {
  it('points at the coordinates with a marker', () => {
    expect(openStreetMapLink(-26.08, -53.05, 16)).toBe(
      'https://www.openstreetmap.org/?mlat=-26.08&mlon=-53.05#map=16/-26.08/-53.05',
    )
  })

  it('returns null without coordinates', () => {
    expect(openStreetMapLink(null, null)).toBeNull()
  })
})
