import { NextRequest, NextResponse } from 'next/server'
import { invalidateSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json()

        if (token) {
            await invalidateSession(token)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
