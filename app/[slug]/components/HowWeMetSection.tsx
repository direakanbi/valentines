'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

type MediaItem = {
    type: 'image' | 'video'
    url: string
    caption?: string
    section?: string
}

interface HowWeMetSectionProps {
    text?: string
    featuredMedia?: MediaItem
    partnerName: string
    proposerName: string
    onComplete?: () => void
}

export default function HowWeMetSection({
    text,
    featuredMedia,
    partnerName,
    proposerName,
    onComplete
}: HowWeMetSectionProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    // Default text if none provided
    const storyText = text || `Every love story is beautiful, but ours is my favorite.

From the moment we first met, I knew there was something special about you, ${partnerName}. The way you smiled, the way you laughed – it all felt like coming home.

Every day with you is an adventure I never want to end.`

    // Auto-scroll effect
    useEffect(() => {
        const container = scrollContainerRef.current
        const content = contentRef.current
        if (!container || !content) return

        const contentHeight = content.scrollHeight
        const containerHeight = container.clientHeight
        const scrollDistance = contentHeight - containerHeight + 100

        // Calculate scroll duration based on text length (200 WPM reading pace)
        const wordCount = storyText.split(/\s+/).length
        const readingTimeMs = Math.max((wordCount / 200) * 60 * 1000, 3000) // Min 3 seconds

        let startTime: number
        let animationId: number

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const elapsed = timestamp - startTime
            const progress = Math.min(elapsed / readingTimeMs, 1)

            // Ease-in-out for smooth scrolling
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2

            container.scrollTop = easeProgress * scrollDistance

            if (progress < 1) {
                animationId = requestAnimationFrame(animate)
            } else {
                // Finished scrolling, immediate transition to next
                setTimeout(() => {
                    if (onComplete) onComplete()
                }, 200)
            }
        }

        // Start after a brief pause
        const timeout = setTimeout(() => {
            animationId = requestAnimationFrame(animate)
        }, 1500)

        return () => {
            clearTimeout(timeout)
            if (animationId) cancelAnimationFrame(animationId)
        }
    }, [storyText, onComplete])

    return (
        <section className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
            {/* Background Media */}
            <div className="absolute inset-0 z-0">
                {featuredMedia ? (
                    featuredMedia.type === 'video' ? (
                        <video
                            src={featuredMedia.url}
                            className="w-full h-full object-cover opacity-15"
                            autoPlay
                            muted
                            loop
                            playsInline
                        />
                    ) : (
                        <img
                            src={featuredMedia.url}
                            alt=""
                            className="w-full h-full object-cover opacity-15"
                        />
                    )
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
            </div>

            {/* Scrolling Text Container */}
            <div
                ref={scrollContainerRef}
                className="relative z-10 w-full max-w-3xl mx-auto h-[70vh] overflow-hidden px-8"
            >
                <div ref={contentRef} className="py-[35vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 2, delay: 0.5 }}
                    >
                        {storyText.split('\n\n').map((paragraph, i) => (
                            <p
                                key={i}
                                className="text-2xl md:text-3xl lg:text-4xl text-white/90 font-serif leading-relaxed mb-12 text-center"
                            >
                                {paragraph.trim()}
                            </p>
                        ))}

                        {/* Signature */}
                        <p className="text-xl text-rose-400 font-serif italic text-center mt-16">
                            — With love, {proposerName}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Gradient overlays for fade effect */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />
        </section>
    )
}
