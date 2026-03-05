"use client";
import { useState } from "react";
import type { WebcamClientProps } from "@/types/typesLiveView"
import WebcamItem from "./LiveViewItem";

// Layout Grid Configuration
const LAYOUT_CONFIGS = {
  1: {
    cols: 1,
    cells: [
      { id: 0, span: "col-span-1 row-span-1" },
    ],
  },
  4: {
    cols: 2,
    cells: [
      { id: 0, span: "col-span-1 row-span-1" },
      { id: 1, span: "col-span-1 row-span-1" },
      { id: 2, span: "col-span-1 row-span-1" },
      { id: 3, span: "col-span-1 row-span-1" },
    ],
  },

  6: {
    cols: 3,
    cells: [
      { id: 0, span: "col-span-2 row-span-2" },
      { id: 1, span: "col-span-1 row-span-1" },
      { id: 2, span: "col-span-1 row-span-1" },
      { id: 3, span: "col-span-1 row-span-1" },
      { id: 4, span: "col-span-1 row-span-1" },
      { id: 5, span: "col-span-1 row-span-1" },
    ],
  },

  7: {
    cols: 4,
    cells: [
      { id: 0, span: "col-span-2 row-span-2" },
      { id: 1, span: "col-span-2 row-span-2" },
      { id: 2, span: "col-span-2 row-span-2" },
      { id: 3, span: "col-span-1 row-span-1" },
      { id: 4, span: "col-span-1 row-span-1" },
      { id: 5, span: "col-span-1 row-span-1" },
      { id: 5, span: "col-span-1 row-span-1" },
    ],
  },


  9: {
    cols: 3,
    cells: Array.from({ length: 9 }, (_, i) => ({
      id: i,
      span: "col-span-1 row-span-1",
    })),
  },
  10: {
    cols: 5,
    cells: [
      { id: 0, span: "col-span-4 row-span-4" },
      { id: 1, span: "col-span-1 row-span-1" },
      { id: 2, span: "col-span-1 row-span-1" },
      { id: 3, span: "col-span-1 row-span-1" },
      { id: 4, span: "col-span-1 row-span-1" },
      { id: 5, span: "col-span-1 row-span-1" },
      { id: 6, span: "col-span-1 row-span-1" },
      { id: 7, span: "col-span-1 row-span-1" },
      { id: 8, span: "col-span-1 row-span-1" },
      { id: 9, span: "col-span-1 row-span-1" },
    ],
  },

  13: {
    cols: 5,
    cells: [
      { id: 0, span: "col-span-2 row-span-2" },
      { id: 1, span: "col-span-2 row-span-2" },
      { id: 2, span: "col-span-1 row-span-1" },
      { id: 3, span: "col-span-1 row-span-1" },
      { id: 4, span: "col-span-2 row-span-2" },
      { id: 5, span: "col-span-2 row-span-2" },
      { id: 6, span: "col-span-1 row-span-1" },
      { id: 7, span: "col-span-1 row-span-1" },
      { id: 8, span: "col-span-1 row-span-1" },
      { id: 9, span: "col-span-1 row-span-1" },
      { id: 10, span: "col-span-1 row-span-1" },
      { id: 11, span: "col-span-1 row-span-1" },
      { id: 12, span: "col-span-1 row-span-1" },
    ],
  },
  16: {
    cols: 4,
    cells: [
      { id: 0, span: "col-span-1 row-span-1" },
      { id: 1, span: "col-span-1 row-span-1" },
      { id: 2, span: "col-span-1 row-span-1" },
      { id: 3, span: "col-span-1 row-span-1" },
      { id: 4, span: "col-span-1 row-span-1" },
      { id: 5, span: "col-span-1 row-span-1" },
      { id: 6, span: "col-span-1 row-span-1" },
      { id: 7, span: "col-span-1 row-span-1" },
      { id: 8, span: "col-span-1 row-span-1" },
      { id: 9, span: "col-span-1 row-span-1" },
      { id: 10, span: "col-span-1 row-span-1" },
      { id: 11, span: "col-span-1 row-span-1" },
      { id: 12, span: "col-span-1 row-span-1" },
      { id: 13, span: "col-span-1 row-span-1" },
      { id: 14, span: "col-span-1 row-span-1" },
      { id: 15, span: "col-span-1 row-span-1" },
    ],
  },

};

type UserChannel = {
  url: string;
  name: string
};

