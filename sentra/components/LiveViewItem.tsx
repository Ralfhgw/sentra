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
    subtitlesEnabled?: boolean;
    translateToGerman?: boolean;
    infoOverlayClickable?: boolean;
    isMenuVisible?: boolean;
    onInfoOverlayClick?: () => void;
};

type StreamInfo = {
    resolution: string;
    levelsLabel: string;
    activeLevelLabel: string;
    bufferLabel: string;
    liveDelayLabel: string;
    playbackRateLabel: string;
};

type SubtitleResponse = {
    text?: string;
    sourceText?: string;
    sourceLanguage?: string | null;
    translatedToGerman?: boolean;
    retryAfterMs?: number;
    error?: string;
};

type CaptureCapableVideoElement = HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
};

const isDisplayTextTrack = (track: TextTrack) =>
    track.kind === "subtitles" ||
    track.kind === "captions";

const isTargetSubtitleLanguage = (
    language: string | null | undefined,
    targetLanguage: "en" | "de"
) => {
    const normalized = String(language ?? "").trim().toLowerCase();
    return normalized === targetLanguage || normalized.startsWith(`${targetLanguage}-`);
};

const getActiveCueText = (track: TextTrack) => {
    const activeCue = track.activeCues?.[0];
    if (!activeCue) {
        return "";
    }

    if ("text" in activeCue && typeof activeCue.text === "string") {
        return activeCue.text.trim();
    }

    return String(activeCue).trim();
};

const syncNativeTextTracks = (
    video: HTMLVideoElement | null,
    nativeSubtitleDisplayEnabled: boolean,
    targetLanguage: "en" | "de",
    setHasNativeSubtitles: (value: boolean) => void
) => {
    if (!video) return false;

    const allDisplayTracks = Array.from(video.textTracks).filter(isDisplayTextTrack);
    const tracks = allDisplayTracks.filter(
        (track) => isDisplayTextTrack(track) && isTargetSubtitleLanguage(track.language, targetLanguage)
    );
    const hasTracks = tracks.length > 0;
    setHasNativeSubtitles(hasTracks);

    for (const track of allDisplayTracks) {
        track.mode = "disabled";
    }

    for (const track of tracks) {
        track.mode = nativeSubtitleDisplayEnabled ? "hidden" : "disabled";
    }

    return hasTracks;
};

const SUBTITLE_CHUNK_MS = 10_000;
const TRANSLATED_SUBTITLE_CHUNK_MS = 20_000;
const MIN_SUBTITLE_BLOB_BYTES = 4_096;
const RECORDER_MIME_TYPES = ["audio/webm", "audio/webm;codecs=opus"] as const;

const pickRecorderMimeType = () => {
    if (typeof MediaRecorder === "undefined") {
       return "";
    }

    return (
        RECORDER_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
    );
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
                liveSyncDurationCount: 2,
                liveMaxLatencyDurationCount: 5,
                maxLiveSyncPlaybackRate: 1.08,
                maxBufferLength: 12,
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
                liveSyncDurationCount: 4,
                liveMaxLatencyDurationCount: 10,
                maxLiveSyncPlaybackRate: 1.04,
                maxBufferLength: 24,
                backBufferLength: 60,
            };
    }
};

