import { useRef, useEffect, useState } from "react";
import { FaPlayCircle, FaPause } from "react-icons/fa";
import { PiSpeakerSimpleHighFill, PiSpeakerSimpleSlashFill } from "react-icons/pi";
import Hls from "hls.js";
import type { LiveViewPlaybackProfile, LiveViewQualityCap } from "@/types/typesLiveView";

type WebcamItemProps = {
    url: string | null;
    isHuge?: boolean;
    isLarge: boolean;
    channel: number;
    channelName?: string;
    location?: string;
    playbackProfile: LiveViewPlaybackProfile;
    qualityCap: LiveViewQualityCap;
};

type StreamInfo = {
    resolution: string;
    levelsLabel: string;
    activeLevelLabel: string;
    bufferLabel: string;
    liveDelayLabel: string;
    playbackRateLabel: string;
};

const shouldBypassProxy = (sourceUrl: string) => {
    try {
        const resolvedUrl = /^\/\//.test(sourceUrl) ? `https:${sourceUrl}` : sourceUrl;
        const { hostname } = new URL(resolvedUrl);
        return hostname === "streaming.panomax.com" || hostname.endsWith(".panomax.com");
    } catch {
        return false;
    }
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
        if (shouldBypassProxy(normalizedUrl)) {
            return `https:${normalizedUrl}`;
        }
        return `/api/stream-proxy?url=${encodeURIComponent(`https:${normalizedUrl}`)}`;
    }

    if (/^https?:\/\//i.test(normalizedUrl)) {
        if (shouldBypassProxy(normalizedUrl)) {
            return normalizedUrl;
        }
        return `/api/stream-proxy?url=${encodeURIComponent(normalizedUrl)}`;
    }

    return normalizedUrl;
};

const getHlsConfig = (playbackProfile: LiveViewPlaybackProfile) => {
    switch (playbackProfile) {
        case "latency":
            return {
                lowLatencyMode: true,
                liveSyncDurationCount: 1,
                liveMaxLatencyDurationCount: 3,
                maxLiveSyncPlaybackRate: 1.5,
                maxBufferLength: 10,
                backBufferLength: 30,
            };
        case "stable":
            return {
                lowLatencyMode: false,
                liveSyncDurationCount: 4,
                liveMaxLatencyDurationCount: 10,
                maxLiveSyncPlaybackRate: 1,
                maxBufferLength: 30,
                backBufferLength: 90,
            };
        case "balanced":
        default:
            return {
                lowLatencyMode: false,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 8,
                maxLiveSyncPlaybackRate: 1.15,
                maxBufferLength: 20,
                backBufferLength: 60,
            };
    }
};

const QUALITY_CAP_HEIGHTS: Record<Exclude<LiveViewQualityCap, "auto">, number> = {
    "360p": 360,
    "480p": 480,
    "720p": 720,
    "1080p": 1080,
};

const PLAYBACK_PROFILE_LABELS: Record<LiveViewPlaybackProfile, string> = {
    latency: "Low Latency",
    balanced: "Balanced",
    stable: "Stable Buffer",
};

const QUALITY_CAP_LABELS: Record<LiveViewQualityCap, string> = {
    auto: "Auto",
    "360p": "360p",
    "480p": "480p",
    "720p": "720p",
    "1080p": "1080p",
};

const formatSecondsLabel = (value: number | null | undefined) =>
    value != null && Number.isFinite(value) ? `${value.toFixed(1)}s` : "-";

const formatPlaybackRateLabel = (value: number | null | undefined) =>
    value != null && Number.isFinite(value) ? `${value.toFixed(2)}x` : "-";

const applyQualityCap = (hls: Hls, qualityCap: LiveViewQualityCap) => {
    if (qualityCap === "auto") {
        hls.autoLevelCapping = -1;
        return;
    }

    const maxHeight = QUALITY_CAP_HEIGHTS[qualityCap];
    const cappedLevels = hls.levels
        .map((level, index) => ({
            index,
            height: level.height ?? 0,
            bitrate: level.bitrate ?? 0,
        }))
        .filter((level) => level.height > 0 && level.height <= maxHeight)
        .sort((a, b) => b.height - a.height || a.bitrate - b.bitrate);

    hls.autoLevelCapping = cappedLevels[0]?.index ?? 0;
};

const getActiveLevelLabel = (player: Hls) => {
    const currentLevelIndex = player.currentLevel;

    if (currentLevelIndex < 0 || currentLevelIndex >= player.levels.length) {
        return player.autoLevelEnabled ? "auto" : "-";
    }

    const currentLevel = player.levels[currentLevelIndex];
    const height = currentLevel.height ?? 0;
    const bitrateKbps =
        currentLevel.bitrate && currentLevel.bitrate > 0
            ? Math.round(currentLevel.bitrate / 1000)
            : null;

    if (height > 0 && bitrateKbps) {
        return `${height}p / ${bitrateKbps}kbps`;
    }
    if (height > 0) {
        return `${height}p`;
    }

    if (bitrateKbps) {
        return `${bitrateKbps}kbps`;
    }

    return `#${currentLevelIndex}`;
};

