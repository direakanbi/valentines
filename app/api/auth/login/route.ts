import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, recordLoginAttempt, createSession } from '@/lib/auth'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json()
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Check rate limit
        const rateLimit = await checkRateLimit(ipAddress)
        if (!rateLimit.allowed) {
            const minutesRemaining = rateLimit.lockedUntil
                ? Math.ceil((rateLimit.lockedUntil.getTime() - Date.now()) / 60000)
                : 0

            return NextResponse.json(
                { error: `Too many failed attempts. Try again in ${minutesRemaining} minutes.` },
                { status: 429 }
            )
        }

        // Validate password
        if (password !== ADMIN_PASSWORD) {
            await recordLoginAttempt(ipAddress, false)
            return NextResponse.json(
                {
                    error: 'Invalid password',
                    remainingAttempts: rateLimit.remainingAttempts ? rateLimit.remainingAttempts - 1 : 0
                },
                { status: 401 }
            )
        }

        // Generate secure session token
        const tokenBytes = new Uint8Array(32)
        crypto.getRandomValues(tokenBytes)
        const sessionToken = Array.from(tokenBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')

        // Store session in database
        await createSession(sessionToken, ipAddress, userAgent)
        await recordLoginAttempt(ipAddress, true)

        // Return session token
        return NextResponse.json({ token: sessionToken })

    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
