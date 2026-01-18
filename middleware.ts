import { NextResponse, type NextRequest } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
    // Get session token from cookie
    const sessionToken = request.cookies.get('admin_session')?.value

    // Validate session in database
    const isValid = sessionToken ? await validateSession(sessionToken) : false

    // If accessing /admin (not /admin/login) and not authenticated, redirect to login
    if (request.nextUrl.pathname.startsWith('/admin') &&
        !request.nextUrl.pathname.startsWith('/admin/login') &&
        !isValid) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // If accessing /admin/login and already authenticated, redirect to admin dashboard
    if (request.nextUrl.pathname.startsWith('/admin/login') && isValid) {
        return NextResponse.redirect(new URL('/admin', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*'],
}
