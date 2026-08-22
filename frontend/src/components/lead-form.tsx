'use client'

import { useState } from 'react'
import { LeadSchema } from '@/lib/lead'
import type { Dict } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * The enquiry form. The only place on the site where a visitor writes anything,
 * so it is also the only client component that talks to our own API.
 */
export function LeadForm({
  propertySlug,
  propertyTitle,
  locale,
  dict,
}: {
  propertySlug: string
  propertyTitle: string
  locale: Locale
  dict: Dict
}) {
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const lead = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      message: String(form.get('message') ?? ''),
      company: String(form.get('company') ?? ''),
      propertySlug,
      propertyTitle,
      locale,
    }

    // Same schema the route handler uses, so an obvious mistake costs a round
    // trip to nobody.
    if (!LeadSchema.safeParse(lead).success) {
      setStatus('error')
      return
    }

    setStatus('sending')

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      })

      setStatus(response.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {dict.lead.success}
      </p>
    )
  }

  const field =
    'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-100'

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="lead-name" className="text-sm text-stone-600 dark:text-stone-400">
          {dict.lead.name}
        </label>
        <input id="lead-name" name="name" required minLength={2} className={field} />
      </div>

      <div>
        <label htmlFor="lead-email" className="text-sm text-stone-600 dark:text-stone-400">
          {dict.lead.email}
        </label>
        <input id="lead-email" name="email" type="email" required className={field} />
      </div>

      <div>
        <label htmlFor="lead-message" className="text-sm text-stone-600 dark:text-stone-400">
          {dict.lead.message}
        </label>
        <textarea id="lead-message" name="message" required minLength={10} rows={4} className={field} />
      </div>

      {/* The honeypot. Hidden from people, and from screen readers too, so only
          a bot filling every input it finds will touch it. */}
      <div aria-hidden className="hidden">
        <label htmlFor="lead-company">Company</label>
        <input id="lead-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        {status === 'sending' ? dict.lead.sending : dict.lead.submit}
      </button>

      {status === 'error' ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {dict.lead.error}
        </p>
      ) : null}
    </form>
  )
}
