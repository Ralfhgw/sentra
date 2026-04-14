import { useRef, useEffect, useState } from "react";
import Hls from "hls.js";

type WebcamItemProps = {
    url: string | null;
    isHuge?: boolean;
    isLarge: boolean;
    channel: number;
    channelName?: string;
    location?: string;
};

const getPlaybackUrl = (sourceUrl: string) => {
    const normalizedUrl = sourceUrl.trim();

    if (!normalizedUrl) {
        return normalizedUrl;
    }

    if (
        normalizedUrl.startsWith("/api/stream-proxy?url=") ||
        normalizedUrl.includes("/api/stream-proxy?url=")
    ) {
        return normalizedUrl;
    }

    if (/^\/\//.test(normalizedUrl)) {
        return `/api/stream-proxy?url=${encodeURIComponent(`https:${normalizedUrl}`)}`;
    }

    if (/^https?:\/\//i.test(normalizedUrl)) {
        return `/api/stream-proxy?url=${encodeURIComponent(normalizedUrl)}`;
    }

    return normalizedUrl;
};

export default function WebcamItem({
    url,
    isHuge,
    isLarge,
    channel,
    channelName,
    location,
}: WebcamItemProps) {

    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [volume, setVolume] = useState(0.5);
    const hlsRef = useRef<Hls | null>(null);
    const resumeAfterVisibleRef = useRef(false);

    const seekToLiveEdge = () => {
        const video = videoRef.current;
        if (!video) return;

        const hls = hlsRef.current;
        const liveSyncPosition = hls?.liveSyncPosition;

        if (liveSyncPosition != null && Number.isFinite(liveSyncPosition)) {
            video.currentTime = Math.max(0, liveSyncPosition - 0.25);
            return;
        }

        if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            video.currentTime = Math.max(0, end - 0.25);
        }
    };

    // Connect Video with Stream if change
    useEffect(() => {
        const video = videoRef.current;
        let hls: Hls | undefined;

        const resetVideo = () => {
            if (!video) return;
            video.pause();
            video.removeAttribute("src");
            video.load();
        };

        if (!video || !url) {
            hlsRef.current = null;
            resetVideo();
            return;
        }

        const playbackUrl = getPlaybackUrl(url);

        if (Hls.isSupported()) {
            hls = new Hls({
                capLevelToPlayerSize: true,
                lowLatencyMode: true,
                liveSyncDurationCount: 1,
                liveMaxLatencyDurationCount: 3,
                maxLiveSyncPlaybackRate: 1.5,
            });

            hlsRef.current = hls;
            hls.loadSource(playbackUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                seekToLiveEdge();
                video.play().catch(() => { });
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            hlsRef.current = null;
            video.src = playbackUrl;
            video.load();
        }

        return () => {
            hlsRef.current = null;

            if (hls) {
                hls.detachMedia();
                hls.destroy();
            }

            resetVideo();
        };
    }, [url]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const video = videoRef.current;
            if (!video) return;

            const hls = hlsRef.current;

            if (document.hidden) {
                resumeAfterVisibleRef.current = !video.paused;

                if (hls?.loadingEnabled) {
                    hls.stopLoad();
                }

                video.pause();
                return;
            }

            if (hls && !hls.loadingEnabled) {
                hls.startLoad(-1);
            }

            requestAnimationFrame(() => {
                seekToLiveEdge();

                if (resumeAfterVisibleRef.current) {
                    video.play().catch(() => { });
                }
            });

            setTimeout(() => {
                seekToLiveEdge();
            }, 200);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Play/Pause Handler
    const handlePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;
        if (playing) {
            video.pause();
        } else {
            video.play();
        }
        setPlaying(!playing);
    };

    // Mute/Unmute Handler
    const handleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !muted;
        setMuted(!muted);
    };

    // Volume Handler
    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        const vol = Number(e.target.value);
        if (video) video.volume = vol;
        setVolume(vol);
    };

    // Sync play state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
        };
    }, []);

    // Sync mute state
    useEffect(() => {
        const video = videoRef.current;
        if (video) video.muted = muted;
    }, [muted]);

    // Sync volume state
    useEffect(() => {
        const video = videoRef.current;
        if (video) video.volume = volume;
    }, [volume]);


    return (
        <div className="w-full h-full relative group">
            { /* Video Component */}
            {url && url !== "" ? (
                <>
                    <video
                        ref={videoRef}
                        playsInline
                        muted={muted}
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => {
                            const video = videoRef.current;
                            if (video && video.textTracks) {
                                for (let i = 0; i < video.textTracks.length; i++) {
                                    video.textTracks[i].mode = "disabled";
                                }
                            }
                        }}
                    />
                    {/* Video Controls */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/60 p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handlePlayPause}
                            className="bg-gray-700 text-white px-2 py-1 rounded"
                            title={playing ? "Stop" : "Play"}
                        >
                            {playing ? "▶️" : "⏹️"}
                        </button>

                        <button
                            onClick={handleMute}
                            className="bg-gray-700 text-white px-2 py-1 rounded"
                            title={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? "🔇" : "🔈"}
                        </button>

                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolume}
                            className="w-40 custom-slider"
                        />
                    </div>
                </>
            ) : (
                <div className="w-full h-full bg-blue-400/30 flex items-center justify-center">
                    <span className="text-white text-base font-semibold">No Signal</span>
                </div>
            )}

            {/* Sentra Water Mark top right */}
            <div className={`absolute text-lg top-3 right-4 text-white/80 font-bold italic select-none pointer-events-none tracking-tighter ${isHuge ? 'text-5xl' : isLarge ? 'text-xl' : 'text-[8px]'}`}>
                Sentra&copy;
            </div>

            {/* Activ channel indicator if hover */}
            <div className="absolute top-1 left-2 text-xs bg-gray-300 text-gray/90 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Slot: {channel} - Channel: {channelName || "-"} - Location: {location || "-"} - URL: {url || "-"}
            </div>
        </div>
    );
}