
import { supabase } from '@/lib/supabaseClient'
import { notFound } from 'next/navigation'
import JourneyViewer from './JourneyViewer'
import type { Metadata } from 'next'

// Disable caching for this route to ensure instant updates
export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params

    const { data: journey } = await supabase
        .from('valentine_journeys')
        .select('partner_name')
        .eq('slug', slug)
        .single()

    if (!journey) return { title: 'Valentine Proposal' }

    return {
        title: `For ${journey.partner_name} | A Special Question`,
        description: 'A dedicated digital experience.',
    }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    const { data: journey, error } = await supabase
        .from('valentine_journeys')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error || !journey) {
        notFound()
    }

    return <JourneyViewer journey={journey} />
}
