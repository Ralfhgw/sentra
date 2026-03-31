"use client";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import type {
  FeedEntry,
  LiveTalkChatMessage,
  LiveTalkClientProps,
  LiveTalkProducerSummary,
  LiveTalkRole,
  LiveTalkRoomSummary,
  LiveTalkTokenResponse,
  RemoteFeed,
} from "@/types/typesLiveTalk";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"
//TODO Call Aufbau ohne Mikrofon/Kamera darf nicht zum Abbruch führen

type ActiveSession = {
  userName: string;
  sessionCode: string;
  receiveOnly: boolean;
};

type JoinRoomAck =
  | {
    ok: true;
    socketId: string;
    roomId: string;
    roomCode: string;
    displayName: string;
    role: LiveTalkRole;
    routerRtpCapabilities: mediasoupClient.types.RtpCapabilities;
    producers: LiveTalkProducerSummary[];
    messages: LiveTalkChatMessage[];
  }
  | {
    ok: false;
    error: string;
  };

type TransportCreateAck =
  | {
    ok: true;
    transport: {
      id: string;
      iceParameters: mediasoupClient.types.IceParameters;
      iceCandidates: mediasoupClient.types.IceCandidate[];
      dtlsParameters: mediasoupClient.types.DtlsParameters;
    };
  }
  | {
    ok: false;
    error: string;
  };

type ConsumerCreateAck =
  | {
    ok: true;
    consumer: {
      id: string;
      producerId: string;
      kind: mediasoupClient.types.MediaKind;
      rtpParameters: mediasoupClient.types.RtpParameters;
    };
  }
  | {
    ok: false;
    error: string;
  };

type ProducerStartAck =
  | {
    ok: true;
    producerId: string;
  }
  | {
    ok: false;
    error: string;
  };

type GenericAck =
  | { ok: true }
  | { ok: false; error: string };

function emitAck<T>(socket: Socket, event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve) => {
    if (payload === undefined) {
      socket.emit(event, resolve);
      return;
    }

    socket.emit(event, payload, resolve);
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function VideoTile({
  title,
  stream,
  muted = false,
}: {
  title: string;
  stream: MediaStream | null;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video) {
      return;
    }

    const playElement = async (element: HTMLMediaElement | null) => {
      if (!element) {
        return;
      }

      try {
        await element.play();
      } catch {
        // Autoplay kann je nach Browser blockiert werden.
      }
    };

    const syncMediaElements = () => {
      video.srcObject = stream;
      video.muted = true;
      void playElement(video);

      if (!audio) {
        return;
      }

      const hasAudio = Boolean(stream && stream.getAudioTracks().length > 0);
      audio.srcObject = hasAudio ? stream : null;
      audio.muted = muted;

      if (hasAudio) {
        void playElement(audio);
      }
    };

    syncMediaElements();

    const handleAddTrack = () => {
      syncMediaElements();
    };

    stream?.addEventListener("addtrack", handleAddTrack);

    return () => {
      stream?.removeEventListener("addtrack", handleAddTrack);

      if (video.srcObject === stream) {
        video.srcObject = null;
      }

      if (audio && audio.srcObject === stream) {
        audio.srcObject = null;
      }
    };
  }, [stream, muted]);

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="aspect-video w-full rounded-lg bg-slate-950"
      />
      <audio ref={audioRef} autoPlay playsInline muted={muted} className="hidden" />
    </div>
  );
}


