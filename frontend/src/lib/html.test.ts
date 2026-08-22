import { describe, expect, it } from 'vitest'
import { toPlainText, toSummary } from './html'

describe('toPlainText', () => {
  it('drops the tags and collapses the whitespace they leave behind', () => {
    expect(toPlainText('<p>Riverside runs</p>\n<p>along the water.</p>')).toBe(
      'Riverside runs along the water.',
    )
  })

  it('does not weld two blocks into one word', () => {
    // Replacing a tag with nothing would produce "runsalong".
    expect(toPlainText('<p>runs</p><p>along</p>')).toBe('runs along')
  })

  it('returns an empty string for missing content', () => {
    expect(toPlainText(null)).toBe('')
    expect(toPlainText('')).toBe('')
  })

  it('leaves text with no markup alone', () => {
    expect(toPlainText('Just a sentence.')).toBe('Just a sentence.')
  })
})

describe('toSummary', () => {
  it('leaves short text exactly as it is, with no ellipsis', () => {
    expect(toSummary('<p>Short enough.</p>')).toBe('Short enough.')
  })

  it('stays within the budget it was given', () => {
    expect(toSummary('word '.repeat(100), 40).length).toBeLessThanOrEqual(40)
  })

  it('cuts on a word boundary rather than mid-word', () => {
    const summary = toSummary('alpha bravo charlie delta echo foxtrot', 20)

    expect(summary.endsWith('…')).toBe(true)
    expect(summary.replace('…', '').trim().split(' ').at(-1)).not.toBe('char')
  })

  it('falls back to a hard cut when one word fills the budget', () => {
    // No space to break on, so trimming to the last space would empty it.
    const summary = toSummary('x'.repeat(50), 20)

    expect(summary.length).toBe(20)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('strips the markup before measuring, not after', () => {
    // Otherwise the tags eat the budget and the visible text is far too short.
    expect(toSummary('<p><strong>alpha bravo charlie</strong></p>', 30)).toBe(
      'alpha bravo charlie',
    )
  })
})
