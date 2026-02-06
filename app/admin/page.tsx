'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Upload, Link as LinkIcon, Save, Loader2, X, Video, Image, Heart, Trash2, GripVertical, Music } from 'lucide-react'

type MediaItem = {
    type: 'image' | 'video'
    url: string
    caption: string
    section: 'gallery' | 'how_we_met' | 'love'
}

type LoveReason = {
    text: string
    media_url: string | null
}

export default function AdminPage() {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadingMusic, setUploadingMusic] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [formData, setFormData] = useState({
        slug: '',
        partner_name: '',
        proposer_name: '',
        passcode: '',
        music_url: '',
        photos: [] as string[], // Keep for backward compat
        media: [] as MediaItem[],
        how_we_met_text: '',
        love_text: '',
        love_reasons: [] as LoveReason[],
    })
    const [successLink, setSuccessLink] = useState('')
    const [activeTab, setActiveTab] = useState<'basics' | 'media' | 'story' | 'love'>('basics')
    const [loadingExisting, setLoadingExisting] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // Load existing journey data by slug
    const loadExistingJourney = async () => {
        if (!formData.slug.trim()) {
            alert('Please enter a slug first')
            return
        }

        setLoadingExisting(true)
        try {
            const { data, error } = await supabase
                .from('valentine_journeys')
                .select('*')
                .eq('slug', formData.slug.trim())
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    alert('No journey found with this slug. You can create a new one!')
                } else {
                    throw error
                }
                return
            }

            if (data) {
                setFormData({
                    slug: data.slug || '',
                    partner_name: data.partner_name || '',
                    proposer_name: data.proposer_name || '',
                    passcode: data.passcode || '',
                    music_url: data.music_url || '',
                    photos: data.photos || [],
                    media: data.media || [],
                    how_we_met_text: data.how_we_met_text || '',
                    love_text: data.love_text || '',
                    love_reasons: data.love_reasons || [],
                })
                alert('Journey loaded! You can now edit and save changes.')
            }
        } catch (error: any) {
            console.error('Error loading journey:', error)
            alert('Error loading journey: ' + error.message)
        } finally {
            setLoadingExisting(false)
        }
    }

    // Smart file type detection
    const getFileType = (file: File): 'image' | 'video' => {
        return file.type.startsWith('video/') ? 'video' : 'image'
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: MediaItem['section'] = 'gallery') => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const files = Array.from(e.target.files)
        setUploadProgress(`0/${files.length}`)

        try {
            const uploadPromises = files.map(async (file) => {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${formData.slug || 'temp'}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('valentine_photos')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('valentine_photos')
                    .getPublicUrl(filePath)

                setUploadProgress(prev => {
                    if (!prev) return prev
                    const [done, total] = prev.split('/').map(Number)
                    return `${done + 1}/${total}`
                })

                return {
                    type: getFileType(file),
                    url: publicUrl,
                    caption: '',
                    section: section
                } as MediaItem
            })

            const newMedia = await Promise.all(uploadPromises)

            setFormData(prev => ({
                ...prev,
                media: [...prev.media, ...newMedia],
                // Also update photos for backward compat (images only)
                photos: [
                    ...prev.photos,
                    ...newMedia.filter(m => m.type === 'image').map(m => m.url)
                ]
            }))
        } catch (error: any) {
            console.error('Error uploading file:', error)
            alert('Error uploading file: ' + error.message)
        } finally {
            setUploading(false)
            setUploadProgress('')
            e.target.value = ''
        }
    }

    const updateMediaItem = (index: number, updates: Partial<MediaItem>) => {
        setFormData(prev => ({
            ...prev,
            media: prev.media.map((m, i) => i === index ? { ...m, ...updates } : m)
        }))
    }

    const removeMediaItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            media: prev.media.filter((_, i) => i !== index),
            photos: prev.photos.filter(url => url !== prev.media[index]?.url)
        }))
    }

    // Love Reasons management
    const addLoveReason = () => {
        setFormData(prev => ({
            ...prev,
            love_reasons: [...prev.love_reasons, { text: '', media_url: null }]
        }))
    }

    const updateLoveReason = (index: number, updates: Partial<LoveReason>) => {
        setFormData(prev => ({
            ...prev,
            love_reasons: prev.love_reasons.map((r, i) => i === index ? { ...r, ...updates } : r)
        }))
    }

    const removeLoveReason = (index: number) => {
        setFormData(prev => ({
            ...prev,
            love_reasons: prev.love_reasons.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setSuccessLink('')

        try {
            // Validate media
            if (formData.media.length < 1 && formData.photos.length < 1) {
                alert('Please upload at least 1 photo or video.')
                setLoading(false)
                return
            }

            // Prepare photos array for backward compat
            const photosForDB = formData.media
                .filter(m => m.type === 'image')
                .map(m => m.url)

            const { data, error } = await supabase
                .from('valentine_journeys')
                .upsert([
                    {
                        slug: formData.slug,
                        partner_name: formData.partner_name,
                        proposer_name: formData.proposer_name,
                        passcode: formData.passcode,
                        music_url: formData.music_url || null,
                        photos: photosForDB.length > 0 ? photosForDB : formData.photos,
                        media: formData.media,
                        how_we_met_text: formData.how_we_met_text || null,
                        love_text: formData.love_text || null,
                        love_reasons: formData.love_reasons.filter(r => r.text.trim()),
                        proposer_phone: 'N/A', // Unused but required by DB
                        is_accepted: false,
                    },
                ], { onConflict: 'slug' })
                .select()

            if (error) throw error

            setSuccessLink(`${window.location.origin}/${formData.slug}`)
            alert('Journey created successfully!')
        } catch (error: any) {
            console.error('Full Error Object:', JSON.stringify(error, null, 2))
            const errorMsg = error.message || error.error_description || error.details || JSON.stringify(error, null, 2)
            alert('Error creating journey: ' + errorMsg)
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { id: 'basics', label: 'Basics', icon: '📝' },
        { id: 'media', label: 'Media', icon: '🖼️' },
        { id: 'story', label: 'Our Story', icon: '💑' },
        { id: 'love', label: 'Love Reasons', icon: '💕' },
    ] as const

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            <div className="max-w-4xl mx-auto p-6 md:p-8">
                {/* Header */}
                <header className="space-y-2 border-b border-neutral-800 pb-6 mb-8">
                    <h1 className="text-3xl font-serif text-rose-500">Valentine Engine Admin</h1>
                    <p className="text-neutral-400">Create a beautiful, multi-section proposal journey.</p>
                </header>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-rose-600 text-white'
                                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* === TAB: BASICS === */}
                    {activeTab === 'basics' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-300">Slug (URL Path) *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            name="slug"
                                            required
                                            placeholder="e.g. sarah-and-tom"
                                            value={formData.slug}
                                            onChange={handleInputChange}
                                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={loadExistingJourney}
                                            disabled={loadingExisting}
                                            className="px-4 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                        >
                                            {loadingExisting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Load Existing'
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-neutral-500">This will be: yoursite.com/{formData.slug || 'your-slug'} — Click "Load Existing" to edit an existing journey</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-300">Secret Passcode *</label>
                                    <input
                                        type="text"
                                        name="passcode"
                                        required
                                        placeholder="e.g. our-first-date or 10122020"
                                        value={formData.passcode}
                                        onChange={handleInputChange}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-300">Partner's Name *</label>
                                    <input
                                        type="text"
                                        name="partner_name"
                                        required
                                        placeholder="e.g. Sarah"
                                        value={formData.partner_name}
                                        onChange={handleInputChange}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-neutral-300">Your Name *</label>
                                    <input
                                        type="text"
                                        name="proposer_name"
                                        required
                                        placeholder="e.g. Tom"
                                        value={formData.proposer_name}
                                        onChange={handleInputChange}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-neutral-300">Background Music</label>

                                {/* Music preview if uploaded */}
                                {formData.music_url && (
                                    <div className="flex items-center gap-3 p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                                        <Music className="w-5 h-5 text-rose-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-neutral-300 truncate">{formData.music_url.split('/').pop()}</p>
                                            <audio src={formData.music_url} controls className="w-full h-8 mt-2" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, music_url: '' }))}
                                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Upload or URL input */}
                                {!formData.music_url && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* File Upload */}
                                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-700 rounded-lg hover:border-rose-500 hover:text-rose-400 transition-colors cursor-pointer">
                                            {uploadingMusic ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Upload MP3</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                disabled={uploadingMusic}
                                                onChange={async (e) => {
                                                    if (!e.target.files || e.target.files.length === 0) return
                                                    setUploadingMusic(true)
                                                    try {
                                                        const file = e.target.files[0]
                                                        const fileExt = file.name.split('.').pop()
                                                        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                                                        const filePath = `${formData.slug || 'temp'}/music/${fileName}`

                                                        const { error: uploadError } = await supabase.storage
                                                            .from('valentine_photos')
                                                            .upload(filePath, file)

                                                        if (uploadError) throw uploadError

                                                        const { data: { publicUrl } } = supabase.storage
                                                            .from('valentine_photos')
                                                            .getPublicUrl(filePath)

                                                        setFormData(prev => ({ ...prev, music_url: publicUrl }))
                                                    } catch (error: any) {
                                                        console.error('Error uploading music:', error)
                                                        alert('Error uploading music: ' + error.message)
                                                    } finally {
                                                        setUploadingMusic(false)
                                                        e.target.value = ''
                                                    }
                                                }}
                                            />
                                        </label>

                                        {/* Or paste URL */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="url"
                                                name="music_url"
                                                placeholder="Or paste music URL..."
                                                value={formData.music_url}
                                                onChange={handleInputChange}
                                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-neutral-500">Optional. Music plays throughout the experience.</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveTab('media')}
                                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300"
                            >
                                Next: Add Media →
                            </button>
                        </div>
                    )}

                    {/* === TAB: MEDIA === */}
                    {activeTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-white">Photos & Videos</h3>
                                        <p className="text-sm text-neutral-400">Upload images and videos for your gallery.</p>
                                    </div>
                                    <label className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-colors">
                                        {uploading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {uploading ? (uploadProgress ? `Uploading ${uploadProgress}` : 'Uploading...') : 'Upload'}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'gallery')}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>

                                {/* Media Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {formData.media.map((item, idx) => (
                                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900">
                                            {/* Thumbnail */}
                                            <div className="aspect-square relative">
                                                {item.type === 'video' ? (
                                                    <>
                                                        <video
                                                            src={item.url}
                                                            className="w-full h-full object-cover"
                                                            muted
                                                            playsInline
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                            <Video className="w-8 h-8 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                                                )}

                                                {/* Delete button */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeMediaItem(idx)}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4 text-white" />
                                                </button>

                                                {/* Type badge */}
                                                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                                                    {item.type === 'video' ? '🎬 Video' : '📷 Image'}
                                                </div>
                                            </div>

                                            {/* Caption & Section */}
                                            <div className="p-3 space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Caption (optional)"
                                                    value={item.caption}
                                                    onChange={(e) => updateMediaItem(idx, { caption: e.target.value })}
                                                    className="w-full text-sm bg-neutral-800 border-0 rounded px-2 py-1.5 text-white placeholder-neutral-500 focus:ring-1 focus:ring-rose-500"
                                                />
                                                <select
                                                    value={item.section}
                                                    onChange={(e) => updateMediaItem(idx, { section: e.target.value as MediaItem['section'] })}
                                                    className="w-full text-xs bg-neutral-800 border-0 rounded px-2 py-1.5 text-neutral-300"
                                                >
                                                    <option value="gallery">📸 Gallery</option>
                                                    <option value="how_we_met">💑 How We Met</option>
                                                    <option value="love">💕 Love Section</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty state / Add more */}
                                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-xl hover:border-rose-500 hover:text-rose-400 transition-colors cursor-pointer">
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                                                <span className="text-xs text-neutral-500 mt-2">
                                                    {uploadProgress ? `${uploadProgress}` : 'Uploading...'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-8 h-8 text-neutral-500" />
                                                <span className="text-xs text-neutral-500 mt-2">Add Media</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'gallery')}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>

                                <p className="text-xs text-neutral-500">
                                    Tip: Mark one item as "How We Met" to feature it in that section.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('basics')}
                                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('story')}
                                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300"
                                >
                                    Next: Our Story →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* === TAB: STORY === */}
                    {activeTab === 'story' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                        💑 How We Met
                                    </h3>
                                    <p className="text-sm text-neutral-400">Tell the story of how you two met. This appears in a beautiful cinematic section.</p>
                                </div>

                                <textarea
                                    name="how_we_met_text"
                                    placeholder="We first met on a rainy Tuesday in October. I saw you across the coffee shop, and from that moment I knew there was something special about you...

Write as much or as little as you'd like. Each paragraph will be displayed beautifully."
                                    value={formData.how_we_met_text}
                                    onChange={handleInputChange}
                                    rows={8}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none text-white placeholder-neutral-500 resize-none"
                                />

                                <p className="text-xs text-neutral-500">
                                    Tip: Use line breaks to create paragraphs. The first media you marked as "How We Met" will display behind this section.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('media')}
                                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('love')}
                                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300"
                                >
                                    Next: Love Reasons →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* === TAB: LOVE REASONS === */}
                    {activeTab === 'love' && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* Love Letter (Cinematic Text) */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                        💌 Love Letter
                                    </h3>
                                    <p className="text-sm text-neutral-400">Write a cinematic message about what you love. This appears as beautiful scrolling text.</p>
                                </div>

                                <textarea
                                    name="love_text"
                                    placeholder="My dearest, there are so many reasons why I love you...

The way you laugh, the way you light up every room you enter.

Write paragraphs separated by blank lines for a cinematic effect."
                                    value={formData.love_text}
                                    onChange={handleInputChange}
                                    rows={6}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:outline-none text-white placeholder-neutral-500 resize-none"
                                />

                                <p className="text-xs text-neutral-500">
                                    Tip: Use line breaks to create paragraphs. This will be displayed in the same cinematic style as "How We Met".
                                </p>
                            </div>

                            {/* Individual Love Reasons (Carousel) */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                                            💕 Quick Reasons (Carousel)
                                        </h3>
                                        <p className="text-sm text-neutral-400">Short reasons shown as a quick carousel before the love letter.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addLoveReason}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>

                                {/* Reasons list */}
                                <div className="space-y-3">
                                    {formData.love_reasons.map((reason, idx) => (
                                        <div key={idx} className="flex gap-3 items-start bg-neutral-900 rounded-lg p-4 border border-neutral-800">
                                            <div className="text-rose-500 mt-1">
                                                <Heart className="w-5 h-5" fill="currentColor" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder={`Reason ${idx + 1}: e.g. "Your beautiful smile"`}
                                                    value={reason.text}
                                                    onChange={(e) => updateLoveReason(idx, { text: e.target.value })}
                                                    className="w-full bg-transparent border-b border-neutral-700 py-2 text-white placeholder-neutral-500 focus:border-rose-500 focus:outline-none"
                                                />
                                                <input
                                                    type="url"
                                                    placeholder="Optional: Image/Video URL for this reason"
                                                    value={reason.media_url || ''}
                                                    onChange={(e) => updateLoveReason(idx, { media_url: e.target.value || null })}
                                                    className="w-full text-xs bg-neutral-800 border-0 rounded px-3 py-2 text-neutral-300 placeholder-neutral-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeLoveReason(idx)}
                                                className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    {formData.love_reasons.length === 0 && (
                                        <div className="text-center py-8 text-neutral-500">
                                            <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>No reasons added yet.</p>
                                            <p className="text-sm">Click "Add" to start listing what you love!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('story')}
                                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-300"
                                >
                                    ← Back
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-medium py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/30"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                                {loading ? 'Creating Your Journey...' : '💝 Generate Proposal Link'}
                            </button>
                        </div>
                    )}
                </form>

                {/* Success Message */}
                {successLink && (
                    <div className="mt-8 p-6 bg-green-900/20 border border-green-800 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-green-400 font-medium flex items-center gap-2 text-lg">
                            <LinkIcon className="w-5 h-5" />
                            🎉 Journey Created Successfully!
                        </h3>
                        <p className="text-neutral-400 text-sm">Share this link with your special someone:</p>
                        <div className="flex items-center gap-2 bg-black/30 p-3 rounded-lg">
                            <code className="text-sm flex-1 break-all text-green-200">{successLink}</code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(successLink)
                                    alert('Link copied!')
                                }}
                                className="text-sm bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-white font-medium"
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
