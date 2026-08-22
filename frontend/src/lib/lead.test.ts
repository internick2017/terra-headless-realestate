import { describe, expect, it } from 'vitest'
import { LeadSchema, leadEmail } from './lead'

const valid = {
  name: 'Ana Ribeiro',
  email: 'ana@example.com',
  message: 'Is the pool heated, and when could I visit?',
  propertySlug: 'riverside-villa',
  propertyTitle: 'Riverside Villa',
  locale: 'en' as const,
}

describe('LeadSchema', () => {
  it('accepts a filled-in enquiry', () => {
    expect(LeadSchema.parse(valid).name).toBe('Ana Ribeiro')
  })

  it('trims the whitespace a visitor pastes in', () => {
    expect(LeadSchema.parse({ ...valid, name: '  Ana Ribeiro  ' }).name).toBe('Ana Ribeiro')
  })

  it('rejects an address that is not one', () => {
    expect(LeadSchema.safeParse({ ...valid, email: 'ana@' }).success).toBe(false)
  })

  it('rejects a message too short to be an enquiry', () => {
    expect(LeadSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false)
  })

  it('rejects a name of whitespace', () => {
    // Trimming happens before the length check, so "   " is empty, not three.
    expect(LeadSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
  })

  it('caps a message rather than accepting an essay', () => {
    expect(LeadSchema.safeParse({ ...valid, message: 'x'.repeat(4001) }).success).toBe(false)
  })

  it('rejects a locale the site does not ship', () => {
    expect(LeadSchema.safeParse({ ...valid, locale: 'fr' }).success).toBe(false)
  })

  it('requires the listing the enquiry is about', () => {
    expect(LeadSchema.safeParse({ ...valid, propertySlug: '' }).success).toBe(false)
  })

  it('lets the honeypot through when it is empty', () => {
    expect(LeadSchema.safeParse({ ...valid, company: '' }).success).toBe(true)
  })

  it('rejects the submission when the honeypot was filled', () => {
    // Only a bot fills a field it cannot see.
    expect(LeadSchema.safeParse({ ...valid, company: 'Acme' }).success).toBe(false)
  })
})

describe('leadEmail', () => {
  const email = leadEmail(LeadSchema.parse(valid), 'https://terra.example.com/')

  it('says which listing in the subject, so a reply needs no digging', () => {
    expect(email.subject).toBe('Enquiry: Riverside Villa')
  })

  it('links straight back to the listing in the right language', () => {
    expect(email.text).toContain('https://terra.example.com/en/properties/riverside-villa')
  })

  it('does not double the slash when the site url has a trailing one', () => {
    expect(email.text).not.toContain('.com//')
  })

  it('carries the visitor and their message', () => {
    expect(email.text).toContain('Ana Ribeiro <ana@example.com>')
    expect(email.text).toContain('Is the pool heated')
  })
})
