import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; remainingAttempts?: number; lockedUntil?: Date }> {
    const { data: attempt } = await supabaseAdmin
        .from('login_attempts')
        .select('*')
        .eq('ip_address', ipAddress)
        .single()

    if (!attempt) {
        return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS }
    }

    // Check if locked
    if (attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
        return {
            allowed: false,
            lockedUntil: new Date(attempt.locked_until)
        }
    }

    // Reset if last attempt was more than 1 hour ago
    const lastAttempt = new Date(attempt.last_attempt)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (lastAttempt < oneHourAgo) {
        await supabaseAdmin
            .from('login_attempts')
            .update({ attempt_count: 0, locked_until: null })
            .eq('ip_address', ipAddress)
        return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS }
    }

    // Check attempt count
    if (attempt.attempt_count >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        await supabaseAdmin
            .from('login_attempts')
            .update({ locked_until: lockedUntil })
            .eq('ip_address', ipAddress)
        return { allowed: false, lockedUntil }
    }

    return {
        allowed: true,
        remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.attempt_count
    }
}

export async function recordLoginAttempt(ipAddress: string, success: boolean) {
    if (success) {
        // Reset on successful login
        await supabaseAdmin
            .from('login_attempts')
            .upsert({
                ip_address: ipAddress,
                attempt_count: 0,
                last_attempt: new Date().toISOString(),
                locked_until: null
            })
    } else {
        // Increment failed attempts
        const { data: existing } = await supabaseAdmin
            .from('login_attempts')
            .select('attempt_count')
            .eq('ip_address', ipAddress)
            .single()

        await supabaseAdmin
            .from('login_attempts')
            .upsert({
                ip_address: ipAddress,
                attempt_count: (existing?.attempt_count || 0) + 1,
                last_attempt: new Date().toISOString()
            })
    }
}

export async function createSession(token: string, ipAddress: string, userAgent: string) {
    await supabaseAdmin
        .from('admin_sessions')
        .insert({
            token,
            ip_address: ipAddress,
            user_agent: userAgent,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
}

export async function validateSession(token: string): Promise<boolean> {
    const { data } = await supabaseAdmin
        .from('admin_sessions')
        .select('expires_at')
        .eq('token', token)
        .single()

    if (!data) return false

    return new Date(data.expires_at) > new Date()
}

export async function invalidateSession(token: string) {
    await supabaseAdmin
        .from('admin_sessions')
        .delete()
        .eq('token', token)
}
