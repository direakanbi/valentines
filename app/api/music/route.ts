import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from('valentine_music')
            .list()

        if (error) throw error

        const files = data?.map(file => {
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('valentine_music')
                .getPublicUrl(file.name)

            return {
                name: file.name,
                url: publicUrl,
                size: file.metadata?.size || 0,
                created_at: file.created_at || ''
            }
        }) || []

        return NextResponse.json({ files })
    } catch (error: any) {
        console.error('Error fetching music:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            return NextResponse.json(
                { error: 'File must be an audio file' },
                { status: 400 }
            )
        }

        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        const { error: uploadError } = await supabaseAdmin.storage
            .from('valentine_music')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('valentine_music')
            .getPublicUrl(fileName)

        return NextResponse.json({
            success: true,
            file: {
                name: fileName,
                url: publicUrl,
                size: file.size
            }
        })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { fileName } = await request.json()

        if (!fileName) {
            return NextResponse.json(
                { error: 'No file name provided' },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin.storage
            .from('valentine_music')
            .remove([fileName])

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
