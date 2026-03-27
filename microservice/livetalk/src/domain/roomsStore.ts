import type {
  Consumer,
  Producer,
  Router,
  WebRtcTransport
} from "mediasoup/node/lib/types";
import { mediaCodecs, type WorkerPool } from "../mediasoup/createWorkers";
import type {
  LiveTalkRole,
  ProducerSummary,
  TransportDirection
} from "../types/protocol";
import { closePeer, type PeerRuntime } from "./peerState";

export type RoomRuntime = {
  id: string;
  code: string;
  router: Router;
  peers: Map<string, PeerRuntime>;
};

export class RoomsStore {
  private readonly rooms = new Map<string, RoomRuntime>();

  constructor(private readonly workerPool: WorkerPool) {}

  async getOrCreateRoom(roomId: string, roomCode: string) {
    const existing = this.rooms.get(roomId);
    if (existing) {
      return existing;
    }

    const worker = this.workerPool.nextWorker();
    const router = await worker.createRouter({ mediaCodecs });

    const room: RoomRuntime = {
      id: roomId,
      code: roomCode,
      router,
      peers: new Map()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId) ?? null;
  }

  addPeer(
    roomId: string,
    input: {
      socketId: string;
      userId: string;
      displayName: string;
      role: LiveTalkRole;
    }
  ) {
    const room = this.requireRoom(roomId);
    const existing = room.peers.get(input.socketId);

    if (existing) {
      return existing;
    }

    const peer: PeerRuntime = {
      socketId: input.socketId,
      userId: input.userId,
      displayName: input.displayName,
      role: input.role,
      transports: new Map(),
      transportDirections: new Map(),
      producers: new Map(),
      consumers: new Map()
    };

    room.peers.set(input.socketId, peer);
    return peer;
  }

  getPeer(roomId: string, socketId: string) {
    return this.rooms.get(roomId)?.peers.get(socketId) ?? null;
  }

  addTransport(
    roomId: string,
    socketId: string,
    transport: WebRtcTransport,
    direction: TransportDirection
  ) {
    const peer = this.requirePeer(roomId, socketId);
    peer.transports.set(transport.id, transport);
    peer.transportDirections.set(transport.id, direction);
    return transport;
  }

  getTransport(roomId: string, socketId: string, transportId: string) {
    return this.getPeer(roomId, socketId)?.transports.get(transportId) ?? null;
  }

  getTransportDirection(roomId: string, socketId: string, transportId: string) {
    return this.getPeer(roomId, socketId)?.transportDirections.get(transportId) ?? null;
  }

  removeTransport(roomId: string, socketId: string, transportId: string) {
    const peer = this.getPeer(roomId, socketId);
    if (!peer) {
      return;
    }

    const transport = peer.transports.get(transportId);
    peer.transportDirections.delete(transportId);
    peer.transports.delete(transportId);

    if (transport && !transport.closed) {
      transport.close();
    }
  }

  addProducer(roomId: string, socketId: string, producer: Producer) {
    const peer = this.requirePeer(roomId, socketId);
    peer.producers.set(producer.id, producer);
    return producer;
  }

  removeProducer(roomId: string, socketId: string, producerId: string) {
    const peer = this.getPeer(roomId, socketId);
    if (!peer) {
      return;
    }

    peer.producers.delete(producerId);
  }

  addConsumer(roomId: string, socketId: string, consumer: Consumer) {
    const peer = this.requirePeer(roomId, socketId);
    peer.consumers.set(consumer.id, consumer);
    return consumer;
  }

  getConsumer(roomId: string, socketId: string, consumerId: string) {
    return this.getPeer(roomId, socketId)?.consumers.get(consumerId) ?? null;
  }

  removeConsumer(roomId: string, socketId: string, consumerId: string) {
    const peer = this.getPeer(roomId, socketId);
    if (!peer) {
      return;
    }

    const consumer = peer.consumers.get(consumerId);
    peer.consumers.delete(consumerId);

    if (consumer && !consumer.closed) {
      consumer.close();
    }
  }

  findProducer(roomId: string, producerId: string) {
    const room = this.getRoom(roomId);
    if (!room) {
      return null;
    }

    for (const peer of room.peers.values()) {
      const producer = peer.producers.get(producerId);
      if (producer) {
        return { peer, producer };
      }
    }

    return null;
  }

  listRemoteProducers(roomId: string, excludeSocketId: string): ProducerSummary[] {
    const room = this.getRoom(roomId);
    if (!room) {
      return [];
    }

    const result: ProducerSummary[] = [];

    for (const peer of room.peers.values()) {
      if (peer.socketId === excludeSocketId) {
        continue;
      }

      for (const producer of peer.producers.values()) {
        result.push({
          producerId: producer.id,
          peerId: peer.socketId,
          kind: producer.kind,
          displayName: peer.displayName,
          paused: producer.paused
        });
      }
    }

    return result;
  }

  getPeerProducerSummaries(roomId: string, socketId: string): ProducerSummary[] {
    const peer = this.getPeer(roomId, socketId);
    if (!peer) {
      return [];
    }

    return Array.from(peer.producers.values()).map((producer) => ({
      producerId: producer.id,
      peerId: peer.socketId,
      kind: producer.kind,
      displayName: peer.displayName,
      paused: producer.paused
    }));
  }

  removePeer(roomId: string, socketId: string) {
    const room = this.getRoom(roomId);
    if (!room) {
      return;
    }

    const peer = room.peers.get(socketId);
    if (!peer) {
      return;
    }

    closePeer(peer);
    room.peers.delete(socketId);

    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(roomId);
    }
  }

  private requireRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not loaded: ${roomId}`);
    }
    return room;
  }

  private requirePeer(roomId: string, socketId: string) {
    const peer = this.getPeer(roomId, socketId);
    if (!peer) {
      throw new Error(`Peer not found: ${socketId}`);
    }
    return peer;
  }
}
