import type {
  Consumer,
  Producer,
  WebRtcTransport
} from "mediasoup/node/lib/types";
import type { LiveTalkRole, TransportDirection } from "../types/protocol";

export type PeerRuntime = {
  socketId: string;
  userId: string;
  displayName: string;
  role: LiveTalkRole;
  transports: Map<string, WebRtcTransport>;
  transportDirections: Map<string, TransportDirection>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
};

export function closePeer(peer: PeerRuntime) {
  for (const consumer of peer.consumers.values()) {
    if (!consumer.closed) {
      consumer.close();
    }
  }

  for (const producer of peer.producers.values()) {
    if (!producer.closed) {
      producer.close();
    }
  }

  for (const transport of peer.transports.values()) {
    if (!transport.closed) {
      transport.close();
    }
  }

  peer.consumers.clear();
  peer.producers.clear();
  peer.transports.clear();
  peer.transportDirections.clear();
}
