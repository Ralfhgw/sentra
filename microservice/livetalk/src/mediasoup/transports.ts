import type { Router, WebRtcTransport } from "mediasoup/node/lib/types";
import { config } from "../config";

export async function createWebRtcTransport(router: Router) {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: config.listenIp,
        announcedIp: config.announcedIp
      }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000
  });

  try {
    await transport.setMaxIncomingBitrate(1_500_000);
  } catch {
    // bitrate limit is optional for the MVP
  }

  return transport;
}

export function toTransportOptions(transport: WebRtcTransport) {
  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters
  };
}
