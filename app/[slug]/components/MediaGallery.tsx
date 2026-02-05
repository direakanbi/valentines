'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type MediaItem = {
    type: 'image' | 'video'
    url: string
    caption?: string
    section?: string
}

interface MediaGalleryProps {
    media: MediaItem[]
    onComplete?: () => void
}

export default function MediaGallery({ media, onComplete }: MediaGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const galleryItems = media.filter(m => !m.section || m.section === 'gallery')
    const videoRef = useRef<HTMLVideoElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const clearTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => {
            if (prev === galleryItems.length - 1) {
                if (onComplete) {
                    onComplete()
                    return prev
                }
                return 0
            }
            return prev + 1
        })
    }, [galleryItems.length, onComplete])

    // Auto-advance logic
    useEffect(() => {
        clearTimer()
        const currentItem = galleryItems[currentIndex]
        if (!currentItem) return

        if (currentItem.type === 'image') {
            timeoutRef.current = setTimeout(nextSlide, 5000)
        } else if (currentItem.type === 'video') {
            timeoutRef.current = setTimeout(nextSlide, 120000) // 2min safety
        }

        return () => clearTimer()
    }, [currentIndex, galleryItems, nextSlide])

    // Handle video playback
    useEffect(() => {
        if (galleryItems[currentIndex]?.type === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play().catch(() => { })
        }
    }, [currentIndex, galleryItems])

    const handleVideoEnded = () => {
        clearTimer()
        nextSlide()
    }

    if (galleryItems.length === 0) return null

    return (
        <section className="fixed inset-0 bg-black flex items-center justify-center">
            <AnimatePresence>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    {galleryItems[currentIndex].type === 'video' ? (
                        <video
                            ref={videoRef}
                            src={galleryItems[currentIndex].url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            onEnded={handleVideoEnded}
                        />
                    ) : (
                        <img
                            src={galleryItems[currentIndex].url}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Subtle progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
                <motion.div
                    className="h-full bg-white/40"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((currentIndex + 1) / galleryItems.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
        </section>
    )
}
