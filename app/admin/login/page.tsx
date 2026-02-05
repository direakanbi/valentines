'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, AlertCircle } from 'lucide-react'

// Simple password-based auth (temporary workaround)
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

export default function AdminLoginPage() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 429) {
                    setError(data.error) // Rate limit message
                } else if (data.remainingAttempts !== undefined) {
                    setError(`Invalid password. ${data.remainingAttempts} attempts remaining.`)
                } else {
                    setError(data.error || 'Login failed')
                }
                setLoading(false)
                return
            }

            // Set secure session cookie
            document.cookie = `admin_session=${data.token}; path=/; max-age=86400; SameSite=Strict; Secure`

            router.push('/admin')
            router.refresh()
        } catch (err: any) {
            console.error('Login error:', err)
            setError('Connection error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800">
                        <Lock className="w-6 h-6 text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-serif text-rose-500">Admin Login</h1>
                    <p className="text-neutral-400">Enter admin password</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6 bg-neutral-900 border border-neutral-800 rounded-lg p-8">
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-neutral-500">
                    Default password: admin123 (change in .env.local)
                </p>
            </div>
        </div>
    )
}
