'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Upload, Link as LinkIcon, Save, Loader2, X } from 'lucide-react'

export default function AdminPage() {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [formData, setFormData] = useState({
        slug: '',
        partner_name: '',
        proposer_name: '',
        proposer_phone: '',
        passcode: '',
        music_url: '',
        photos: [] as string[],
    })
    const [successLink, setSuccessLink] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // Helper function to compress images
    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')

                    // Max dimensions
                    const MAX_WIDTH = 1920
                    const MAX_HEIGHT = 1080

                    let width = img.width
                    let height = img.height

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = (height * MAX_WIDTH) / width
                            width = MAX_WIDTH
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = (width * MAX_HEIGHT) / height
                            height = MAX_HEIGHT
                        }
                    }

                    canvas.width = width
                    canvas.height = height

                    ctx?.drawImage(img, 0, 0, width, height)

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                })
                                resolve(compressedFile)
                            } else {
                                reject(new Error('Compression failed'))
                            }
                        },
                        'image/jpeg',
                        0.8 // Quality: 0.8 = 80%
                    )
                }
                img.onerror = reject
            }
            reader.onerror = reject
        })
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const files = Array.from(e.target.files)
        const newPhotos: string[] = []

        try {
            for (const file of files) {
                // Compress image before upload
                const compressedFile = await compressImage(file)

                const fileExt = 'jpg' // Always use jpg after compression
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${formData.slug || 'temp'}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('valentine_photos')
                    .upload(filePath, compressedFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('valentine_photos')
                    .getPublicUrl(filePath)

                newPhotos.push(publicUrl)
            }

            setFormData(prev => ({
                ...prev,
                photos: [...prev.photos, ...newPhotos]
            }))
        } catch (error: any) {
            console.error('Error uploading image:', error)
            alert('Error uploading image: ' + error.message)
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessLink('')

        try {
            // Validate photos
            if (formData.photos.length < 3) {
                alert('Please upload at least 3 photos for the story.')
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('val_journeys')
                .insert([
                    {
                        slug: formData.slug,
                        partner_name: formData.partner_name,
                        proposer_name: formData.proposer_name,
                        proposer_phone: formData.proposer_phone,
                        passcode: formData.passcode,
                        music_url: formData.music_url,
                        photos: formData.photos, // store as JSON array
                        is_accepted: false,
                    },
                ])
                .select()

            if (error) throw error

            setSuccessLink(`${window.location.origin}/${formData.slug}`)
            alert('Journey created successfully!')
        } catch (error: any) {
            console.error('Error creating journey:', error)
            alert('Error creating journey: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <header className="space-y-2 border-b border-neutral-800 pb-6">
                    <h1 className="text-3xl font-serif text-rose-500">Valentine Engine Admin</h1>
                    <p className="text-neutral-400">Create a new digital proposal journey.</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Slug (URL Path)</label>
                            <input
                                type="text"
                                name="slug"
                                required
                                placeholder="e.g. sarah-and-tom"
                                value={formData.slug}
                                onChange={handleInputChange}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Passcode (Answer)</label>
                            <input
                                type="text"
                                name="passcode"
                                required
                                placeholder="e.g. 10122020 or 'Paris'"
                                value={formData.passcode}
                                onChange={handleInputChange}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Partner Name</label>
                            <input
                                type="text"
                                name="partner_name"
                                required
                                placeholder="e.g. Sarah"
                                value={formData.partner_name}
                                onChange={handleInputChange}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Proposer Name</label>
                            <input
                                type="text"
                                name="proposer_name"
                                required
                                placeholder="e.g. Tom"
                                value={formData.proposer_name}
                                onChange={handleInputChange}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-300">Proposer Phone</label>
                            <input
                                type="tel"
                                name="proposer_phone"
                                required
                                placeholder="e.g. +1234567890"
                                value={formData.proposer_phone}
                                onChange={handleInputChange}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">Background Music (MP3 URL)</label>
                        <input
                            type="url"
                            name="music_url"
                            placeholder="https://example.com/song.mp3"
                            value={formData.music_url}
                            onChange={handleInputChange}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-neutral-300 block">Story Photos (3-5 Recommended)</label>
                        <div className="flex flex-wrap gap-4">
                            {formData.photos.map((url, idx) => (
                                <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-neutral-700 group">
                                    <img src={url} alt={`Story ${idx}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(mock => ({ ...mock, photos: mock.photos.filter((_, i) => i !== idx) }))}
                                        className="absolute top-0 right-0 bg-red-500/80 text-white p-1 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-lg hover:border-rose-500 hover:text-rose-500 transition-colors cursor-pointer relative">
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6" />
                                        <span className="text-[10px] mt-1 font-medium">Upload</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <p className="text-xs text-neutral-500">Images upload to &apos;valentine_photos&apos; bucket automatically.</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {loading ? 'Creating Journey...' : 'Generate Proposal Link'}
                        </button>
                    </div>
                </form>

                {successLink && (
                    <div className="mt-8 p-4 bg-green-900/20 border border-green-800 rounded-lg space-y-2 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-green-400 font-medium flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Journey Live!
                        </h3>
                        <div className="flex items-center gap-2 bg-black/30 p-2 rounded">
                            <code className="text-sm flex-1 break-all text-green-200">{successLink}</code>
                            <button
                                onClick={() => navigator.clipboard.writeText(successLink)}
                                className="text-xs bg-green-800 hover:bg-green-700 px-2 py-1 rounded text-white"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
