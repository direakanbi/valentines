'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Heart, TrendingUp, Clock, Music } from 'lucide-react'

interface Stats {
    totalJourneys: number
    acceptedJourneys: number
    acceptanceRate: number
    recentJourneys: Array<{ slug: string; partner_name: string; created_at: string }>
}

export default function Analytics() {
    const [stats, setStats] = useState<Stats>({
        totalJourneys: 0,
        acceptedJourneys: 0,
        acceptanceRate: 0,
        recentJourneys: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        setLoading(true)

        // Fetch all journeys
        const { data: journeys, error } = await supabase
            .from('valentine_journeys')
            .select('slug, partner_name, created_at, is_accepted')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching stats:', error)
            setLoading(false)
            return
        }

        const total = journeys?.length || 0
        const accepted = journeys?.filter(j => j.is_accepted).length || 0
        const rate = total > 0 ? Math.round((accepted / total) * 100) : 0

        setStats({
            totalJourneys: total,
            acceptedJourneys: accepted,
            acceptanceRate: rate,
            recentJourneys: journeys?.slice(0, 5) || []
        })
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-400">Total Journeys</p>
                            <p className="text-3xl font-bold text-white mt-2">{stats.totalJourneys}</p>
                        </div>
                        <Heart className="w-8 h-8 text-rose-500" />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-400">Accepted</p>
                            <p className="text-3xl font-bold text-green-400 mt-2">{stats.acceptedJourneys}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-neutral-400">Acceptance Rate</p>
                            <p className="text-3xl font-bold text-rose-400 mt-2">{stats.acceptanceRate}%</p>
                        </div>
                        <Music className="w-8 h-8 text-rose-500" />
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-neutral-400" />
                    <h3 className="text-lg font-medium">Recent Activity</h3>
                </div>

                {stats.recentJourneys.length === 0 ? (
                    <p className="text-neutral-400 text-sm">No journeys yet</p>
                ) : (
                    <div className="space-y-3">
                        {stats.recentJourneys.map((journey) => (
                            <div key={journey.slug} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                                <div>
                                    <p className="font-medium">{journey.partner_name}</p>
                                    <p className="text-sm text-neutral-400 font-mono">/{journey.slug}</p>
                                </div>
                                <p className="text-sm text-neutral-500">
                                    {new Date(journey.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
