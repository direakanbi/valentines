'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ChevronLeft, ChevronRight, Play } from 'lucide-react'

type LoveReason = {
    text: string
    media_url?: string | null
    media_type?: 'image' | 'video'
}

interface LoveReasonsSectionProps {
    reasons: LoveReason[]
    partnerName: string
}

export default function LoveReasonsSection({
    reasons,
    partnerName,
    onComplete
}: LoveReasonsSectionProps & { onComplete?: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [direction, setDirection] = useState(0)

    // Default reasons if none provided
    const displayReasons = reasons.length > 0 ? reasons : [
        { text: "Your beautiful smile that lights up my world" },
        { text: "The way you make ordinary moments feel special" },
        { text: "Your kindness and the way you care for others" },
        { text: "How you always believe in me" },
        { text: "The adventures we share together" },
    ]

    // Stats for auto-advance
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentIndex < displayReasons.length - 1) {
                setDirection(1)
                setCurrentIndex(prev => prev + 1)
            } else {
                // Done showing reasons
                setTimeout(() => {
                    if (onComplete) onComplete()
                }, 1500)
            }
        }, 3000) // 3 seconds per reason

        return () => clearTimeout(timer)
    }, [currentIndex, displayReasons.length, onComplete])

    const currentReason = displayReasons[currentIndex]

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -300 : 300,
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.4, ease: [0.55, 0.06, 0.68, 0.19] as const }
        }),
    }

    return (
        <section className="relative min-h-screen bg-neutral-950 overflow-hidden flex items-center justify-center">
            {/* Background elements */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-950/20 via-neutral-950 to-neutral-950" />
                {/* Decorative hearts */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-rose-500/10"
                        style={{
                            left: `${10 + (i * 12)}%`,
                            top: `${15 + (i % 4) * 20}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                            duration: 5 + i,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <Heart className="w-12 h-12" fill="currentColor" />
                    </motion.div>
                ))}
            </div>

            <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="text-center mb-12"
                >
                    <span className="text-rose-400 text-sm font-sans tracking-[0.3em] uppercase block mb-4">
                        From My Heart
                    </span>
                    <h2 className="text-4xl md:text-6xl font-serif text-white">
                        Why I Love You
                    </h2>
                </motion.div>

                <div className="relative h-[500px] flex items-center justify-center">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="absolute w-full max-w-3xl"
                        >
                            <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl shadow-rose-900/10 p-2">
                                <div className="relative aspect-video rounded-2xl overflow-hidden">
                                    {currentReason.media_url ? (
                                        currentReason.media_type === 'video' ? (
                                            <video
                                                src={currentReason.media_url}
                                                className="w-full h-full object-cover"
                                                muted
                                                autoPlay
                                                loop
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={currentReason.media_url}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        )
                                    ) : (
                                        <div className="w-full h-full bg-neutral-950 flex items-center justify-center">
                                            <Heart className="w-20 h-20 text-rose-900/50" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                    <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                                        <p className="text-2xl md:text-4xl text-white font-serif leading-relaxed drop-shadow-lg">
                                            "{currentReason.text}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Progress Bars */}
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
                    {displayReasons.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-12 bg-rose-500' : 'w-2 bg-neutral-800'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
