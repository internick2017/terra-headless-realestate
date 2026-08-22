import { z } from 'zod'

/**
 * An enquiry about a listing, as it arrives from the form.
 *
 * The same schema runs on both sides of the wire: the browser catches typos
 * before a request is made, and the route handler re-checks because a browser
 * is not a trustworthy place to enforce anything.
 */
export const LeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  message: z.string().trim().min(10).max(4000),

  // Which listing the visitor was looking at. Not shown in the form.
  propertySlug: z.string().min(1).max(200),
  propertyTitle: z.string().min(1).max(300),
  locale: z.enum(['en', 'pt']),

  /**
   * A honeypot: a field hidden from people and irresistible to naive bots. Any
   * value at all means the submission is discarded. Cheap, and it costs a real
   * visitor nothing — no puzzle, no third-party script.
   */
  company: z.string().max(0).optional(),
})

export type Lead = z.infer<typeof LeadSchema>

/**
 * The email the agency receives. A plain-text body on purpose: it is a handful
 * of fields, it renders in every client, and it cannot be a phishing surface.
 */
export function leadEmail(lead: Lead, siteUrl: string) {
  const url = `${siteUrl.replace(/\/$/, '')}/${lead.locale}/properties/${lead.propertySlug}`

  return {
    subject: `Enquiry: ${lead.propertyTitle}`,
    text: [
      `Property: ${lead.propertyTitle}`,
      `Listing:  ${url}`,
      `Language: ${lead.locale}`,
      '',
      `From:     ${lead.name} <${lead.email}>`,
      '',
      lead.message,
    ].join('\n'),
  }
}
