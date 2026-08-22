import { NextResponse } from 'next/server'
import { LeadSchema, leadEmail } from '@/lib/lead'

/**
 * Where an enquiry goes. The form is the only write path in the whole front
 * end, and it deliberately owns no database: the agency already has an inbox.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Delivery is configured, not compiled in. With the three variables set, the
 * enquiry is emailed through Resend; without them it is logged and the visitor
 * still gets a confirmation, so the demo works for anyone who clones it with no
 * account anywhere.
 *
 * Resend is called over plain HTTP rather than through its SDK: it is one POST
 * with a JSON body, and a dependency for that is a dependency to keep patched.
 */
async function deliver(subject: string, text: string, replyTo: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.LEAD_FROM_EMAIL
  const to = process.env.LEAD_TO_EMAIL

  if (!apiKey || !from || !to) {
    console.info(`[lead] delivery not configured; enquiry logged instead\n${subject}\n${text}`)
    return
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, reply_to: replyTo }),
  })

  if (!response.ok) {
    // Surfaced to the caller as a 502: the enquiry was valid, we failed to send
    // it, and the visitor should be told to try again rather than thanked.
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`)
  }
}

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = LeadSchema.safeParse(payload)

  if (!parsed.success) {
    // Deliberately vague: the form already told the visitor what is wrong, and
    // spelling out which rule failed only helps someone probing the honeypot.
    return NextResponse.json({ error: 'invalid_lead' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const { subject, text } = leadEmail(parsed.data, siteUrl)

  try {
    await deliver(subject, text, parsed.data.email)
  } catch (error) {
    console.error('[lead] delivery failed', error)
    return NextResponse.json({ error: 'delivery_failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
