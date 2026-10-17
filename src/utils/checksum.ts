import type { OnlineSnapshot } from "../types/index.js";

export function getSnapshotChecksum(snapshot: OnlineSnapshot): string {
  if (!snapshot || snapshot.servers.length === 0) return "";

  const serversPart = snapshot.servers
    .map((s) => `${s.id}:${s.statusText}:${s.players}:${s.queuedPlayers}`)
    .join(",");

  return `${snapshot.players}-${serversPart}`;
}