export default function WebcamClient({ channels, userChannels, error }: WebcamClientProps) {
  console.log("LiveViewClient userChannels: ", userChannels)

  const [layoutId, setLayoutId] = useState<keyof typeof LAYOUT_CONFIGS>(10);
  const config = LAYOUT_CONFIGS[layoutId];
  const [showMenu, setShowMenu] = useState(false);
  const [popupCell, setPopupCell] = useState<number | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [customUrl, setCustomUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [currentUserChannels, setCurrentUserChannels] = useState<UserChannel[]>(
    typeof userChannels === "string"
      ? JSON.parse(userChannels)
      : userChannels ?? []
  );

  // Extract all groups from channel list
  const groups = Array.from(new Set(channels.map(ch => ch.group).filter(Boolean)));

  // Create filtered list
  const filteredChannels = groupFilter
    ? channels.filter(ch => ch.group === groupFilter)
    : channels;

  // Save channelassignment
  const handleAssignChannel = async () => {
    const newChannels = [...currentUserChannels];
    if (customUrl) {
      newChannels[popupCell!] = { name: customName, url: customUrl };
    } else {
      newChannels[popupCell!] = { name: selectedName, url: selectedUrl };
    }
    console.log("LiveViewClient newChannels: newChannels:", newChannels);

    setCurrentUserChannels(newChannels);
    await fetch("/api/user-channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: newChannels }),
    });

    setPopupCell(null);
    setCustomUrl("");
    setCustomName("");
    setSelectedUrl("");
  };

  const persistChannels = async (next: UserChannel[]) => {
    await fetch("/api/user-channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: next }),
    });
  };

  const handleDropOnSlot = async (toIdx: number) => {
    if (dragFrom === null || dragFrom === toIdx) return;

    const size = Math.max(config.cells.length, currentUserChannels.length);
    const next = Array.from({ length: size }, (_, i) => currentUserChannels[i] ?? { name: "", url: "" });

    [next[dragFrom], next[toIdx]] = [next[toIdx], next[dragFrom]];

    setCurrentUserChannels(next);
    setDragFrom(null);
    await persistChannels(next);
  };

  return (

    <div className="flex justify-center items-center w-full relative">
      {error && (
        <div className="absolute top-0 left-0 w-full bg-red-100 text-red-700 p-4 z-50">
          {error}
        </div>
      )}

      {/* Configuration POPUP Window*/}
      {popupCell !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 min-w-75">
            <h2 className="text-lg font-bold mb-4">Kanal zuweisen</h2>
            {/* Gruppenfilter */}
            <div className="mb-4">
              <label className="block text-sm mb-1">Gruppe filtern:</label>
              <select
                className="w-full p-2 border rounded"
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
              >
                <option value="">Alle Gruppen</option>
                {groups.map((group) => (
                  <option key={group as string} value={group as string}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Auswahl aus gefilterten Channels */}
            <select
              className="w-full mb-4 p-2 border rounded"
              value={selectedUrl ?? ""}
              onChange={e => {
                setSelectedUrl(e.target.value);
                const selected = filteredChannels.find(ch => ch.stream_url === e.target.value);
                setSelectedName(selected?.tvg_name ?? "");
              }}
            >
              <option value="">Bitte wählen...</option>
              {filteredChannels.map((ch) => (
                <option key={ch.id} value={ch.stream_url ?? ""}>
                  {ch.tvg_name} ({ch.sendername})
                </option>
              ))}
            </select>
            {/* Eigener Stream */}
            <input
              type="text"
              placeholder="Eigene Stream-URL"
              value={customUrl}
              onChange={
                e => setCustomUrl(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Name des eigenen Streams"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />
            <button
              className="bg-gray-700 text-white px-4 py-2 rounded"
              onClick={handleAssignChannel}
            >
              Speichern
            </button>
            <button className="ml-2" onClick={() => setPopupCell(null)}>
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div
        className="w-[80%] h-full grid gap-px bg-blue-300 border border-gray-800"
        style={{
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridAutoRows: "minmax(0, 1fr)",
          gridAutoFlow: "dense",
        }}
      >

        {config.cells.map((cell, idx) => (
          <div
            key={`cell-${idx}-${cell.id ?? "empty"}`}
            className={`${cell.span} relative bg-black border border-gray-900/50 group overflow-hidden`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDropOnSlot(idx)}
            onDoubleClick={() => setPopupCell(idx)}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1/2 z-20 cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={() => setDragFrom(idx)}
              onDragEnd={() => setDragFrom(null)}
              title="Zum Verschieben hier ziehen"
              aria-label="Drag handle"
            />

            <WebcamItem
              url={currentUserChannels[idx]?.url ?? null}
              isHuge={cell.span.includes("col-span-4")}
              isLarge={cell.span.includes("col-span-2")}
              channel={cell.id + 1}
            />
          </div>
        ))}
      </div>

      {/* Grid Layout Button */}
      <div className="h-full border-b border-gray-300 bg-black">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="mt-3 mx-1 bg-gray-500 px-4 py-1.5 rounded border border-gray-700 text-xs text-gray-100 hover:bg-gray-800 transition flex items-center gap-3"
          >
            Raster: {layoutId} Ansicht
            <span className={`text-[8px] transition-transform ${showMenu ? "rotate-180" : ""}`}>▼</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 p-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-2xl z-50">
              {(Object.keys(LAYOUT_CONFIGS) as unknown as (keyof typeof LAYOUT_CONFIGS)[]).map((id) => (
                <button
                  key={id}
                  onClick={() => { setLayoutId(id); setShowMenu(false); }}
                  className={`w-full p-2 text-left rounded text-xs transition mb-0.5 ${layoutId === id ? "bg-orange-600/20 text-orange-500 font-bold" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                >
                  {id} Fenster
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
