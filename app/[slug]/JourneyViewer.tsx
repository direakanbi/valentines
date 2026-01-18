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
                .from('valentine_journeys')
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
                        className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden"
                    >
                        {/* 3D Floating Hearts Background */}
                        <div className="absolute inset-0">
                            {[...Array(20)].map((_, i) => {
                                // Use safe dimensions that work during SSR
                                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
                                const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080

                                return (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        initial={{
                                            x: Math.random() * screenWidth,
                                            y: screenHeight + 100,
                                            rotate: Math.random() * 360,
                                            scale: 0.5 + Math.random() * 0.5
                                        }}
                                        animate={{
                                            y: -100,
                                            rotate: 360 + Math.random() * 360,
                                            x: Math.random() * screenWidth
                                        }}
                                        transition={{
                                            duration: 15 + Math.random() * 10,
                                            repeat: Infinity,
                                            delay: Math.random() * 5,
                                            ease: "linear"
                                        }}
                                        style={{
                                            filter: 'blur(1px)',
                                            opacity: 0.1 + Math.random() * 0.2
                                        }}
                                    >
                                        <Heart className="w-8 h-8 text-rose-500 fill-rose-500/30" />
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Gradient Orbs */}
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                        {/* Main Gate Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 50, rotateX: 20 }}
                            animate={{ opacity: 1, y: 0, rotateX: 0 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative z-10 w-full max-w-lg"
                            style={{ perspective: '1000px' }}
                        >
                            {/* Glassmorphism Card */}
                            <div className="relative backdrop-blur-2xl bg-gradient-to-br from-neutral-900/80 via-neutral-900/60 to-neutral-900/80 border border-neutral-800/50 rounded-3xl p-12 shadow-2xl">
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent animate-shimmer" />
                                </div>

                                {/* Lock Icon with 3D Effect */}
                                <motion.div
                                    animate={{
                                        rotateY: [0, 360],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-500/20 mb-8"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <Lock className="w-10 h-10 text-rose-400" />
                                </motion.div>

                                {/* Title */}
                                <div className="space-y-3 mb-10 text-center">
                                    <motion.h1
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-5xl md:text-6xl font-serif bg-gradient-to-r from-rose-200 via-pink-200 to-rose-200 bg-clip-text text-transparent"
                                        style={{
                                            textShadow: '0 0 30px rgba(244, 114, 182, 0.3)'
                                        }}
                                    >
                                        For {journey.partner_name}
                                    </motion.h1>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-neutral-400 font-sans text-sm tracking-[0.3em] uppercase"
                                    >
                                        A Journey Awaits You
                                    </motion.p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleUnlock} className="space-y-8">
                                    <div className="relative">
                                        {/* Input with 3D effect */}
                                        <motion.div
                                            whileFocus={{ scale: 1.02 }}
                                            className="relative"
                                        >
                                            <input
                                                type="text"
                                                value={passcode}
                                                onChange={(e) => {
                                                    setPasscode(e.target.value)
                                                    setError('')
                                                }}
                                                placeholder="Enter the secret key..."
                                                className="w-full bg-neutral-950/50 border-2 border-neutral-800/50 rounded-2xl py-4 px-6 text-center text-lg text-white placeholder-neutral-600 outline-none focus:border-rose-500/50 focus:shadow-lg focus:shadow-rose-500/20 transition-all backdrop-blur-sm"
                                                autoFocus
                                                style={{
                                                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
                                                }}
                                            />
                                            {/* Floating particles on focus */}
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-400 rounded-full blur-sm animate-ping" />
                                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full blur-sm animate-ping" style={{ animationDelay: '0.5s' }} />
                                        </motion.div>

                                        {/* Error Message */}
                                        <AnimatePresence>
                                            {error && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute -bottom-8 left-0 right-0 text-red-400 text-xs font-sans tracking-wide text-center"
                                                >
                                                    {error}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Submit Button with 3D Hover */}
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.05, rotateX: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-full relative group overflow-hidden rounded-2xl"
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* Animated gradient background */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                        {/* Button content */}
                                        <span className="relative flex items-center justify-center gap-3 px-8 py-4 text-white font-medium tracking-wider">
                                            <Heart className="w-5 h-5 fill-white" />
                                            Unlock Your Journey
                                            <Heart className="w-5 h-5 fill-white" />
                                        </span>
                                    </motion.button>
                                </form>

                                {/* Decorative elements */}
                                <div className="absolute -top-3 -right-3 w-24 h-24 bg-gradient-to-br from-rose-500/20 to-transparent rounded-full blur-2xl" />
                                <div className="absolute -bottom-3 -left-3 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-transparent rounded-full blur-2xl" />
                            </div>
                        </motion.div>

                        {/* Bottom hint text */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="relative z-10 mt-8 text-neutral-600 text-xs tracking-widest uppercase"
                        >
                            Created with love by {journey.proposer_name}
                        </motion.p>
                    </motion.div>
                )
                }

                {/* === STEP 2: STORY (PHOTOS) === */}
                {
                    step === 'story' && (
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
                    )
                }

                {/* === STEP 3: PROPOSAL (FINAL) === */}
                {
                    (step === 'proposal' || step === 'accepted') && (
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
                    )
                }
            </AnimatePresence >
        </div >
    )
}
