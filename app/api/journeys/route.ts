import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'
import { journeySchema } from '@/lib/validation'
import { z } from 'zod'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate form data
        const validatedData = journeySchema.parse(body)

        // Sanitize inputs
        const sanitizedData = {
            ...validatedData,
            slug: validatedData.slug.trim().toLowerCase(),
            partner_name: validatedData.partner_name.trim(),
            proposer_name: validatedData.proposer_name.trim(),
            proposer_phone: validatedData.proposer_phone.trim(),
            passcode: validatedData.passcode.trim(),
        }

        // Insert using service role key to bypass RLS
        const { data, error } = await supabaseAdmin
            .from('valentine_journeys')
            .insert([
                {
                    slug: sanitizedData.slug,
                    partner_name: sanitizedData.partner_name,
                    proposer_name: sanitizedData.proposer_name,
                    proposer_phone: sanitizedData.proposer_phone,
                    passcode: sanitizedData.passcode,
                    music_url: sanitizedData.music_url || null,
                    photos: sanitizedData.photos,
                    is_accepted: false,
                },
            ])
            .select()

        if (error) throw error

        return NextResponse.json({
            success: true,
            journey: data[0]
        })
    } catch (error: any) {
        console.error('Error creating journey:', error)

        // Handle validation errors
        if (error instanceof z.ZodError) {
            const errors: Record<string, string> = {}
            error.issues.forEach((err: z.ZodIssue) => {
                if (err.path[0]) {
                    errors[err.path[0].toString()] = err.message
                }
            })
            return NextResponse.json(
                { error: 'Validation failed', validationErrors: errors },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
