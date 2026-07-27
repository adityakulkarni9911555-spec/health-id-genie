import { createClient } from 'npm:@supabase/supabase-js@^2.89.0'
import { corsHeaders } from 'npm:@supabase/supabase-js@^2.89.0/cors'
import { z } from 'npm:zod@^3.25.76'

const BodySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
})

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

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

async function verifyCode(storedHash: string, submittedCode: string): Promise<boolean> {
  const raw = atob(storedHash)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  const salt = bytes.slice(0, 16)
  const originalDerived = bytes.slice(16)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(submittedCode),
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

  if (derived.byteLength !== originalDerived.length) return false
  const derivedBytes = new Uint8Array(derived)
  let result = 0
  for (let i = 0; i < originalDerived.length; i++) {
    result |= originalDerived[i] ^ derivedBytes[i]
  }
  return result === 0
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return badRequest('Only POST requests are allowed')
  }

  const userId = await getUserId(req)
  if (!userId) return unauthorized()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')
  }

  const { phone, code } = parsed.data
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const now = new Date().toISOString()

  const { data: rows, error: lookupError } = await supabase
    .from('phone_otp_codes')
    .select('id, code_hash, attempts, expires_at, verified_at')
    .eq('phone_number', phone)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)

  if (lookupError) {
    console.error('DB lookup failed:', lookupError)
    return serverError('Unable to verify code right now')
  }

  const record = rows?.[0]
  if (!record) {
    return badRequest('Code expired or not found')
  }

  if (record.verified_at) {
    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return badRequest('Too many attempts. Please request a new code.')
  }

  const match = await verifyCode(record.code_hash, code)

  const newAttempts = record.attempts + 1
  if (!match) {
    await supabase
      .from('phone_otp_codes')
      .update({ attempts: newAttempts })
      .eq('id', record.id)
    return new Response(
      JSON.stringify({ verified: false, error: 'Invalid code' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error: updateError } = await supabase
    .from('phone_otp_codes')
    .update({ verified_at: new Date().toISOString(), attempts: newAttempts })
    .eq('id', record.id)

  if (updateError) {
    console.error('DB update failed:', updateError)
    return serverError('Unable to verify code right now')
  }

  return new Response(JSON.stringify({ verified: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
