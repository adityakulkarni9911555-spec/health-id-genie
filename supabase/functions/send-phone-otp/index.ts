import { createClient } from 'npm:@supabase/supabase-js@^2.89.0'
import { corsHeaders } from 'npm:@supabase/supabase-js@^2.89.0/cors'
import { z } from 'npm:zod@^3.25.76'

const BodySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
})

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio'
const OTP_TTL_MINUTES = 10
const RESEND_COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 5

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function serverError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getClaims(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getClaims(token)
  if (error || !data?.claims) return null
  return data.claims
}

function generateCode(): string {
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  const num = new DataView(buf.buffer).getUint32(0, true)
  return String(num % 1_000_000).padStart(6, '0')
}

async function hashCode(code: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(code),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  const combined = new Uint8Array(salt.length + derived.byteLength)
  combined.set(salt, 0)
  combined.set(new Uint8Array(derived), salt.length)
  return btoa(String.fromCharCode(...combined))
}

async function gatewayFetch(path: string, init: RequestInit) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')
  const twilioKey = Deno.env.get('TWILIO_API_KEY')
  if (!lovableKey || !twilioKey) {
    throw new Error('Twilio credentials are not configured')
  }
  return fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': twilioKey,
    },
  })
}

async function getTwilioSenderNumber(): Promise<string | null> {
  const response = await gatewayFetch('/IncomingPhoneNumbers.json', {
    method: 'GET',
  })
  if (!response.ok) {
    const text = await response.text()
    console.error('Twilio list numbers failed:', response.status, text)
    return null
  }
  const data = await response.json()
  const numbers = data?.incoming_phone_numbers
  if (!Array.isArray(numbers) || numbers.length === 0) return null
  return numbers[0].phone_number as string
}

async function sendSms(to: string, body: string, from: string) {
  const response = await gatewayFetch('/Messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })
  if (!response.ok) {
    const text = await response.text()
    console.error('Twilio send SMS failed:', response.status, text)
    throw new Error(`Twilio returned ${response.status}: ${text}`)
  }
  return response.json()
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are allowed')
  }

  const claims = await getClaims(req)
  if (!claims) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid phone number')
  }

  const { phone } = parsed.data
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const now = new Date().toISOString()
  const cooldownAgo = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString()

  const { data: recentCodes, error: recentError } = await supabase
    .from('phone_otp_codes')
    .select('id, created_at')
    .eq('phone_number', phone)
    .gt('created_at', cooldownAgo)
    .is('verified_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (recentError) {
    console.error('DB recent code lookup failed:', recentError)
    return serverError('Unable to send code right now')
  }

  if (recentCodes && recentCodes.length > 0) {
    return badRequest('Please wait before requesting a new code')
  }

  const code = generateCode()
  const codeHash = await hashCode(code)
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()

  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null

  const { error: insertError } = await supabase.from('phone_otp_codes').insert({
    phone_number: phone,
    code_hash: codeHash,
    expires_at: expiresAt,
    attempts: 0,
    ip_address: ipAddress,
  })

  if (insertError) {
    console.error('DB insert failed:', insertError)
    return serverError('Unable to send code right now')
  }

  const fromNumber = await getTwilioSenderNumber()
  if (!fromNumber) {
    return serverError('No Twilio sender number is configured in your account', 503)
  }

  try {
    await sendSms(`+91${phone}`, `Your Medora verification code is: ${code}. Valid for ${OTP_TTL_MINUTES} minutes.`, fromNumber)
  } catch (err) {
    console.error('SMS send failed:', err)
    return serverError('Unable to send SMS right now')
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
