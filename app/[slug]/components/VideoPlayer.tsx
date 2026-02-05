'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

interface VideoPlayerProps {
    src: string
    poster?: string
    autoPlay?: boolean
    muted?: boolean
    loop?: boolean
    className?: string
    onEnded?: () => void
}

export default function VideoPlayer({
    src,
    poster,
    autoPlay = false,
    muted = true,
    loop = false,
    className = '',
    onEnded
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(autoPlay)
    const [isMuted, setIsMuted] = useState(muted)
    const [progress, setProgress] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const [isInView, setIsInView] = useState(false)

    // Intersection observer for auto-pause when out of view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting)
                if (!entry.isIntersecting && videoRef.current) {
                    videoRef.current.pause()
                    setIsPlaying(false)
                }
            },
            { threshold: 0.5 }
        )

        if (containerRef.current) {
            observer.observe(containerRef.current)
        }

        return () => observer.disconnect()
    }, [])

    // Auto-play when in view
    useEffect(() => {
        if (isInView && autoPlay && videoRef.current) {
            videoRef.current.play().catch(() => { })
            setIsPlaying(true)
        }
    }, [isInView, autoPlay])

    // Update progress
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleTimeUpdate = () => {
            setProgress((video.currentTime / video.duration) * 100)
        }

        const handleEnded = () => {
            setIsPlaying(false)
            if (onEnded) onEnded()
        }

        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('ended', handleEnded)

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('ended', handleEnded)
        }
    }, [onEnded])

    // Hide controls after inactivity
    useEffect(() => {
        let timeout: NodeJS.Timeout

        const handleMouseMove = () => {
            setShowControls(true)
            clearTimeout(timeout)
            timeout = setTimeout(() => setShowControls(false), 3000)
        }

        const container = containerRef.current
        if (container) {
            container.addEventListener('mousemove', handleMouseMove)
            container.addEventListener('touchstart', handleMouseMove)
        }

        return () => {
            clearTimeout(timeout)
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove)
                container.removeEventListener('touchstart', handleMouseMove)
            }
        }
    }, [])

    const togglePlay = () => {
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
        } else {
            videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const toggleMute = () => {
        if (!videoRef.current) return
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        const pos = (e.clientX - rect.left) / rect.width
        videoRef.current.currentTime = pos * videoRef.current.duration
    }

    const toggleFullscreen = () => {
        if (!containerRef.current) return
        if (document.fullscreenElement) {
            document.exitFullscreen()
        } else {
            containerRef.current.requestFullscreen()
        }
    }

    return (
        <div
            ref={containerRef}
            className={`relative group rounded-xl overflow-hidden bg-black ${className}`}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                muted={isMuted}
                loop={loop}
                playsInline
                className="w-full h-full object-cover"
            />

            {/* Play overlay (when paused) */}
            {!isPlaying && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Play className="w-10 h-10 text-white ml-1" fill="white" />
                    </div>
                </motion.div>
            )}

            {/* Controls bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            >
                {/* Progress bar */}
                <div
                    className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/progress"
                    onClick={handleSeek}
                >
                    <div
                        className="h-full bg-rose-500 rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                    </div>
                </div>

                {/* Control buttons */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={togglePlay}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        {isPlaying ? (
                            <Pause className="w-5 h-5" />
                        ) : (
                            <Play className="w-5 h-5" fill="white" />
                        )}
                    </button>

                    <button
                        onClick={toggleMute}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        {isMuted ? (
                            <VolumeX className="w-5 h-5" />
                        ) : (
                            <Volume2 className="w-5 h-5" />
                        )}
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={toggleFullscreen}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <Maximize className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
