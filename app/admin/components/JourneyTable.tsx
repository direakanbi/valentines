'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Trash2, ExternalLink, Copy, Check } from 'lucide-react'

interface Journey {
    slug: string
    partner_name: string
    proposer_name: string
    created_at: string
    is_accepted: boolean
}

export default function JourneyTable() {
    const [journeys, setJourneys] = useState<Journey[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

    useEffect(() => {
        fetchJourneys()
    }, [])

    const fetchJourneys = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('valentine_journeys')
            .select('slug, partner_name, proposer_name, created_at, is_accepted')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching journeys:', error)
        } else {
            setJourneys(data || [])
        }
        setLoading(false)
    }

    const handleDelete = async (slug: string) => {
        if (!confirm(`Delete journey "${slug}"? This cannot be undone.`)) return

        const { error } = await supabase
            .from('valentine_journeys')
            .delete()
            .eq('slug', slug)

        if (error) {
            alert('Error deleting journey: ' + error.message)
        } else {
            setJourneys(journeys.filter(j => j.slug !== slug))
        }
    }

    const copyLink = (slug: string) => {
        const url = `${window.location.origin}/${slug}`
        navigator.clipboard.writeText(url)
        setCopiedSlug(slug)
        setTimeout(() => setCopiedSlug(null), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
        )
    }

    if (journeys.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-400">
                <p>No journeys created yet.</p>
                <p className="text-sm mt-2">Create your first journey in the "Create" tab!</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-neutral-800">
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-300">Slug</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-300">Partner</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-300">Proposer</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-300">Created</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-300">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-neutral-300">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {journeys.map((journey) => (
                        <tr key={journey.slug} className="border-b border-neutral-800 hover:bg-neutral-900/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-sm text-rose-400">{journey.slug}</td>
                            <td className="py-3 px-4">{journey.partner_name}</td>
                            <td className="py-3 px-4">{journey.proposer_name}</td>
                            <td className="py-3 px-4 text-sm text-neutral-400">
                                {new Date(journey.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                                {journey.is_accepted ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-400 border border-green-800">
                                        Accepted ✓
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-neutral-800 text-neutral-400 border border-neutral-700">
                                        Pending
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => copyLink(journey.slug)}
                                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                                        title="Copy link"
                                    >
                                        {copiedSlug === journey.slug ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                    <a
                                        href={`/${journey.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                                        title="View journey"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(journey.slug)}
                                        className="p-2 hover:bg-red-900/30 rounded-lg transition-colors text-neutral-400 hover:text-red-400"
                                        title="Delete journey"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
