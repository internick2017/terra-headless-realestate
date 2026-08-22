/**
 * WordPress hands back HTML for bodies and excerpts. Anywhere that HTML has to
 * become a string — a meta description, a card summary, a JSON-LD field, a line
 * in llms.txt — it goes through here.
 *
 * This is not sanitisation and must never be used as such: it is for producing
 * plain text out of markup we already trust, not for making untrusted markup
 * safe to render.
 */
export function toPlainText(html: string | null): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The same, truncated on a whole word with an ellipsis, for the places that
 * have a length budget — a meta description is cut off around 160 characters
 * whether or not we do it ourselves, and cutting mid-word looks like a bug.
 */
export function toSummary(html: string | null, maxLength = 160): string {
  const text = toPlainText(html)

  if (text.length <= maxLength) {
    return text
  }

  const clipped = text.slice(0, maxLength - 1)
  const lastSpace = clipped.lastIndexOf(' ')

  return `${(lastSpace > maxLength / 2 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`
}
