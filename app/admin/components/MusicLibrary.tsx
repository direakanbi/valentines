'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, Trash2, Play, Pause, Music } from 'lucide-react'

interface MusicFile {
    name: string
    url: string
    size: number
    created_at: string
}

export default function MusicLibrary() {
    const [musicFiles, setMusicFiles] = useState<MusicFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [playingUrl, setPlayingUrl] = useState<string | null>(null)
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

    useEffect(() => {
        fetchMusic()
    }, [])

    useEffect(() => {
        // Cleanup audio on unmount
        return () => {
            if (audio) {
                audio.pause()
                audio.src = ''
            }
        }
    }, [audio])

    const fetchMusic = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/music')
            const data = await response.json()

            if (!response.ok) throw new Error(data.error)

            setMusicFiles(data.files || [])
        } catch (error: any) {
            console.error('Error fetching music:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert('Please upload an audio file (MP3, WAV, etc.)')
            setUploading(false)
            return
        }

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/music', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.error)

            await fetchMusic()
            alert('Music uploaded successfully!')
        } catch (error: any) {
            console.error('Upload error:', error)
            alert('Error uploading music: ' + error.message)
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleDelete = async (fileName: string) => {
        if (!confirm(`Delete "${fileName}"?`)) return

        try {
            const response = await fetch('/api/music', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName })
            })

            const data = await response.json()

            if (!response.ok) throw new Error(data.error)

            setMusicFiles(musicFiles.filter(f => f.name !== fileName))
            if (playingUrl && playingUrl.includes(fileName)) {
                stopAudio()
            }
        } catch (error: any) {
            console.error('Delete error:', error)
            alert('Error deleting file: ' + error.message)
        }
    }

    const togglePlay = (url: string) => {
        if (playingUrl === url) {
            stopAudio()
        } else {
            playAudio(url)
        }
    }

    const playAudio = (url: string) => {
        if (audio) {
            audio.pause()
        }
        const newAudio = new Audio(url)
        newAudio.play()
        newAudio.onended = () => setPlayingUrl(null)
        setAudio(newAudio)
        setPlayingUrl(url)
    }

    const stopAudio = () => {
        if (audio) {
            audio.pause()
            audio.currentTime = 0
        }
        setPlayingUrl(null)
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-rose-500" />
                    Upload Music
                </h3>
                <label className="block">
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleUpload}
                        disabled={uploading}
                        className="block w-full text-sm text-neutral-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-lg file:border-0
                            file:text-sm file:font-medium
                            file:bg-rose-600 file:text-white
                            hover:file:bg-rose-700
                            file:cursor-pointer cursor-pointer
                            disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </label>
                {uploading && (
                    <p className="text-sm text-neutral-400 mt-2">Uploading...</p>
                )}
            </div>

            {/* Music List */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5 text-rose-500" />
                    Music Library ({musicFiles.length})
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                    </div>
                ) : musicFiles.length === 0 ? (
                    <p className="text-neutral-400 text-center py-8">No music files uploaded yet</p>
                ) : (
                    <div className="space-y-2">
                        {musicFiles.map((file) => (
                            <div
                                key={file.name}
                                className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        onClick={() => togglePlay(file.url)}
                                        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex-shrink-0"
                                    >
                                        {playingUrl === file.url ? (
                                            <Pause className="w-4 h-4 text-rose-400" />
                                        ) : (
                                            <Play className="w-4 h-4 text-neutral-400" />
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(file.name)}
                                    className="p-2 hover:bg-red-900/30 rounded-lg transition-colors text-neutral-400 hover:text-red-400 flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
