'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabaseClient'
import { Heart, Lock, Music, Volume2, VolumeX } from 'lucide-react'

// Types
type Journey = {
    id: string
    slug: string
    partner_name: string
    proposer_name: string
    passcode: string
    photos: string[]
    music_url?: string
    is_accepted: boolean
}

export default function JourneyViewer({ journey }: { journey: Journey }) {
    const [isLocked, setIsLocked] = useState(true)
    const [passcode, setPasscode] = useState('')
    const [error, setError] = useState('')
    const [step, setStep] = useState<'splash' | 'story' | 'proposal' | 'accepted'>('splash')
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
    const [imagesLoaded, setImagesLoaded] = useState<boolean[]>(new Array(journey.photos.length).fill(false))
    const [currentImageLoading, setCurrentImageLoading] = useState(true)

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

    // Preload all images on component mount
    useEffect(() => {
        journey.photos.forEach((url, index) => {
            const img = new Image()
            img.src = url
            img.onload = () => {
                setImagesLoaded(prev => {
                    const updated = [...prev]
                    updated[index] = true
                    return updated
                })
            }
        })
    }, [journey.photos])

    // Track current image loading state
    useEffect(() => {
        setCurrentImageLoading(!imagesLoaded[currentPhotoIndex])
    }, [currentPhotoIndex, imagesLoaded])

    // Audio Setup
    useEffect(() => {
        if (journey.music_url) {
            const audioObj = new Audio(journey.music_url)
            audioObj.loop = true
            setAudio(audioObj)
        }
    }, [journey.music_url])

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
        // Simple case-insensitive check
        if (passcode.toLowerCase().trim() === journey.passcode.toLowerCase().trim()) {
            setIsLocked(false)
            setStep('story')
            // Try auto-playing music on interaction
            if (audio) {
                audio.play().then(() => setIsPlaying(true)).catch(() => { })
            }
        } else {
            setError('That key doesn\'t fit this lock.')
            // Shake animation trigger logic could go here
        }
    }

    // Story Sequence Logic
    useEffect(() => {
        if (step === 'story') {
            const timer = setInterval(() => {
                setCurrentPhotoIndex(prev => {
                    if (prev < journey.photos.length - 1) {
                        return prev + 1
                    } else {
                        clearInterval(timer)
                        // Wait a bit on the last photo then go to proposal
                        setTimeout(() => setStep('proposal'), 4000)
                        return prev
                    }
                })
            }, 5000) // 5 seconds per photo

            return () => clearInterval(timer)
        }
    }, [step, journey.photos.length])

    // Handle Yes
    const handleYes = async () => {
        try {
            await supabase
                .from('val_journeys')
                .update({ is_accepted: true })
                .eq('slug', journey.slug)

            triggerConfetti()
            setStep('accepted')
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

    // Variants needed for animations
    const fadeVariants: Variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 1 } },
        exit: { opacity: 0, transition: { duration: 1 } }
    }

    const kenBurnsVariants: Variants = {
        initial: { scale: 1.1, opacity: 0 },
        animate: {
            scale: 1,
            opacity: 1,
            transition: { duration: 6, ease: "easeOut" }
        },
        exit: { opacity: 0, transition: { duration: 1.5 } }
    }

    return (
        <div className="relative min-h-screen bg-black text-white overflow-hidden font-serif selection:bg-rose-500/30">

            {/* Music Control */}
            {audio && !isLocked && (
                <button
                    onClick={toggleMusic}
                    className="fixed top-6 right-6 z-50 p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors"
                >
                    {isPlaying ? <Volume2 className="w-5 h-5 text-rose-200" /> : <VolumeX className="w-5 h-5 text-neutral-400" />}
                </button>
            )}

            <AnimatePresence mode="wait">

                {/* === STEP 1: SPLASH SCREEN (ABSTRACT PASSCODE) === */}
                {step === 'splash' && (
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

                {/* === STEP 2: STORY (PHOTOS) === */}
                {step === 'story' && (
                    <motion.div
                        key="story"
                        className="fixed inset-0 bg-black"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentPhotoIndex} // Unique key triggers exit/enter
                                variants={kenBurnsVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="absolute inset-0 w-full h-full"
                            >
                                {/* Loading Skeleton */}
                                {currentImageLoading && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black animate-pulse" />
                                )}

                                {/* Image Layer */}
                                <img
                                    src={journey.photos[currentPhotoIndex]}
                                    alt="Memory"
                                    className={`w-full h-full object-cover transition-opacity duration-500 ${currentImageLoading ? 'opacity-0' : 'opacity-80'
                                        }`}
                                    onLoad={() => setCurrentImageLoading(false)}
                                />

                                {/* Vignette/Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                                {/* Optional Text Overlay per slide could go here */}
                                <div className="absolute bottom-20 left-0 right-0 text-center p-8">
                                    <p className="text-white/70 italic font-medium tracking-wider">
                                        {currentPhotoIndex === 0 && "It started with a moment..."}
                                        {currentPhotoIndex === 1 && "And grew into a lifetime..."}
                                        {currentPhotoIndex >= 2 && "Of memories and dreams..."}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* === STEP 3: PROPOSAL (FINAL) === */}
                {(step === 'proposal' || step === 'accepted') && (
                    <motion.div
                        key="proposal"
                        variants={fadeVariants}
                        initial="initial"
                        animate="animate"
                        className="relative min-h-screen flex flex-col items-center justify-center text-center p-6 z-20"
                    >
                        {/* Background from last photo but blurred and darkened */}
                        <div className="absolute inset-0 -z-10">
                            <img
                                src={journey.photos[journey.photos.length - 1]}
                                className="w-full h-full object-cover blur-2xl opacity-20"
                                alt="bg"
                            />
                            <div className="absolute inset-0 bg-black/60" />
                        </div>

                        <div className="max-w-xl mx-auto space-y-12">
                            <div className="space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5, duration: 1 }}
                                >
                                    <h2 className="text-rose-500 font-sans text-sm tracking-[0.3em] uppercase mb-4">
                                        The Question
                                    </h2>
                                    <h1 className="text-5xl md:text-7xl font-serif text-white leading-tight">
                                        {journey.partner_name}, <br />
                                        <span className="text-rose-100">will you be my Valentine?</span>
                                    </h1>
                                </motion.div>

                                {step === 'accepted' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="pt-8"
                                    >
                                        <p className="text-2xl text-rose-300 italic">
                                            Looking forward to it, {journey.proposer_name} x
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {step !== 'accepted' && (
                                <div className="flex flex-col md:flex-row gap-6 justify-center items-center pt-8">
                                    <button
                                        onClick={handleYes}
                                        className="px-12 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-serif text-xl tracking-wide shadow-lg shadow-rose-900/40 transform hover:scale-105 transition-all"
                                    >
                                        Yes, Absolutely
                                    </button>

                                    <button
                                        ref={noButtonRef}
                                        onMouseEnter={handleNoHover}
                                        onTouchStart={handleNoHover}
                                        className="px-8 py-4 bg-transparent border border-neutral-700 text-neutral-500 hover:text-white hover:border-white rounded-full font-sans text-sm tracking-widest uppercase transition-all"
                                    >
                                        No, Sorry
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
