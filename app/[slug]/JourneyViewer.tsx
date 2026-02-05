'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabaseClient'
import { Heart, Lock, Volume2, VolumeX } from 'lucide-react'

// Import new components
import MediaGallery from './components/MediaGallery'
import HowWeMetSection from './components/HowWeMetSection'
import LoveReasonsSection from './components/LoveReasonsSection'

// Types
type MediaItem = {
    type: 'image' | 'video'
    url: string
    caption?: string
    section?: 'gallery' | 'how_we_met' | 'love'
}

type LoveReason = {
    text: string
    media_url?: string | null
    media_type?: 'image' | 'video'
}

type Journey = {
    id: string
    slug: string
    partner_name: string
    proposer_name: string
    passcode: string
    photos: string[]
    media?: MediaItem[]
    how_we_met_text?: string
    love_reasons?: LoveReason[]
    music_url?: string
    is_accepted: boolean
}

type Phase = 'loading' | 'splash' | 'hero' | 'gallery' | 'story' | 'reasons' | 'proposal' | 'accepted'

export default function JourneyViewer({ journey }: { journey: Journey }) {
    const [phase, setPhase] = useState<Phase>('loading')
    const [loadProgress, setLoadProgress] = useState(0)
    const [passcode, setPasscode] = useState('')
    const [error, setError] = useState('')
    const [isPlaying, setIsPlaying] = useState(false)
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

    // Process media - fallback to photos if no media array
    const allMedia: MediaItem[] = journey.media && journey.media.length > 0
        ? journey.media
        : journey.photos.map(url => ({
            type: 'image' as const,
            url,
            section: 'gallery' as const
        }))

    // Get featured media for How We Met section
    const howWeMetMedia = allMedia.find(m => m.section === 'how_we_met') || allMedia[0]

    // Process love reasons - add media type detection
    const loveReasons: LoveReason[] = journey.love_reasons && journey.love_reasons.length > 0
        ? journey.love_reasons.map(r => ({
            ...r,
            media_type: r.media_url?.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image'
        }))
        : []

    // Collect all URLs to preload
    const getAllAssetUrls = useCallback(() => {
        const urls: { url: string; type: 'image' | 'video' | 'audio' }[] = []

        // Add all media
        allMedia.forEach(m => {
            urls.push({ url: m.url, type: m.type })
        })

        // Add love reasons media
        loveReasons.forEach(r => {
            if (r.media_url) {
                urls.push({ url: r.media_url, type: r.media_type || 'image' })
            }
        })

        // Add music
        if (journey.music_url) {
            urls.push({ url: journey.music_url, type: 'audio' })
        }

        return urls
    }, [allMedia, loveReasons, journey.music_url])

    // Preload all assets (lightweight - only metadata for videos)
    useEffect(() => {
        // Only run during loading phase
        if (phase !== 'loading') return

        const assets = getAllAssetUrls()
        if (assets.length === 0) {
            setPhase('splash')
            return
        }

        let loaded = 0
        const total = assets.length
        let hasTransitioned = false

        const updateProgress = () => {
            loaded++
            setLoadProgress(Math.round((loaded / total) * 100))
            if (loaded === total && !hasTransitioned) {
                hasTransitioned = true
                // Small delay for visual polish
                setTimeout(() => setPhase('splash'), 300)
            }
        }

        assets.forEach(({ url, type }) => {
            if (type === 'image') {
                const img = new Image()
                img.onload = updateProgress
                img.onerror = updateProgress
                img.src = url
            } else if (type === 'video') {
                // Only load metadata, not the full video (prevents lag)
                const video = document.createElement('video')
                video.preload = 'metadata'
                video.onloadedmetadata = updateProgress
                video.onerror = updateProgress
                video.src = url
            } else if (type === 'audio') {
                const audioEl = new Audio()
                audioEl.preload = 'metadata'
                audioEl.onloadedmetadata = () => {
                    audioEl.loop = true
                    setAudio(audioEl)
                    updateProgress()
                }
                audioEl.onerror = updateProgress
                audioEl.src = url
            }
        })

        // Fallback timeout - don't block forever
        const timeout = setTimeout(() => {
            if (!hasTransitioned) {
                hasTransitioned = true
                setPhase('splash')
            }
        }, 15000)

        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Run only once on mount

    // Play Music
    const toggleMusic = () => {
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play().catch(e => console.log('Audio play blocked:', e))
        }
        setIsPlaying(!isPlaying)
    }

    // Handle Unlock
    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault()
        if (passcode.toLowerCase().trim() === journey.passcode.toLowerCase().trim()) {
            setPhase('hero')
            // Try auto-playing music on interaction
            if (audio) {
                audio.play().then(() => setIsPlaying(true)).catch(() => { })
            }
            // Auto-advance from hero to gallery after 4 seconds
            setTimeout(() => {
                setPhase('gallery')
            }, 4000)
        } else {
            setError('That key doesn\'t fit this lock.')
        }
    }

    // Confetti trigger
    const triggerConfetti = () => {
        const count = 200
        const defaults = {
            origin: { y: 0.7 },
            zIndex: 9999,
        }

        function fire(particleRatio: number, opts: any) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio),
            })
        }

        fire(0.25, { spread: 26, startVelocity: 55 })
        fire(0.2, { spread: 60 })
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
        fire(0.1, { spread: 120, startVelocity: 45 })
    }

    // Handle Yes
    const handleYes = async () => {
        try {
            await supabase
                .from('valentine_journeys')
                .update({ is_accepted: true })
                .eq('slug', journey.slug)

            triggerConfetti()
            setPhase('accepted')
        } catch (err) {
            console.error('Error updating status:', err)
        }
    }

    // "No" Button Runaway Logic
    const noButtonRef = useRef<HTMLButtonElement>(null)
    const handleNoHover = () => {
        if (noButtonRef.current) {
            const x = Math.random() * (window.innerWidth - 100)
            const y = Math.random() * (window.innerHeight - 50)
            noButtonRef.current.style.position = 'fixed'
            noButtonRef.current.style.left = `${x}px`
            noButtonRef.current.style.top = `${y}px`
            noButtonRef.current.style.transition = 'all 0.3s ease'
        }
    }

    const fadeVariants: Variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 1, ease: 'easeInOut' } },
        exit: { opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }
    }

    return (
        <div className="relative bg-black text-white overflow-hidden h-screen w-screen font-serif selection:bg-rose-500/30">

            {/* Music Control */}
            {audio && phase !== 'loading' && phase !== 'splash' && (
                <button
                    onClick={toggleMusic}
                    className="fixed top-6 right-6 z-50 p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors"
                >
                    {isPlaying ? <Volume2 className="w-5 h-5 text-rose-200" /> : <VolumeX className="w-5 h-5 text-neutral-400" />}
                </button>
            )}

            <AnimatePresence mode="wait">

                {/* === LOADING SCREEN === */}
                {phase === 'loading' && (
                    <motion.div
                        key="loading"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="text-center space-y-8"
                        >
                            <Heart className="w-12 h-12 text-rose-500 mx-auto animate-pulse" fill="currentColor" />

                            <div className="space-y-3">
                                <p className="text-neutral-400 font-sans text-sm tracking-[0.3em] uppercase">
                                    Preparing your journey
                                </p>

                                {/* Progress Bar */}
                                <div className="w-48 h-0.5 bg-neutral-900 rounded-full mx-auto overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400"
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${loadProgress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>

                                <p className="text-neutral-600 font-sans text-xs">
                                    {loadProgress}%
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* === SPLASH (LOCKED) === */}
                {phase === 'splash' && (
                    <motion.div
                        key="splash"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex flex-col items-center justify-center min-h-screen p-6 relative"
                    >
                        {/* Ambient Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black opacity-80" />

                        <div className="relative z-10 w-full max-w-md space-y-8 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 shadow-2xl shadow-rose-900/20">
                                <Lock className="w-6 h-6 text-rose-500" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-3xl md:text-4xl italic text-neutral-200 tracking-wide">
                                    The Gate
                                </h1>
                                <p className="text-neutral-500 font-sans text-sm tracking-widest uppercase">
                                    A Secret Key Required
                                </p>
                            </div>

                            <form onSubmit={handleUnlock} className="space-y-6 pt-4">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={passcode}
                                        onChange={(e) => {
                                            setPasscode(e.target.value)
                                            setError('')
                                        }}
                                        placeholder="Enter the secret..."
                                        className="w-full bg-transparent border-b-2 border-neutral-800 py-3 px-4 text-center text-xl text-white placeholder-neutral-700 outline-none focus:border-rose-500 transition-colors group-hover:border-neutral-700"
                                        autoFocus
                                    />
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="absolute -bottom-8 left-0 right-0 text-red-500 text-xs font-sans tracking-wide"
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-sans font-medium hover:text-white transition-colors"
                                    >
                                        <span className="absolute inset-0 border border-neutral-800 group-hover:border-rose-900/50 transition-colors rounded-full" />
                                        <span className="relative text-neutral-400 group-hover:text-rose-200 transition-colors tracking-widest uppercase">
                                            Unlock Moment
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}

                {/* === HERO INTRO === */}
                {phase === 'hero' && (
                    <motion.div
                        key="hero"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 z-40 bg-black flex items-center justify-center"
                    >
                        <div className="absolute inset-0 z-0">
                            {allMedia[0]?.type === 'video' ? (
                                <video
                                    src={allMedia[0].url}
                                    className="w-full h-full object-cover opacity-30"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={allMedia[0]?.url}
                                    alt=""
                                    className="w-full h-full object-cover opacity-30"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black" />
                        </div>

                        <div className="relative z-10 text-center px-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 1.5 }}
                            >
                                <Heart className="w-16 h-16 text-rose-500 mx-auto mb-8 animate-pulse" fill="currentColor" />
                                <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">
                                    {journey.partner_name}
                                </h1>
                                <p className="text-xl text-neutral-400 font-sans tracking-[0.2em] uppercase">
                                    A journey of us
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {/* === GALLERY SLIDESHOW === */}
                {phase === 'gallery' && (
                    <motion.div
                        key="gallery"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 z-30 bg-black"
                    >
                        <MediaGallery
                            media={allMedia}
                            onComplete={() => setPhase('story')}
                        />
                    </motion.div>
                )}

                {/* === OUR STORY === */}
                {phase === 'story' && (
                    <motion.div
                        key="story"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 z-30 bg-black"
                    >
                        <HowWeMetSection
                            text={journey.how_we_met_text}
                            featuredMedia={howWeMetMedia}
                            partnerName={journey.partner_name}
                            proposerName={journey.proposer_name}
                            onComplete={() => setPhase('reasons')}
                        />
                    </motion.div>
                )}

                {/* === LOVE REASONS === */}
                {phase === 'reasons' && (
                    <motion.div
                        key="reasons"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-0 z-30 bg-black"
                    >
                        <LoveReasonsSection
                            reasons={loveReasons}
                            partnerName={journey.partner_name}
                            onComplete={() => setPhase('proposal')}
                        />
                    </motion.div>
                )}

                {/* === PROPOSAL (FINAL) === */}
                {(phase === 'proposal' || phase === 'accepted') && (
                    <motion.div
                        key="proposal"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        className="fixed inset-0 z-30 bg-black"
                    >
                        <section className="relative h-full flex flex-col items-center justify-center text-center p-6">
                            {/* Background */}
                            <div className="absolute inset-0 -z-10">
                                <img
                                    src={allMedia[allMedia.length - 1]?.url}
                                    className="w-full h-full object-cover blur-3xl opacity-20"
                                    alt="bg"
                                />
                                <div className="absolute inset-0 bg-black/50" />
                            </div>

                            <div className="max-w-3xl mx-auto space-y-12">
                                <div className="space-y-6">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5, duration: 1.5 }}
                                    >
                                        <h2 className="text-rose-500 font-sans text-sm tracking-[0.3em] uppercase mb-8">
                                            The One Question
                                        </h2>
                                        <h1 className="text-6xl md:text-8xl font-serif text-white leading-tight">
                                            {journey.partner_name}, <br />
                                            <span className="text-rose-200 block mt-4">will you be my Valentine?</span>
                                        </h1>
                                    </motion.div>

                                    {phase === 'accepted' ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="pt-12"
                                        >
                                            <p className="text-3xl text-rose-300 italic font-serif">
                                                Looking forward to it, {journey.proposer_name} x
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1.5 }}
                                            className="flex flex-col md:flex-row gap-8 justify-center items-center pt-16"
                                        >
                                            <button
                                                onClick={handleYes}
                                                className="px-16 py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-serif text-xl tracking-wide shadow-2xl shadow-rose-900/50 transform hover:scale-105 transition-all"
                                            >
                                                Yes, Absolutely
                                            </button>

                                            <button
                                                ref={noButtonRef}
                                                onMouseEnter={handleNoHover}
                                                onTouchStart={handleNoHover}
                                                className="px-10 py-5 bg-transparent border border-neutral-800 text-neutral-600 hover:text-white hover:border-white rounded-full font-sans text-xs tracking-widest uppercase transition-all"
                                            >
                                                No, Sorry
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
