'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, LayoutDashboard, Plus, List, Music } from 'lucide-react'
import Analytics from './components/Analytics'
import JourneyTable from './components/JourneyTable'
import MusicLibrary from './components/MusicLibrary'
import CreateJourneyForm from './components/CreateJourneyForm'

type Tab = 'dashboard' | 'create' | 'journeys' | 'music'

export default function AdminPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<Tab>('dashboard')

    const handleLogout = async () => {
        const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('admin_session='))
            ?.split('=')[1]

        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            })
        }

        document.cookie = 'admin_session=; path=/; max-age=0'
        router.push('/admin/login')
        router.refresh()
    }

    const tabs = [
        { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'create' as Tab, label: 'Create Journey', icon: Plus },
        { id: 'journeys' as Tab, label: 'Manage Journeys', icon: List },
        { id: 'music' as Tab, label: 'Music Library', icon: Music },
    ]

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <header className="border-b border-neutral-800 pb-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-serif text-rose-500">Valentine Engine Admin</h1>
                            <p className="text-neutral-400 mt-1">Manage your digital proposal journeys</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-white"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </header>

                {/* Tab Content */}
                <div className="pb-8">
                    {activeTab === 'dashboard' && <Analytics />}
                    {activeTab === 'create' && <CreateJourneyForm />}
                    {activeTab === 'journeys' && <JourneyTable />}
                    {activeTab === 'music' && <MusicLibrary />}
                </div>
            </div>
        </div>
    )
}
