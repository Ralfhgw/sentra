import type { Server, Socket } from "socket.io";
import { verifyLiveTalkToken, type LiveTalkTokenPayload } from "../auth/verifySentraToken";
import { RoomsStore } from "../domain/roomsStore";
import { createWebRtcTransport, toTransportOptions } from "../mediasoup/transports";
import { getRecentMessages, saveMessage } from "../persistence/messagesRepo";
import {
    getRoomById,
    markParticipantJoined,
    markParticipantLeft,
    touchRoomActivity
} from "../persistence/roomsRepo";
import type {
    GenericAck,
    JoinRoomAck,
    TransportCreateAck,
    TransportDirection
} from "../types/protocol";

type Ack<T> = (payload: T) => void;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unexpected LiveTalk error.";
}

function getAuth(socket: Socket) {
    const auth = (socket.data as { auth?: LiveTalkTokenPayload }).auth;
    if (!auth) {
        throw new Error("Socket is not authenticated.");
    }
    return auth;
}

export function registerHandlers(io: Server, roomsStore: RoomsStore) {
    io.use(async (socket, next) => {
        try {
            const token =
                typeof socket.handshake.auth?.token === "string"
                    ? socket.handshake.auth.token
                    : "";

            const auth = verifyLiveTalkToken(token);
            const room = await getRoomById(auth.roomId);

            if (!room || room.code !== auth.roomCode) {
                throw new Error("LiveTalk room not found.");
            }

            if (room.status !== "active") {
                throw new Error("LiveTalk room is not active.");
            }

            if (room.expires_at && new Date(room.expires_at).getTime() <= Date.now()) {
                throw new Error("LiveTalk room has expired.");
            }

            (socket.data as { auth?: LiveTalkTokenPayload }).auth = auth;
            next();
        } catch (error) {
            next(error as Error);
        }
    });

    io.on("connection", (socket) => {
        socket.on("room:join", async (ack: Ack<JoinRoomAck>) => {
            try {
                const auth = getAuth(socket);
                const room = await roomsStore.getOrCreateRoom(auth.roomId, auth.roomCode);

                roomsStore.addPeer(auth.roomId, {
                    socketId: socket.id,
                    userId: auth.sub,
                    displayName: auth.displayName,
                    role: auth.role
                });

                socket.join(auth.roomId);

                await touchRoomActivity(auth.roomId);
                await markParticipantJoined({
                    roomId: auth.roomId,
                    userId: auth.sub,
                    displayName: auth.displayName,
                    role: auth.role,
                    connectionId: socket.id
                });

                const messages = await getRecentMessages(auth.roomId);

                ack({
                    ok: true,
                    socketId: socket.id,
                    roomId: auth.roomId,
                    roomCode: auth.roomCode,
                    displayName: auth.displayName,
                    role: auth.role,
                    routerRtpCapabilities: room.router.rtpCapabilities,
                    producers: roomsStore.listRemoteProducers(auth.roomId, socket.id),
                    messages
                });
            } catch (error) {
                ack({
                    ok: false,
                    error: getErrorMessage(error)
                });
            }
        });

        socket.on(
            "transport:create",
            async (
                payload: { direction: TransportDirection },
                ack: Ack<TransportCreateAck>
            ) => {
                try {
                    const auth = getAuth(socket);
                    const room = roomsStore.getRoom(auth.roomId);

                    if (!room) {
                        throw new Error("Room not initialized.");
                    }

                    const transport = await createWebRtcTransport(room.router);

                    roomsStore.addTransport(auth.roomId, socket.id, transport, payload.direction);

                    transport.on("dtlsstatechange", (state) => {
                        if (state === "closed") {
                            roomsStore.removeTransport(auth.roomId, socket.id, transport.id);
                        }
                    });

                    transport.on("routerclose", () => {
                        roomsStore.removeTransport(auth.roomId, socket.id, transport.id);
                    });

                    ack({
                        ok: true,
                        transport: toTransportOptions(transport)
                    });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on(
            "transport:connect",
            async (
                payload: {
                    transportId: string;
                    dtlsParameters: unknown;
                },
                ack: Ack<GenericAck>
            ) => {
                try {
                    const auth = getAuth(socket);
                    const transport = roomsStore.getTransport(auth.roomId, socket.id, payload.transportId);

                    if (!transport) {
                        throw new Error("Transport not found.");
                    }

                    await transport.connect({
                        dtlsParameters: payload.dtlsParameters as never
                    });

                    ack({ ok: true });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on(
            "producer:start",
            async (
                payload: {
                    transportId: string;
                    kind: "audio" | "video";
                    rtpParameters: unknown;
                },
                ack: Ack<{ ok: true; producerId: string } | { ok: false; error: string }>
            ) => {
                try {
                    const auth = getAuth(socket);
                    const transport = roomsStore.getTransport(auth.roomId, socket.id, payload.transportId);
                    const direction = roomsStore.getTransportDirection(auth.roomId, socket.id, payload.transportId);

                    if (!transport || direction !== "send") {
                        throw new Error("Send transport not found.");
                    }

                    const producer = await transport.produce({
                        kind: payload.kind,
                        rtpParameters: payload.rtpParameters as never,
                        appData: {
                            peerId: socket.id,
                            userId: auth.sub,
                            displayName: auth.displayName
                        }
                    });

                    roomsStore.addProducer(auth.roomId, socket.id, producer);

                    let cleanedUp = false;

                    const handleProducerClosed = () => {
                        if (cleanedUp) {
                            return;
                        }

                        cleanedUp = true;

                        roomsStore.removeProducer(auth.roomId, socket.id, producer.id);
                        socket.to(auth.roomId).emit("producer:closed", {
                            producerId: producer.id,
                            peerId: socket.id,
                            kind: producer.kind
                        });
                    };

                    producer.on("transportclose", handleProducerClosed);
                    producer.observer.on("close", handleProducerClosed);

                    socket.to(auth.roomId).emit("producers:new", [
                        {
                            producerId: producer.id,
                            peerId: socket.id,
                            kind: producer.kind,
                            displayName: auth.displayName,
                            paused: producer.paused
                        }
                    ]);

                    await touchRoomActivity(auth.roomId);

                    ack({
                        ok: true,
                        producerId: producer.id
                    });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on(
            "consumer:create",
            async (
                payload: {
                    transportId: string;
                    producerId: string;
                    rtpCapabilities: unknown;
                },
                ack: Ack<
                    | {
                        ok: true;
                        consumer: {
                            id: string;
                            producerId: string;
                            kind: string;
                            rtpParameters: unknown;
                        };
                    }
                    | {
                        ok: false;
                        error: string;
                    }
                >
            ) => {
                try {
                    const auth = getAuth(socket);
                    const room = roomsStore.getRoom(auth.roomId);
                    const transport = roomsStore.getTransport(auth.roomId, socket.id, payload.transportId);
                    const direction = roomsStore.getTransportDirection(auth.roomId, socket.id, payload.transportId);

                    if (!room) {
                        throw new Error("Room not initialized.");
                    }

                    if (!transport || direction !== "recv") {
                        throw new Error("Receive transport not found.");
                    }

                    if (
                        !room.router.canConsume({
                            producerId: payload.producerId,
                            rtpCapabilities: payload.rtpCapabilities as never
                        })
                    ) {
                        throw new Error("Router cannot consume the requested producer.");
                    }

                    const consumer = await transport.consume({
                        producerId: payload.producerId,
                        rtpCapabilities: payload.rtpCapabilities as never,
                        paused: true
                    });

                    roomsStore.addConsumer(auth.roomId, socket.id, consumer);

                    consumer.on("transportclose", () => {
                        roomsStore.removeConsumer(auth.roomId, socket.id, consumer.id);
                    });

                    consumer.on("producerclose", () => {
                        roomsStore.removeConsumer(auth.roomId, socket.id, consumer.id);
                        socket.emit("producer:closed", {
                            producerId: payload.producerId
                        });
                    });

                    ack({
                        ok: true,
                        consumer: {
                            id: consumer.id,
                            producerId: payload.producerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters
                        }
                    });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on(
            "consumer:resume",
            async (
                payload: { consumerId: string },
                ack: Ack<GenericAck>
            ) => {
                try {
                    const auth = getAuth(socket);
                    const consumer = roomsStore.getConsumer(auth.roomId, socket.id, payload.consumerId);

                    if (!consumer) {
                        throw new Error("Consumer not found.");
                    }

                    if (consumer.paused) {
                        await consumer.resume();
                    }

                    ack({ ok: true });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on(
            "chat:send",
            async (
                payload: { message: string },
                ack: Ack<GenericAck>
            ) => {
                try {
                    const auth = getAuth(socket);
                    const message = payload.message?.trim();

                    if (!message) {
                        throw new Error("Message is empty.");
                    }

                    const saved = await saveMessage({
                        roomId: auth.roomId,
                        userId: auth.sub,
                        displayName: auth.displayName,
                        message
                    });

                    io.to(auth.roomId).emit("chat:new", saved);
                    await touchRoomActivity(auth.roomId);

                    ack({ ok: true });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on(
            "peer:audio",
            async (
                payload: { enabled: boolean },
                ack: Ack<GenericAck>
            ) => {
                try {
                    const auth = getAuth(socket);
                    const peer = roomsStore.getPeer(auth.roomId, socket.id);

                    if (!peer) {
                        throw new Error("Peer not found.");
                    }

                    for (const producer of peer.producers.values()) {
                        if (producer.kind !== "audio") {
                            continue;
                        }

                        if (payload.enabled && producer.paused) {
                            await producer.resume();
                        }

                        if (!payload.enabled && !producer.paused) {
                            await producer.pause();
                        }
                    }

                    socket.to(auth.roomId).emit("peer:audio", {
                        peerId: socket.id,
                        enabled: payload.enabled
                    });

                    ack({ ok: true });
                } catch (error) {
                    ack({
                        ok: false,
                        error: getErrorMessage(error)
                    });
                }
            }
        );

        socket.on("disconnect", async () => {
            try {
                const auth = getAuth(socket);
                const summaries = roomsStore.getPeerProducerSummaries(auth.roomId, socket.id);

                roomsStore.removePeer(auth.roomId, socket.id);
                await markParticipantLeft(socket.id);

                for (const summary of summaries) {
                    socket.to(auth.roomId).emit("producer:closed", {
                        producerId: summary.producerId,
                        peerId: summary.peerId,
                        kind: summary.kind
                    });
                }
            } catch {
                // ignore disconnect cleanup errors
            }
        });
    });
}