const getPlaybackRateCap = (playbackProfile: LiveViewPlaybackProfile) => {
    switch (playbackProfile) {
        case "latency":
            return 1.08;
        case "stable":
            return 1;
        case "balanced":
        default:
            return 1.04;
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
    subtitlesEnabled = false,
    translateToGerman = false,
    infoOverlayClickable = false,
    isMenuVisible = true,
    onInfoOverlayClick,
}: WebcamItemProps) {
    const subtitleTargetLanguage: "en" | "de" = translateToGerman ? "de" : "en";
    const subtitleChunkMs =
        subtitleTargetLanguage === "de"
            ? TRANSLATED_SUBTITLE_CHUNK_MS
            : SUBTITLE_CHUNK_MS;
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
    const subtitleRecorderRef = useRef<MediaRecorder | null>(null);
    const subtitleSessionIdRef = useRef(0);
    const subtitleRequestIdRef = useRef(0);
    const subtitleLastAppliedRequestIdRef = useRef(0);
    const subtitleBackoffUntilRef = useRef(0);
    const subtitleStopTimerRef = useRef<number | null>(null);
    const subtitleDisposedRef = useRef(false);
    const [subtitleText, setSubtitleText] = useState("");
    const [nativeSubtitleText, setNativeSubtitleText] = useState("");
    const [subtitleError, setSubtitleError] = useState("");
    const [hasNativeSubtitles, setHasNativeSubtitles] = useState(false);
    const [subtitleSourceLanguage, setSubtitleSourceLanguage] = useState<string | null>(null);
    const [subtitleTranslatedToGerman, setSubtitleTranslatedToGerman] = useState(false);
    const isSubtitleRateLimited = subtitleError.toLowerCase().includes("rate limit");
    const hasSubtitleError = subtitleError.trim().length > 0;
    const displayedSubtitleText = translateToGerman
        ? (subtitleTranslatedToGerman ? subtitleText : "")
        : (nativeSubtitleText || subtitleText);

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
            video.currentTime = Math.max(0, liveSyncPosition - 1);
            return;
        }

        if (video.buffered.length > 0) {
            const end = video.buffered.end(video.buffered.length - 1);
            video.currentTime = Math.max(0, end - 1);
        }
    };

    // Connect Video with Stream if change
    useEffect(() => {
        const video = videoRef.current;
        let hls: Hls | undefined;
        const maxPlaybackRate = getPlaybackRateCap(playbackProfile);

        const resetVideo = () => {
            if (!video) return;
            video.pause();
            video.removeAttribute("src");
            video.load();
             video.playbackRate = 1;
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

        const clampPlaybackRate = () => {
            if (video.playbackRate > maxPlaybackRate) {
                video.playbackRate = maxPlaybackRate;
            } else if (video.playbackRate < 1) {
                video.playbackRate = 1;
            }
        };

        video.addEventListener("ratechange", clampPlaybackRate);

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
                video.playbackRate = 1;
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
                    const shouldSeekToLiveEdge =
                        data.details === "bufferStalledError" ||
                        data.details === "bufferSeekOverHole" ||
                        data.details === "bufferNudgeOnStall";
                    requestAnimationFrame(() => {
                        if (shouldSeekToLiveEdge) {
                            seekToLiveEdge();
                        }
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
            video.removeEventListener("ratechange", clampPlaybackRate);
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


    useEffect(() => {
        if (!url) {
            subtitleSessionIdRef.current += 1;
            subtitleRequestIdRef.current = 0;
            subtitleLastAppliedRequestIdRef.current = 0;
            subtitleBackoffUntilRef.current = 0;
            setSubtitleText("");
            setNativeSubtitleText("");
            setSubtitleError("");
            setHasNativeSubtitles(false);
            setSubtitleSourceLanguage(null);
            setSubtitleTranslatedToGerman(false);
            return;
        }
        subtitleSessionIdRef.current += 1;
        subtitleRequestIdRef.current = 0;
        subtitleLastAppliedRequestIdRef.current = 0;
        subtitleBackoffUntilRef.current = 0;
        setSubtitleText("");
        setNativeSubtitleText("");
        setSubtitleError("");
        setSubtitleSourceLanguage(null);
        setSubtitleTranslatedToGerman(false);
        syncNativeTextTracks(
            videoRef.current,
            subtitlesEnabled,
            subtitleTargetLanguage,
            setHasNativeSubtitles
        );

    }, [url, subtitlesEnabled, subtitleTargetLanguage]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !subtitlesEnabled) {
            setNativeSubtitleText("");
            return;
        }

        const tracks = Array.from(video.textTracks).filter(
            (track) => isDisplayTextTrack(track) && isTargetSubtitleLanguage(track.language, subtitleTargetLanguage)
        );
        if (tracks.length === 0) {
            setNativeSubtitleText("");
            return;
        }

        const updateNativeSubtitleText = () => {
           const nextText =
                tracks
                    .map(getActiveCueText)
                    .find((text) => text.length > 0) ?? "";

           setNativeSubtitleText(nextText);
        };

        updateNativeSubtitleText();
       tracks.forEach((track) =>
            track.addEventListener("cuechange", updateNativeSubtitleText)
        );
        return () => {
            tracks.forEach((track) =>
                track.removeEventListener("cuechange", updateNativeSubtitleText)
            );
        };
    }, [url, subtitlesEnabled, subtitleTargetLanguage, hasNativeSubtitles]);

    useEffect(() => {
        const video = videoRef.current;
        let retryTimer: number | undefined;
        subtitleDisposedRef.current = false;
        const shouldUseNativeSubtitles = hasNativeSubtitles;

        const stopRecorder = () => {
           const recorder = subtitleRecorderRef.current;
            if (recorder && recorder.state !== "inactive") {
                recorder.stop();
            }
            subtitleRecorderRef.current = null;
            if (subtitleStopTimerRef.current !== null) {
                window.clearTimeout(subtitleStopTimerRef.current);
                subtitleStopTimerRef.current = null;
            }
        };

        if (!video || !url || !subtitlesEnabled || shouldUseNativeSubtitles) {
            stopRecorder();
           if (!subtitlesEnabled || shouldUseNativeSubtitles) {
                setSubtitleText("");
                setSubtitleError("");
                setSubtitleSourceLanguage(null);
                setSubtitleTranslatedToGerman(false);
            }
            return;
        }

        const startRecorder = () => {
            const captureVideo = video as CaptureCapableVideoElement;
            const captureStream =
                captureVideo.captureStream?.bind(captureVideo) ??
                captureVideo.mozCaptureStream?.bind(captureVideo);
           if (!captureStream) {
                setSubtitleError("Browser unterstützt keine Live-Untertitel-Capture.");
                return;
            }
            const audioTracks = captureStream().getAudioTracks();
            if (audioTracks.length === 0) {
                retryTimer = window.setTimeout(startRecorder, 1200);
                return;
            }

           const mimeType = pickRecorderMimeType();
            if (!mimeType) {
                setSubtitleError("Kein passendes Audioformat für Live-Untertitel verfügbar.");
                return;
            }

           const recorder = new MediaRecorder(new MediaStream(audioTracks), {
                mimeType,
            });
            const recorderSessionId = subtitleSessionIdRef.current;

            const chunks: Blob[] = [];
            subtitleRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = async () => {
                if (
                    subtitleDisposedRef.current ||
                    recorderSessionId !== subtitleSessionIdRef.current
                ) {
                    return;
                }

                const uploadMimeType = mimeType.startsWith("audio/webm")
                    ? "audio/webm"
                    : mimeType;
                const audioBlob = new Blob(chunks, { type: uploadMimeType });

                if (
                    !subtitleDisposedRef.current &&
                    recorderSessionId === subtitleSessionIdRef.current &&
                    subtitlesEnabled &&
                    !shouldUseNativeSubtitles
                ) {
                    startRecorder();
                }
                if (audioBlob.size < MIN_SUBTITLE_BLOB_BYTES) {
                    return;
                }

                if (Date.now() < subtitleBackoffUntilRef.current) {
                    return;
                }

                const requestId = ++subtitleRequestIdRef.current;
                const formData = new FormData();
                formData.set(
                    "audio",
                    new File([audioBlob], "liveview-subtitles.webm", {
                        type: uploadMimeType,
                    })
                );
                formData.set("targetLanguage", subtitleTargetLanguage);

                try {
                    const response = await fetch("/api/liveview/subtitles", {
                        method: "POST",
                        body: formData,
                    });

                    const data = (await response.json()) as SubtitleResponse;
                    if (recorderSessionId !== subtitleSessionIdRef.current) return;
                    if (requestId < subtitleLastAppliedRequestIdRef.current) return;
                    if (response.status === 429 || (data.retryAfterMs ?? 0) > 0) {
                        subtitleBackoffUntilRef.current =
                            Date.now() + Math.max(data.retryAfterMs ?? 30_000, subtitleChunkMs);
                        setSubtitleError("Untertitel pausiert wegen Groq Rate Limit.");
                        return;
                    }
                    if (!response.ok) {
                        throw new Error(
                            data.error ?? "Untertitel konnten nicht erzeugt werden."
                        );
                    }

                    const nextText = data.text?.trim() ?? "";

                    if (nextText.length > 0) {
                        subtitleLastAppliedRequestIdRef.current = requestId;
                        setSubtitleText(nextText);
                        setSubtitleSourceLanguage(data.sourceLanguage ?? null);
                       setSubtitleTranslatedToGerman(data.translatedToGerman === true);
                    }

                    setSubtitleError("");
                } catch (error) {
                    if (recorderSessionId !== subtitleSessionIdRef.current) return;
                    if (requestId < subtitleLastAppliedRequestIdRef.current) return;
                    setSubtitleError(
                        error instanceof Error
                            ? error.message
                            : "Untertitel konnten nicht erzeugt werden."
                    );
                }
            };

            recorder.start();
            subtitleStopTimerRef.current = window.setTimeout(() => {
                if (recorder.state !== "inactive") {
                    recorder.stop();
                }
            }, subtitleChunkMs);
        };

        
       startRecorder();

        return () => {
            subtitleDisposedRef.current = true;
            if (retryTimer) {
                window.clearTimeout(retryTimer);
            }
            stopRecorder();
        };
     }, [url, subtitlesEnabled, subtitleTargetLanguage, subtitleChunkMs, hasNativeSubtitles]);

    return (
        <div className="w-full h-full relative group">
            { /* Video Component */}
            {url && url !== "" ? (
                <>
                    <video
                        ref={videoRef}
                        preload="auto"
                        playsInline
                        autoPlay
                        muted={muted}
                        className={`w-full h-full object-cover ${subtitlesEnabled ? "liveview-hide-native-cues" : ""}`}
                        onLoadedMetadata={() => {
                            syncNativeTextTracks(
                                videoRef.current,
                                subtitlesEnabled,
                                subtitleTargetLanguage,
                                setHasNativeSubtitles
                            );
                        }}
                    />

                     {subtitlesEnabled && displayedSubtitleText && (
                        <div className="pointer-events-none absolute bottom-10 left-2 right-2 z-20 flex justify-center">
                            <div className="max-w-[92%] rounded bg-black/75 px-3 py-2 text-center text-xl font-medium text-white shadow-lg">
                                {displayedSubtitleText}
                            </div>
                        </div>
                    )}

                    {subtitlesEnabled && subtitleError && (
                        <div className="absolute top-12 left-2 right-2 z-20 rounded bg-red-600/85 px-2 py-1 text-[11px] text-white">
                            {subtitleError}
                        </div>
                    )}

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
            <div className={`absolute text-lg top-3 right-4 text-white/80 font-bold italic select-none pointer-events-none tracking-tighter ${isHuge ? 'text-5xl' : isLarge ? 'text-xl' : 'text-[16px]'}`}>
                Sentra&copy;
            </div>

            {/* Activ channel indicator if hover */}
            <button
                type="button"
                onClick={() => {
                    if (!infoOverlayClickable) return;
                    onInfoOverlayClick?.();
                }}
                className={`absolute top-1 left-2 right-2 z-10 text-left text-xs bg-gray-300 text-gray/90 p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity ${infoOverlayClickable ? "cursor-pointer" : "cursor-default"}`}
                title={infoOverlayClickable ? `Menü ${isMenuVisible ? "ausblenden" : "einblenden"}` : undefined}
                aria-label={infoOverlayClickable ? `Menü ${isMenuVisible ? "ausblenden" : "einblenden"}` : undefined}
            >
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
                    <span className="whitespace-nowrap">
                        CC: {!subtitlesEnabled
                            ? "Off"
                            : isSubtitleRateLimited
                                ? "Rate Limited"
                            : hasSubtitleError
                                ? "Error"
                            : translateToGerman
                                ? subtitleTranslatedToGerman
                                    ? "DE"
                                    : subtitleSourceLanguage === "de"
                                        ? "DE Native"
                                        : "DE Pending"
                                : hasNativeSubtitles
                                    ? "Native"
                                    : "AI"}
                    </span>
                    {infoOverlayClickable && (
                        <span className="whitespace-nowrap font-semibold">
                            Klick: Menü {isMenuVisible ? "aus" : "ein"}
                        </span>
                    )}
               </div>
            </button>
        </div>
    );
}