export default function LiveTalkClient({
  rtcEnabled,
}: LiveTalkClientProps) {
  const [userNameInput, setUserNameInput] = useState("");
  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [receiveOnly, setReceiveOnly] = useState(false);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionKeyInfo, setSessionKeyInfo] = useState<LiveTalkRoomSummary | null>(null);
  const [socketId, setSocketId] = useState("");
  const [statusText, setStatusText] = useState("Noch nicht verbunden.");
  const [errorMessage, setErrorMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteFeeds, setRemoteFeeds] = useState<RemoteFeed[]>([]);
  const [messages, setMessages] = useState<LiveTalkChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<mediasoupClient.Device | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportByProducerRef = useRef(
    new Map<string, mediasoupClient.types.Transport>()
  );
  const consumerByProducerRef = useRef(
    new Map<string, mediasoupClient.types.Consumer>()
  );
  const producerMetaRef = useRef(
    new Map<string, LiveTalkProducerSummary>()
  );
  const feedByPeerRef = useRef(new Map<string, FeedEntry>());
  const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null);

  const socketUrl =
    process.env.NEXT_PUBLIC_LIVETALK_SOCKET_URL ?? "http://localhost:3011";

  const orderProducersForConsume = (producers: LiveTalkProducerSummary[]) =>
    [...producers].sort((left, right) => {
      if (left.kind === right.kind) {
        return 0;
      }

      return left.kind === "video" ? -1 : 1;
    });

  const canConnect = Boolean(userNameInput.trim() && sessionCodeInput.trim());

  const syncRemoteFeeds = () => {
    setRemoteFeeds(
      Array.from(feedByPeerRef.current.entries()).map(([peerId, entry]) => ({
        peerId,
        displayName: entry.displayName,
        stream: entry.stream,
      }))
    );
  };

  const removeProducerTrack = (producerId: string) => {
    const meta = producerMetaRef.current.get(producerId);
    if (meta) {
      const feed = feedByPeerRef.current.get(meta.peerId);
      const existingTrack = feed?.trackByKind.get(meta.kind);

      if (feed) {
        feed.trackByKind.delete(meta.kind);

        const nextTracks = Array.from(feed.trackByKind.values());

        if (nextTracks.length === 0) {
          feedByPeerRef.current.delete(meta.peerId);
        } else {
          feed.stream = new MediaStream(nextTracks);
        }
      }
    }

    const consumer = consumerByProducerRef.current.get(producerId);
    if (consumer && !consumer.closed) {
      consumer.close();
    }

    const transport = recvTransportByProducerRef.current.get(producerId);
    if (transport && !transport.closed) {
      transport.close();
    }

    consumerByProducerRef.current.delete(producerId);
    recvTransportByProducerRef.current.delete(producerId);
    producerMetaRef.current.delete(producerId);
    syncRemoteFeeds();
  };


  const cleanupSession = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;

    if (audioProducerRef.current && !audioProducerRef.current.closed) {
      audioProducerRef.current.close();
    }
    audioProducerRef.current = null;

    if (videoProducerRef.current && !videoProducerRef.current.closed) {
      videoProducerRef.current.close();
    }
    videoProducerRef.current = null;

    if (sendTransportRef.current && !sendTransportRef.current.closed) {
      sendTransportRef.current.close();
    }
    sendTransportRef.current = null;

    recvTransportByProducerRef.current.forEach((transport) => {
      if (!transport.closed) {
        transport.close();
      }
    });
    recvTransportByProducerRef.current.clear();

    consumerByProducerRef.current.forEach((consumer) => {
      if (!consumer.closed) {
        consumer.close();
      }
    });
    consumerByProducerRef.current.clear();

    producerMetaRef.current.clear();

    feedByPeerRef.current.forEach((entry) => {
      entry.stream.getTracks().forEach((track) => track.stop());
    });
    feedByPeerRef.current.clear();

    const currentLocalStream = localStreamRef.current;
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => track.stop());
    }
    localStreamRef.current = null;

    deviceRef.current = null;
    setLocalStream(null);
    setRemoteFeeds([]);
    setMessages([]);
    setSocketId("");
    setActiveSession(null);
    setAudioEnabled(false);
    setVideoEnabled(false);
  };

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, []);

  const waitForSocketConnection = async (socket: Socket) => {
    if (socket.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("Socket-Verbindung Timeout nach 8 Sekunden."));
      }, 8000);

      const handleConnect = () => {
        cleanup();
        resolve();
      };

      const handleError = (error: Error) => {
        cleanup();
        reject(new Error(`Socket connect_error: ${error.message}`));
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleError);
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", handleError);
    });
  };

  const addTrackToFeed = (
    summary: LiveTalkProducerSummary,
    track: MediaStreamTrack
  ) => {
    let feed = feedByPeerRef.current.get(summary.peerId);

    if (!feed) {
      feed = {
        displayName: summary.displayName,
        stream: new MediaStream(),
        trackByKind: new Map(),
      };
      feedByPeerRef.current.set(summary.peerId, feed);
    }

    feed.displayName = summary.displayName;

    feed.trackByKind.set(summary.kind, track);
    feed.stream = new MediaStream(Array.from(feed.trackByKind.values()));
    syncRemoteFeeds();
  };

  const consumeProducer = async (summary: LiveTalkProducerSummary) => {
    const socket = socketRef.current;
    const device = deviceRef.current;

    if (!socket || !device) {
      return;
    }

    if (consumerByProducerRef.current.has(summary.producerId)) {
      return;
    }

    console.log("[LiveTalk] consumeProducer:start", summary);
    producerMetaRef.current.set(summary.producerId, summary);

    const transportAck = await emitAck<TransportCreateAck>(
      socket,
      "transport:create",
      { direction: "recv" }
    );

    if (!transportAck.ok) {
      throw new Error(transportAck.error);
    }

    const recvTransport = device.createRecvTransport(transportAck.transport);
    recvTransportByProducerRef.current.set(summary.producerId, recvTransport);

    recvTransport.on("connectionstatechange", (state) => {
      console.log("[LiveTalk] recv transport state", {
        producerId: summary.producerId,
        kind: summary.kind,
        state,
      });
    });

    recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        const connectAck = await emitAck<GenericAck>(
          socket,
          "transport:connect",
          {
            transportId: recvTransport.id,
            dtlsParameters,
          }
        );

        if (!connectAck.ok) {
          throw new Error(connectAck.error);
        }

        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    const consumerAck = await emitAck<ConsumerCreateAck>(
      socket,
      "consumer:create",
      {
        transportId: recvTransport.id,
        producerId: summary.producerId,
        rtpCapabilities: device.rtpCapabilities,
      }
    );

    if (!consumerAck.ok) {
      throw new Error(consumerAck.error);
    }

    const consumer = await recvTransport.consume(consumerAck.consumer);
    consumerByProducerRef.current.set(summary.producerId, consumer);

    console.log("[LiveTalk] consumer created", {
      producerId: summary.producerId,
      kind: consumer.kind,
      trackMuted: consumer.track.muted,
      trackReadyState: consumer.track.readyState,
    });

    const resumeAck = await emitAck<GenericAck>(socket, "consumer:resume", {
      consumerId: consumer.id,
    });

    if (!resumeAck.ok) {
      throw new Error(resumeAck.error);
    }

    console.log("[LiveTalk] consumer resumed", {
      producerId: summary.producerId,
      kind: consumer.kind,
    });

    const attachTrack = () => {
      console.log("[LiveTalk] attach remote track", {
        producerId: summary.producerId,
        kind: consumer.kind,
        readyState: consumer.track.readyState,
        muted: consumer.track.muted,
      });
      addTrackToFeed(summary, consumer.track);
    };

    consumer.track.addEventListener(
      "unmute",
      () => {
        console.log("[LiveTalk] remote track unmuted", {
          producerId: summary.producerId,
          kind: consumer.kind,
          readyState: consumer.track.readyState,
        });
        attachTrack();
      },
      { once: true }
    );

    consumer.track.addEventListener("mute", () => {
      console.log("[LiveTalk] remote track muted", {
        producerId: summary.producerId,
        kind: consumer.kind,
      });
    });

    consumer.track.addEventListener("ended", () => {
      console.log("[LiveTalk] remote track ended", {
        producerId: summary.producerId,
        kind: consumer.kind,
      });
    });

    if (consumer.kind !== "video" || !consumer.track.muted) {
      attachTrack();
    }

    consumer.on("transportclose", () => {
      removeProducerTrack(summary.producerId);
    });
  };

  const startLocalMedia = async () => {
    const socket = socketRef.current;
    const device = deviceRef.current;

    if (!socket || !device) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    console.log("[LiveTalk] local media tracks", {
      audio: stream.getAudioTracks().length,
      video: stream.getVideoTracks().length,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);

    const transportAck = await emitAck<TransportCreateAck>(
      socket,
      "transport:create",
      { direction: "send" }
    );

    if (!transportAck.ok) {
      throw new Error(transportAck.error);
    }

    const sendTransport = device.createSendTransport(transportAck.transport);
    sendTransportRef.current = sendTransport;

    sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        const connectAck = await emitAck<GenericAck>(
          socket,
          "transport:connect",
          {
            transportId: sendTransport.id,
            dtlsParameters,
          }
        );

        if (!connectAck.ok) {
          throw new Error(connectAck.error);
        }

        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const produceAck = await emitAck<ProducerStartAck>(
          socket,
          "producer:start",
          {
            transportId: sendTransport.id,
            kind,
            rtpParameters,
          }
        );

        if (!produceAck.ok) {
          throw new Error(produceAck.error);
        }

        callback({ id: produceAck.producerId });
      } catch (error) {
        errback(error as Error);
      }
    });

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    if (audioTrack) {
      audioProducerRef.current = await sendTransport.produce({ track: audioTrack });
    }

    if (videoTrack) {
      videoProducerRef.current = await sendTransport.produce({ track: videoTrack });
    }

    console.log("[LiveTalk] producers started", {
      hasAudioProducer: Boolean(audioProducerRef.current),
      hasVideoProducer: Boolean(videoProducerRef.current),
    });

    setAudioEnabled(Boolean(audioTrack));
    setVideoEnabled(Boolean(videoTrack));
  };

  const openRoom = async (selectedRoom: LiveTalkRoomSummary) => {
    const userName = userNameInput.trim();

    console.log("[LiveTalk] openRoom:start", {
      roomId: selectedRoom.id,
      roomCode: selectedRoom.code,
      userName,
      receiveOnly,
    });

    if (!userName) {
      setErrorMessage("Bitte zuerst einen Usernamen eingeben.");
      return;
    }

    setErrorMessage("");
    setStatusText("Erzeuge LiveTalk-Token...");
    setIsJoining(true);

    try {
      const tokenRes = await fetch("/api/livetalk/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          receiveOnly,
          userName,
        }),
      });

      console.log("[LiveTalk] token response status", tokenRes.status);

      const tokenData = (await tokenRes.json()) as
        | LiveTalkTokenResponse
        | { error: string };
      console.log("[LiveTalk] token response body", tokenData);

      if (!tokenRes.ok || "error" in tokenData) {
        throw new Error("error" in tokenData ? tokenData.error : "Token konnte nicht erstellt werden.");
      }

      setStatusText("Verbinde Socket...");
      console.log("[LiveTalk] socket url", tokenData.socketUrl || socketUrl);

      const socket = io(tokenData.socketUrl || socketUrl, {
        auth: { token: tokenData.token },
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("[LiveTalk] socket connected", socket.id);
      });

      socket.on("connect_error", (error) => {
        console.error("[LiveTalk] socket connect_error", error);
      });

      socket.on("disconnect", (reason) => {
        console.warn("[LiveTalk] socket disconnect", reason);
      });

      socketRef.current = socket;

      await waitForSocketConnection(socket);

      console.log("[LiveTalk] socket connected after wait", socket.id);
      setSocketId(socket.id ?? "");

      const joinAck = await emitAck<JoinRoomAck>(socket, "room:join");
      console.log("[LiveTalk] room join ack", joinAck);

      if (!joinAck.ok) {
        throw new Error(joinAck.error);
      }

      const device = new mediasoupClient.Device();
      await device.load({
        routerRtpCapabilities: joinAck.routerRtpCapabilities,
      });

      deviceRef.current = device;
      setSessionKeyInfo(selectedRoom);
      setMessages(joinAck.messages);
      setSessionCodeInput(selectedRoom.code);
      setActiveSession({
        userName,
        sessionCode: selectedRoom.code,
        receiveOnly: joinAck.role === "viewer" ? true : receiveOnly,
      });

      socket.on("producers:new", (producers: LiveTalkProducerSummary[]) => {
        void Promise.all(
          orderProducersForConsume(producers).map((producer) => consumeProducer(producer))
        ).catch((error) => console.error("consume new producers failed", error));
      });

      socket.on("producer:closed", (payload: { producerId: string }) => {
        removeProducerTrack(payload.producerId);
      });

      socket.on("chat:new", (message: LiveTalkChatMessage) => {
        setMessages((current) => [...current, message].slice(-50));
      });

      await Promise.all(
        orderProducersForConsume(joinAck.producers).map((producer) => consumeProducer(producer))
      );

      if (joinAck.role !== "viewer") {
        setStatusText("Starte Kamera und Mikrofon...");
        await startLocalMedia();
      } else {
        setAudioEnabled(false);
        setVideoEnabled(false);
      }

      setStatusText(`Verbunden mit Session ${selectedRoom.code}.`);

    } catch (error) {
      console.error("[LiveTalk] openRoom failed", error);
      cleanupSession();
      setErrorMessage(error instanceof Error ? error.message : "LiveTalk-Verbindung fehlgeschlagen.");
      setStatusText("Verbindung fehlgeschlagen.");
    } finally {
      setIsJoining(false);
    }
  };

  const generateSessionKey = async () => {
    setErrorMessage("");
    setIsGeneratingCode(true);

    try {
      const response = await fetch("/api/livetalk/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as
        | { room: LiveTalkRoomSummary }
        | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Session-Key konnte nicht erstellt werden."
        );
      }

      setSessionKeyInfo(data.room);
      setSessionCodeInput(data.room.code);
      setStatusText(`Neuer Session-Key ${data.room.code} wurde erstellt.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Session-Key konnte nicht erstellt werden."
      );
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const connectWithSessionKey = async () => {
    console.log("[LiveTalk] connectWithSessionKey:start", {
      userNameInput,
      sessionCodeInput,
      receiveOnly,
    });

    setErrorMessage("");
    setStatusText("Prüfe Session-Key...");

    if (!userNameInput.trim()) {
      setErrorMessage("Bitte zuerst einen Usernamen eingeben.");
      return;
    }

    if (!sessionCodeInput.trim()) {
      setErrorMessage("Bitte einen Session-Key eingeben oder erzeugen.");
      return;
    }

    setIsJoining(true);

    try {
      const url = `/api/livetalk/rooms?code=${encodeURIComponent(sessionCodeInput.trim().toUpperCase())}`;
      console.log("[LiveTalk] rooms request", url);

      const response = await fetch(url, { cache: "no-store" });
      console.log("[LiveTalk] rooms response status", response.status);

      const data = await response.json();
      console.log("[LiveTalk] rooms response body", data);

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Session konnte nicht geladen werden.");
      }

      setSessionKeyInfo(data.room);
      setStatusText("Session gefunden. Fordere Token an...");
      await openRoom(data.room);
    } catch (error) {
      console.error("[LiveTalk] connectWithSessionKey failed", error);
      setErrorMessage(error instanceof Error ? error.message : "Beitritt fehlgeschlagen.");
      setStatusText("Verbindung fehlgeschlagen.");
      setIsJoining(false);
    }
  };

  const leaveSession = () => {
    cleanupSession();
    setStatusText("Session verlassen.");
    setErrorMessage("");
  };

  const copySessionKey = async () => {
    const code = sessionKeyInfo?.code || activeSession?.sessionCode || sessionCodeInput;

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setStatusText(`Session-Key ${code} wurde in die Zwischenablage kopiert.`);
    } catch {
      setStatusText(`Session-Key ${code} bitte manuell kopieren.`);
    }
  };

  const toggleAudio = async () => {
    const producer = audioProducerRef.current;

    if (!producer) {
      return;
    }

    if (producer.paused) {
      await producer.resume();
      if (producer.track) {
        producer.track.enabled = true;
      }
      setAudioEnabled(true);
      return;
    }

    await producer.pause();
    if (producer.track) {
      producer.track.enabled = false;
    }
    setAudioEnabled(false);
  };

  const toggleVideo = async () => {
    const producer = videoProducerRef.current;

    if (!producer) {
      return;
    }

    if (producer.paused) {
      await producer.resume();
      if (producer.track) {
        producer.track.enabled = true;
      }
      setVideoEnabled(true);
      return;
    }

    await producer.pause();
    if (producer.track) {
      producer.track.enabled = false;
    }
    setVideoEnabled(false);
  };

  const sendChatMessage = async () => {
    const socket = socketRef.current;
    const message = chatInput.trim();

    if (!socket || !activeSession || !message) {
      return;
    }

    const ack = await emitAck<GenericAck>(socket, "chat:send", { message });

    if (!ack.ok) {
      setErrorMessage(ack.error);
      return;
    }

    setChatInput("");
  };

  const remoteVideoFeeds = remoteFeeds.filter(
    (feed) => feed.stream.getVideoTracks().length > 0
  );

  const hasLocalVideo = Boolean(localStream?.getVideoTracks().length);


  if (!rtcEnabled) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-slate-800 shadow-sm">
          <h1 className="text-2xl font-bold">LiveTalk</h1>
          <p className="mt-3">
            The module is present, but `RTC` is currently not enabled in your settings.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-1 w-full h-full mx-auto overflow-x-hidden min-w-0">
      <MoveableScrollAreaVertical className="p-2 bg-gray-200 flex-1 min-w-0 box-border w-screen lg:w-[calc(100vw-100px)] h-dvh lg:h-[calc(100dvh-100px)] overflow-x-hidden text-gray-800 lg:p-0 no-scrollbar shadow-md cursor-grab select-none">

        {/* Header */}
        <section className="mb-2 bg-gray-300 rounded-lg shadow-sm">
          <h1 className="p-3 text-3xl font-bold text-slate-900">LiveTalk</h1>
          <p className="ml-3 w-100 text-slate-600">
            Enter a username, generate a session key if needed, and then connect to the session.
          </p>
          <p className="ml-3 mt-3 pb-3 text-slate-600">{statusText}</p>
          {errorMessage && (
            <p className="mt-3 font-medium text-red-700">{errorMessage}</p>
          )}
        </section>

        {!activeSession && (
          <section className="mt-1 p-1 flex flex-row gap-2 flex-wrap rounded-lg shadow-sm">
            {/* left Box */}
            <div className="p-2 w-screen max-w-120 h-60 bg-blue-200 rounded-lg flex flex-col justify-between">
              <div className="p-2 bg-gray-200 rounded-lg ">
                {/* Username Input */}
                <label className="flex flex-col">
                  <span className="font-semibold text-slate-900">Username</span>
                  <input
                    value={userNameInput}
                    onChange={(event) => setUserNameInput(event.target.value)}
                    placeholder="z.B. Anna"
                    className="p-2 rounded-lg border border-gray-300"
                  />
                </label>

                {/* Session-Key */}
                <label className="flex flex-col">
                  <span className="font-semibold text-slate-900">Session-Key</span>
                  <input
                    value={sessionCodeInput}
                    onChange={(event) => setSessionCodeInput(event.target.value.toUpperCase())}
                    placeholder="z.B. A1B2C3D4E5"
                    className="p-2 rounded-lg border border-gray-300 uppercase tracking-[0.08em]"
                  />
                </label>

                {sessionKeyInfo && sessionKeyInfo.code === sessionCodeInput.trim().toUpperCase() && (
                  <div className="my-2 p-2 rounded-lg border border-gray-200 bg-green-100 text-slate-600 text-sm">
                    <div className="font-semibold text-slate-800">Session-Key {sessionKeyInfo.code}</div>
                    {sessionKeyInfo.expiresAt && (
                      <div className="mt-1">Valid until: {formatDateTime(sessionKeyInfo.expiresAt)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Box */}
            <div className="p-2 w-screen max-w-120 h-60 bg-blue-200 rounded-lg ">
              <div className="h-full p-5 bg-gray-200 rounded-lg flex flex-col items-center justify-between">
                {/* Checkbox */}
                <label className="w-100 ml-16 flex gap-3 text-slate-700">
                  <input
                    type="checkbox"
                    checked={receiveOnly}
                    onChange={(event) => setReceiveOnly(event.target.checked)}
                  />
                  Start session without microphone and camera
                </label>

                {/* Buttons */}
                <button
                  type="button"
                  onClick={() => void generateSessionKey()}
                  disabled={isGeneratingCode}
                  className="h-12 w-70 py-3 rounded-lg bg-gray-500  hover:bg-gray-400 text-black font-semibold transition"
                >
                  {isGeneratingCode ? "Creating Session-Key..." : "Create Session-Key"}
                </button>

                <button
                  type="button"
                  onClick={() => void connectWithSessionKey()}
                  disabled={!canConnect || isJoining}
                  className="h-12 w-70 py-3 rounded-lg bg-orange-500  hover:bg-orange-400 text-black font-semibold transition"
                >
                  {isJoining ? "Connecting..." : "Connect with Session-Key"}
                </button>
              </div>
            </div>
          </section>
        )}

        {activeSession && (
          <>
            <div className="flex flex-col flex-wrap gap-1">
              <div className="flex flex-row flex-wrap gap-1">

                {/* Active - Left Box */}
                <section className="p-2 w-screen max-w-120 h-60 bg-red-200 rounded-lg shadow-sm">
                  <div className="h-full bg-gray-200 p-2 rounded-lg flex flex-col flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Active Session</h2>
                      <p className="mt-2 text-slate-600">
                        Session-Key <strong>{activeSession.sessionCode}</strong> with User <strong>{activeSession.userName}</strong>
                      </p>
                      <p className="mt-2 text-slate-500">
                        Socket: {socketId || "verbinde..."} | {activeSession.receiveOnly ? "Viewer" : "Teilnehmer mit Feed"}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-gray-300 w-full flex flex-row justify-between">
                      <button
                        type="button"
                        onClick={leaveSession}
                        className="h-12 w-70 py-3 rounded-lg bg-orange-500  hover:bg-orange-400 text-black font-semibold transition"
                      >
                        Leave Session
                      </button>

                      {/* Active Session Field */}
                      {!activeSession.receiveOnly && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void toggleAudio()}
                            disabled={!localStream}
                            className="px-4 py-3 rounded-lg border border-slate-300 bg-white  font-semibold text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            {audioEnabled ? "🎤" : "🎤"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleVideo()}
                            disabled={!localStream}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            {videoEnabled ? "📷" : "📷"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Active - Right Box */}
                {sessionKeyInfo && (
                  <section className="p-2 w-screen max-w-120 h-60 bg-red-200 rounded-lg shadow-sm">
                    <div className="h-full p-2 bg-gray-200 rounded-lg flex flex-col justify-between">
                      <div className="flex flex-col ">

                        <h3 className="text-xl font-semibold text-slate-900">Session-Key</h3>
                        <div className="mt-3 text-2xl font-extrabold tracking-[0.12em] text-slate-900">{sessionKeyInfo.code}</div>
                        {sessionKeyInfo.expiresAt && (
                          <p className="mt-3 text-slate-600">Valid until: {formatDateTime(sessionKeyInfo.expiresAt)}</p>
                        )}
                      </div>

                      <div className="p-2 flex justify-center rounded-lg bg-gray-300">
                        <button
                          type="button"
                          onClick={() => void copySessionKey()}
                          className="h-12 w-70 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold transition"
                        >
                          Copy Session-Key
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="flex flex-row flex-wrap gap-1">
                {/* Active Video Area */}
                <section className="rounded-lg flex flex-row flex-wrap">
                  {!activeSession.receiveOnly && (
                    <div className="h-82 p-1 w-screen max-w-120 bg-red-200 rounded-lg shadow-sm flex justify-center items-center">
                      {hasLocalVideo ? (
                        <VideoTile title={`Ich (${activeSession.userName})`} stream={localStream} muted />
                      ) : (
                        <div className="h-full w-full p-4 rounded-lg bg-gray-200 flex flex-col shadow-sm justify-center items-center">
                          <h3 className="text-lg font-semibold text-slate-900">Camera is starting</h3>
                          <p className="mt-2 text-slate-700">
                            Once your camera and microphone are enabled, your image will be displayed here.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Remote Video Area */}
                <section>
                  {remoteVideoFeeds.length > 0 ? (
                    <div className="h-82 p-2 w-screen max-w-120 bg-red-200 rounded-lg">
                      <div className="grid gap-4">
                        {remoteVideoFeeds.map((feed) => (
                          <VideoTile
                            key={feed.peerId}
                            title={feed.displayName}
                            stream={feed.stream}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-82 p-2 w-screen max-w-120 bg-red-200 rounded-lg">
                      <div className="h-full p-4 rounded-lg bg-gray-200 flex flex-col shadow-sm justify-center items-center">
                        <h3 className="text-lg font-semibold text-slate-900">Warte auf weitere Teilnehmende</h3>
                        <p className="mt-2">
                          As soon as other clients with an active camera feed use the same session key, their streams will be displayed here.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* ChatBox */}
            <section className="max-w-120 mt-1 mb-6 p-2 bg-red-200 rounded-lg shadow-sm">
              <div className="p-2 bg-gray-200 rounded-lg">
                <h3 className="text-xl font-semibold text-slate-900">Chat</h3>

                <div className="mt-4 p-4 grid max-h-80 bg-gray-300 gap-3 overflow-y-auto rounded-lg border border-slate-200">
                  {messages.length === 0 ? (
                    <p className="text-slate-500">No news yet in this session.</p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id}>
                        <p className="text-sm font-semibold text-slate-800">{message.displayName}</p>
                        <p className="text-sm text-slate-700">{message.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void sendChatMessage();
                      }
                    }}
                    placeholder="Write Comment"
                    className="p-2 bg-white flex-1 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => void sendChatMessage()}
                    disabled={!chatInput.trim()}
                    className="h-12 px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>

          </>
        )}
      </MoveableScrollAreaVertical>
    </div>
  );
}