export default function WebcamItem({
    url,
    isHuge,
    isLarge,
    channel,
    channelName,
    location,
    playbackProfile,
    qualityCap,
}: WebcamItemProps) {

    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [volume, setVolume] = useState(0.5);
    const [streamInfo, setStreamInfo] = useState<StreamInfo>({
        resolution: "-",
        levelsLabel: "-",
        activeLevelLabel: "-",
        bufferLabel: "-",
        liveDelayLabel: "-",
        playbackRateLabel: "-",
    });
    const hlsRef = useRef<Hls | null>(null);
    const resumeAfterVisibleRef = useRef(false);

    const updateStreamInfo = (player?: Hls | null) => {
        const video = videoRef.current;
        const resolution =
            video && video.videoWidth > 0 && video.videoHeight > 0
                ? `${video.videoWidth}x${video.videoHeight}`
                : "-";
        const bufferAheadSeconds =
            video && video.buffered.length > 0
                ? Math.max(0, video.buffered.end(video.buffered.length - 1) - video.currentTime)
                : null;
        const liveDelaySeconds =
            player && Number.isFinite(player.latency)
                ? player.latency
                : null;

        const levelsLabel =
            player && player.levels.length > 0
                ? `${player.levels.length} level${player.levels.length === 1 ? "" : "s"}`
                : video?.currentSrc
                    ? "native"
                    : "-";

        const activeLevelLabel =
            player && player.levels.length > 0
                ? getActiveLevelLabel(player)
                : video?.currentSrc
                    ? "browser"
                    : "-";

        setStreamInfo({
            resolution,
            levelsLabel,
            activeLevelLabel,
            bufferLabel: formatSecondsLabel(bufferAheadSeconds),
            liveDelayLabel: formatSecondsLabel(liveDelaySeconds),
            playbackRateLabel: formatPlaybackRateLabel(video?.playbackRate),
        });
    };

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
            setStreamInfo({
                resolution: "-",
                levelsLabel: "-",
                activeLevelLabel: "-",
                bufferLabel: "-",
                liveDelayLabel: "-",
                playbackRateLabel: "-",
            });
        };

        if (!video || !url) {
            hlsRef.current = null;
            resetVideo();
            return;
        }

        const playbackUrl = getPlaybackUrl(url);

        if (Hls.isSupported()) {
            const player = new Hls({
                ...getHlsConfig(playbackProfile),
            });

            hls = player;
            hlsRef.current = player;
            player.loadSource(playbackUrl);
            player.attachMedia(video);

            player.on(Hls.Events.MANIFEST_PARSED, () => {
                applyQualityCap(player, qualityCap);
                updateStreamInfo(player);
                seekToLiveEdge();
                video.play().catch(() => { });
            });

            player.on(Hls.Events.LEVEL_SWITCHED, () => {
                requestAnimationFrame(() => {
                    updateStreamInfo(player);
                });
            });

            player.on(Hls.Events.ERROR, (_, data) => {
                if (!data.fatal) {
                    requestAnimationFrame(() => {
                        seekToLiveEdge();
                        updateStreamInfo(player);
                    });
                    return;
                }

                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    player.startLoad(-1);
                    return;
                }

                if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    player.recoverMediaError();
                }
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
    }, [url, playbackProfile, qualityCap]);

    useEffect(() => {
        const hls = hlsRef.current;
        if (!hls) return;
        applyQualityCap(hls, qualityCap);
    }, [qualityCap]);

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
        const onLoadedMetadata = () => updateStreamInfo(hlsRef.current);
        const onResize = () => updateStreamInfo(hlsRef.current);
        const onTimeUpdate = () => updateStreamInfo(hlsRef.current);
        const onProgress = () => updateStreamInfo(hlsRef.current);
        const onRateChange = () => updateStreamInfo(hlsRef.current);
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("resize", onResize);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("progress", onProgress);
        video.addEventListener("ratechange", onRateChange);
        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("resize", onResize);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("progress", onProgress);
            video.removeEventListener("ratechange", onRateChange);
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
                        preload="auto"
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
                            {playing ? <FaPlayCircle /> : <FaPause />}
                        </button>

                        <button
                            onClick={handleMute}
                            className="bg-gray-700 text-white px-2 py-1 rounded"
                            title={muted ? "Unmute" : "Mute"}
                        >
                            {muted ? <PiSpeakerSimpleSlashFill /> : <PiSpeakerSimpleHighFill />}
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
            <div className="absolute top-1 left-2 right-2 text-xs bg-gray-300 text-gray/90 p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="break-all">
                    Slot: {channel} - Channel: {channelName || "-"} - Location: {location || "-"} - URL: {url || "-"}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-tight text-gray-800/90">
                    <span className="whitespace-nowrap">
                        Profile: {PLAYBACK_PROFILE_LABELS[playbackProfile]}
                    </span>
                    <span className="whitespace-nowrap">
                        Cap: {QUALITY_CAP_LABELS[qualityCap]}
                    </span>
                    <span className="whitespace-nowrap">
                        Buffer: {streamInfo.bufferLabel}
                    </span>
                    <span className="whitespace-nowrap">
                        Live Delay: {streamInfo.liveDelayLabel}
                    </span>
                    <span className="whitespace-nowrap">
                        Rate: {streamInfo.playbackRateLabel}
                    </span>
                    <span className="whitespace-nowrap">
                       Res: {streamInfo.resolution}
                    </span>
                    <span className="whitespace-nowrap">
                        Levels: {streamInfo.levelsLabel}
                    </span>
                    <span className="whitespace-nowrap">
                        Active: {streamInfo.activeLevelLabel}
                    </span>
               </div>
            </div>
        </div>
    );
}