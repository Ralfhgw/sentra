"use client";
import { useEffect, useState } from "react";
import type { LiveViewPlaybackProfile, LiveViewQualityCap, WebcamClientProps } from "@/types/typesLiveView";
import WebcamItem from "./LiveViewItem";
import ModuleDisabledNotice from "@/components/ModuleDisabledNotice";
import Image from "next/image";

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
      { id: 6, span: "col-span-1 row-span-1" },
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
  name: string;
  location?: string;
};

const PLAYBACK_PROFILE_STORAGE_KEY = "sentra.liveview.playbackProfile";
const QUALITY_CAP_STORAGE_KEY = "sentra.liveview.qualityCap";
const SUBTITLE_ENABLED_STORAGE_KEY = "sentra.liveview.subtitlesEnabled";

const isPlaybackProfile = (
  value: string | null
): value is LiveViewPlaybackProfile =>
  value === "latency" || value === "balanced" || value === "stable";

const isQualityCap = (value: string | null): value is LiveViewQualityCap =>
  value === "auto" ||
  value === "360p" ||
  value === "480p" ||
  value === "720p" ||
  value === "1080p";

export default function LiveViewClient({
  channels,
  userChannels,
  mtxEnabled,
}: WebcamClientProps) {
  console.log("LiveViewClient userChannels: ", userChannels)

  const [layoutId, setLayoutId] = useState<keyof typeof LAYOUT_CONFIGS>(10);
  const config = LAYOUT_CONFIGS[layoutId];
  const [popupCell, setPopupCell] = useState<number | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"" | "copied" | "error">("");

  const [currentUserChannels, setCurrentUserChannels] = useState<UserChannel[]>(
    (typeof userChannels === "string"
      ? JSON.parse(userChannels)
      : userChannels ?? []
    ).map((entry: UserChannel) => {
      const matchedChannel = channels.find((ch) => ch.stream_url === entry.url);
      return {
        ...entry,
        location: entry.location ?? matchedChannel?.location ?? "",
      };
    })
  );
  const [availableChannels, setAvailableChannels] = useState(channels);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [channelSearchTerm, setChannelSearchTerm] = useState("");
  const [playbackProfile, setPlaybackProfile] = useState<LiveViewPlaybackProfile>("balanced");
  const [qualityCap, setQualityCap] = useState<LiveViewQualityCap>("auto");
  const [playbackSettingsReady, setPlaybackSettingsReady] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window === "undefined" ? 1440 : window.innerWidth);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const layoutOptions = Object.keys(LAYOUT_CONFIGS).map(
    (id) => Number(id) as keyof typeof LAYOUT_CONFIGS
  );
  const isSingleLayout = layoutId === 1;

  const resetPopupState = () => {
    setPopupCell(null);
    setCustomUrl("");
    setCustomName("");
    setSelectedName("");
    setSelectedChannelId("");
    setLocationFilter("");
    setChannelSearchTerm("");
    setErrorMessage("");
    setCopyFeedback("");
  };

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    setAvailableChannels(channels);
  }, [channels]);

  useEffect(() => {
    const storedPlaybackProfile = window.localStorage.getItem(
      PLAYBACK_PROFILE_STORAGE_KEY
    );
    const storedQualityCap = window.localStorage.getItem(
      QUALITY_CAP_STORAGE_KEY
    );

    const storedSubtitlesEnabled = window.localStorage.getItem(
      SUBTITLE_ENABLED_STORAGE_KEY
    );

    if (isPlaybackProfile(storedPlaybackProfile)) {
      setPlaybackProfile(storedPlaybackProfile);
    }

    if (isQualityCap(storedQualityCap)) {
      setQualityCap(storedQualityCap);
    }

   if (storedSubtitlesEnabled === "true") {
      setSubtitlesEnabled(true);
    }

    setPlaybackSettingsReady(true);
  }, []);

  useEffect(() => {
    if (!playbackSettingsReady) return;
    window.localStorage.setItem(
      PLAYBACK_PROFILE_STORAGE_KEY,
      playbackProfile
    );
  }, [playbackProfile, playbackSettingsReady]);

  useEffect(() => {
    if (!playbackSettingsReady) return;
    window.localStorage.setItem(QUALITY_CAP_STORAGE_KEY, qualityCap);
  }, [qualityCap, playbackSettingsReady]);

  useEffect(() => {
    if (!playbackSettingsReady) return;
    window.localStorage.setItem(
      SUBTITLE_ENABLED_STORAGE_KEY,
      String(subtitlesEnabled)
    );
  }, [subtitlesEnabled, playbackSettingsReady]);

  useEffect(() => {
    const shouldHideBurgerMenu = isSingleLayout && !isMenuVisible;

    window.dispatchEvent(
      new CustomEvent("liveview-burger-visibility", {
        detail: { hidden: shouldHideBurgerMenu },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("liveview-burger-visibility", {
          detail: { hidden: false },
        })
      );
    };
  }, [isSingleLayout, isMenuVisible]);

  if (!mtxEnabled) {
    return <ModuleDisabledNotice title="LiveView" settingCode="MTX" />;
  }

  const responsiveCols = viewportWidth < 640 ? 1 : viewportWidth < 1024 ? Math.min(2, config.cols) : config.cols;
  const useCompactSpans = viewportWidth < 640;

  // Extract all location from channel list
  const locations = Array.from(
    new Set(
      availableChannels
        .map(ch => ch.location)
        .filter((loc): loc is string => !!loc)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Create filtered list
  const locationFilteredChannels = locationFilter
    ? availableChannels.filter(ch => ch.location === locationFilter)
    : availableChannels;

  const filteredChannels = locationFilteredChannels.filter((ch) => {
    if (!channelSearchTerm.trim()) {
      return true;
    }

    const searchTerms = channelSearchTerm
      .toLowerCase()
      .split(" ")
      .map((term) => term.trim())
      .filter(Boolean);

    const favoriteTokens = new Set(["fav", "favorite", "is:favorite"]);
    const favoriteOnly = searchTerms.some((term) => favoriteTokens.has(term));
    const textSearchTerms = searchTerms.filter(
      (term) => !favoriteTokens.has(term)
    );

    if (favoriteOnly && !ch.isFavorite) {
      return false;
    }



    const searchText = [ch.channel, ch.location, ch.stream_url]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (textSearchTerms.length === 0) {
      return true;
    }

    return textSearchTerms.every((term) => searchText.includes(term));
  });

  const selectedCatalogChannel =
    availableChannels.find((ch) => ch.id === selectedChannelId) ?? null;

  const selectedStreamUrl = selectedCatalogChannel?.stream_url?.trim() ?? "";

  const canDeleteSelectedChannel = selectedCatalogChannel?.isHidden === true;

  const openPopupForSlot = (slotId: number) => {
    const currentSlot = currentUserChannels[slotId];
    const matchedCatalogChannel = currentSlot?.url
      ? availableChannels.find((ch) => ch.stream_url === currentSlot.url)
      : null;

    setPopupCell(slotId);
    setErrorMessage("");
    setChannelSearchTerm("");

    if (matchedCatalogChannel) {
      setLocationFilter(matchedCatalogChannel.location ?? "");
      setSelectedChannelId(matchedCatalogChannel.id);
      setSelectedName(matchedCatalogChannel.channel ?? "");
      setCustomName("");
      setCustomUrl("");
      return;
    }

    setLocationFilter("");
    setSelectedChannelId("");
    setSelectedName("");
    setCustomName(currentSlot?.name ?? "");
    setCustomUrl(currentSlot?.url ?? "");
  };

  // Save channelassignment
  const handleAssignChannel = async () => {
    if (popupCell === null) return;

    setErrorMessage("");

    try {

      const shouldDeleteSlot =
        !locationFilter.trim() &&
        !selectedChannelId &&
        !customUrl.trim();
      if (shouldDeleteSlot) {
        await deleteSlot(popupCell);
        resetPopupState();
        return;
      }
      if (customUrl.trim()) {
        await saveSlot({
          slotId: popupCell,
          name: customName.trim(),
          url: customUrl.trim(),
          transport: "tcp",
        });
      } else {
        await saveSlot({
          slotId: popupCell,
          name: selectedName,
          channelId: selectedChannelId || null,
          url: null,
        });
      }

      resetPopupState();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Slot konnte nicht gespeichert werden."
      );
    }
  };

  const deleteSlot = async (slotId: number) => {
    const response = await fetch(`/api/liveview/slots?slotId=${slotId}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Slot konnte nicht gelöscht werden.");
    }

    if (Array.isArray(data?.channels)) {
      setCurrentUserChannels(data.channels);
    }
  };

  const handleDeleteSelectedChannel = async () => {
    if (!selectedCatalogChannel) return;

    setErrorMessage("");

    try {
      const response = await fetch("/api/liveview/channel-preferences", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedCatalogChannel.id }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Kanal konnte nicht gelöscht werden.");
      }

      setAvailableChannels((prev) =>
        prev.filter((channel) => channel.id !== selectedCatalogChannel.id)
      );

      if (Array.isArray(data?.channels)) {
        setCurrentUserChannels(data.channels);
      }

      setSelectedChannelId("");
      setSelectedName("");
      setCustomName("");
      setCustomUrl("");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kanal konnte nicht gelöscht werden."
      );
    }
  };

  const handleToggleHidden = async () => {
    if (!selectedCatalogChannel) return;

    const nextHiddenState = !selectedCatalogChannel.isHidden;
    setErrorMessage("");

    try {
      const response = await fetch("/api/liveview/channel-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedCatalogChannel.id,
          hidden: nextHiddenState,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Hide-Status konnte nicht gespeichert werden."
        );
      }

      setAvailableChannels((prev) =>
        prev.map((channel) =>
          channel.id === selectedCatalogChannel.id
            ? { ...channel, isHidden: nextHiddenState }
            : channel
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Hide-Status konnte nicht gespeichert werden."
      );
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedCatalogChannel) return;

    const nextIsFavorite = !selectedCatalogChannel.isFavorite;
    setErrorMessage("");

    try {
      const response = await fetch("/api/liveview/channel-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedCatalogChannel.id,
          isFavorite: nextIsFavorite,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Favoritenstatus konnte nicht gespeichert werden."
        );
      }

      setAvailableChannels((prev) =>
        prev.map((channel) =>
          channel.id === selectedCatalogChannel.id
            ? { ...channel, isFavorite: nextIsFavorite }
            : channel
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Favoritenstatus konnte nicht gespeichert werden."
      );
    }
  };

  const handleCopySelectedStreamUrl = async () => {
    if (!selectedStreamUrl) return;

    try {
      await navigator.clipboard.writeText(selectedStreamUrl);
      setCopyFeedback("copied");
      window.setTimeout(() => setCopyFeedback(""), 1500);
    } catch {
      setCopyFeedback("error");
      window.setTimeout(() => setCopyFeedback(""), 2000);
    }
  };

  const saveSlot = async (payload: {
    slotId: number;
    name: string;
    channelId?: string | null;
    url?: string | null;
    transport?: "tcp" | "udp" | "automatic";
  }) => {
    const response = await fetch("/api/liveview/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Slot konnte nicht gespeichert werden.");
    }

    if (Array.isArray(data?.channels)) {
      setCurrentUserChannels(data.channels);
    }
  };

  const swapSlots = async (fromSlotId: number, toSlotId: number) => {
    const response = await fetch("/api/liveview/swap-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromSlotId, toSlotId }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Slots konnten nicht getauscht werden.");
    }

    if (Array.isArray(data?.channels)) {
      setCurrentUserChannels(data.channels);
    }
  };

  const handleDropOnSlot = async (toSlotId: number) => {
    if (dragFrom === null || dragFrom === toSlotId) return;

    const draggedChannel = currentUserChannels[dragFrom];
    setDragFrom(null);

    if (!draggedChannel?.url) {
      return;
    }

    await swapSlots(dragFrom, toSlotId);
  };

  const isDesktop = viewportWidth >= 768;
  const showMenuPanel = !isSingleLayout || isMenuVisible;
  const effectiveSubtitlesEnabled = subtitlesEnabled && isSingleLayout;

  return (

    <div className="flex flex-col md:flex-row justify-center items-center md:items-stretch w-full relative gap-0 md:gap-0">

      {/* Configuration POPUP Window*/}
      {popupCell !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-300 mx-2 rounded shadow-lg p-6 w-150">
            <div className="bg-gray-200 p-2 mb-2 rounded-lg flex flex-col">

              <h2 className="text-lg font-bold mb-4 text-center">Channel Assignment</h2>

              <div className="bg-gray-200 flex flex-row flex-wrap gap-2">
                {selectedCatalogChannel && (
                  <>

                    <button
                      className="w-32 px-4 py-2 rounded-lg border border-gray-500 bg-gray-100 text-gray-900"
                      onClick={handleCopySelectedStreamUrl}
                    >
                      {copyFeedback === "copied"
                        ? "Copied"
                        : copyFeedback === "error"
                          ? "Error"
                          : "Copy URL"}
                    </button>

                    <button className={`w-32 px-4 py-2 rounded-lg border ${selectedCatalogChannel.isFavorite
                      ? "border-blue-400 bg-blue-100 text-gray-900"
                      : "border-gray-500 bg-gray-100 text-gray-900"
                      }`}
                      onClick={handleToggleFavorite}
                    >
                      Favorite: {selectedCatalogChannel.isFavorite ? "On" : "Off"}
                    </button>

                    <button className={`w-32 px-4 py-2 rounded-lg border ${selectedCatalogChannel.isHidden
                      ? "border-blue-400 bg-blue-100 text-gray-900"
                      : "border-gray-500 bg-gray-100 text-gray-900"
                      }`}
                      onClick={handleToggleHidden}
                    >
                      {selectedCatalogChannel.isHidden ? "Unhide" : "Hide"}
                    </button>

                    <button className={`w-32 px-4 py-2 rounded-lg ${canDeleteSelectedChannel
                      ? "bg-red-500 text-white"
                      : "bg-gray-500 text-gray-300 cursor-not-allowed"
                      }`}
                      disabled={!canDeleteSelectedChannel}
                      onClick={handleDeleteSelectedChannel}
                    >
                      Delete
                    </button>
                  </>
                )}

              </div>
            </div>

            {errorMessage && (
              <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {/* Channel Filter */}
            <div className="mb-4">
              <label className="block text-sm mb-1">Filter channel:</label>
              <select
                className="w-full p-2 border rounded"
                value={locationFilter ?? ""}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setSelectedChannelId("");
                  setSelectedName("");
                }}
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location || ""} value={location || ""}>
                    {location || "Unbekannt"}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Enter Search tetm */}
            <input type="text"
              placeholder="Enter search term (e.g. name, location or fav)"
              value={channelSearchTerm}
              onChange={e => setChannelSearchTerm(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />

            {/* Select of filterted channels */}
            <select
              className="w-full mb-4 p-2 border rounded"
              value={selectedChannelId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedChannelId(nextId);
                setCustomName("");
                setCustomUrl("");
                setCopyFeedback("");

                const selected = filteredChannels.find((ch) => ch.id === nextId);
                setSelectedName(selected?.channel ?? "");
              }}
            >
              <option value="">Please choose...</option>
              {filteredChannels
                .sort((a, b) =>
                  Number(b.isFavorite) - Number(a.isFavorite) ||
                  (a.channel || "").localeCompare(b.channel || "")
                )
                .map((ch) => (
                  <option
                    key={ch.id}
                    value={ch.id}
                    className={ch.isHidden ? "text-gray-400" : ""}
                    style={ch.isHidden ? { color: "#9ca3af" } : undefined}
                  >
                    {`${ch.isFavorite ? "★ " : ""}${ch.channel ?? ""}`}
                  </option>
                ))}
            </select>

            {/* Own stream name */}
            <input type="text"
              placeholder="Name of Stream"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />

            {/* Own Stream URL */}
            <input type="text"
              placeholder="Stream-URL"
              value={customUrl}
              onChange={
                e => setCustomUrl(e.target.value)}
              className="w-full mb-2 p-2 border rounded"
            />

            {/* Button Display */}
            <button className="border-gray-500 border w-32 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
              onClick={handleAssignChannel}
            >
              Display
            </button>

            {/* Button Close */}
            <button className="w-32 px-4 py-2 ml-3 rounded-lg border border-gray-500 bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={resetPopupState}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Buttons */}
        {showMenuPanel && (
        <div className="border-blue-300 bg-gray-600 relative z-40 w-full md:w-23 flex flex-row flex-wrap items-start content-start gap-x-2 gap-y-1 p-1 overflow-visible border-b md:border-b-0 md:border-r">

        {/* Background Image */}
        <div className="bg-gray-300 pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="relative w-full h-full">
            <Image
              src={isDesktop ? "/background-header-03.png" : "/background-header-02.png"}
              alt=""
              priority
              fill
              sizes="(min-width: 768px) 25vw, 100vw"
              className="object-cover object-right opacity-60"
            />
          </div>
        </div>

        {/* Grid Layout Button */}
        <div className="w-20 z-10 md:w-full">
          <select
            className="w-full z-10 py-2 rounded border border-gray-800 bg-blue-900/80 text-xs text-gray-300"
            value={String(layoutId)}
            onChange={(e) => {
              const nextLayoutId = Number(e.target.value) as keyof typeof LAYOUT_CONFIGS;
              setLayoutId(nextLayoutId);

              if (nextLayoutId !== 1) {
                setIsMenuVisible(true);
              }
            }}
          >
             {layoutOptions.map((id) => (
              <option key={id} value={String(id)}>
                Grid {id}
              </option>
            ))}
          </select>
        </div>

        {/* Latency Button */}
        <div className="w-20 md:w-full z-10">
          <select
            className="w-full z-10 py-2 rounded border border-gray-800 bg-blue-900/80 text-xs text-gray-300"
            value={playbackProfile}
            onChange={(e) =>
              setPlaybackProfile(e.target.value as LiveViewPlaybackProfile)
            }
          >
            <option value="latency">Low</option>
            <option value="balanced">Balanced</option>
            <option value="stable">Stable</option>
          </select>
        </div>

        {/* Quality Button */}
        <div className="w-20 md:w-full z-10">
          <select
            className="w-full z-10 py-2 rounded border border-gray-800 bg-blue-900/80 text-xs text-gray-300"
            value={qualityCap}
            onChange={(e) =>
              setQualityCap(e.target.value as LiveViewQualityCap)
            }
          >
            <option value="auto">Auto</option>
            <option value="360p">360p</option>
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </div>
        <div className="w-20 md:w-full z-10">
          <button
            type="button"
            className={`w-full py-2 rounded border text-xs transition ${
              subtitlesEnabled
                ?  "border-gray-800 bg-blue-900/80 text-gray-300"
                : "border-gray-800 bg-blue-900/80 text-gray-300"
            }`}
            onClick={() => setSubtitlesEnabled((current) => !current)}
            title="Übersetzte Untertitel. Aus Kostengründen nur in Grid 1 aktiv."
            aria-label="Übersetzte Untertitel umschalten"
          >
            CC {subtitlesEnabled ? "Off" : "On"}
          </button>
        </div>
         </div>
      )}

      {/* Video Grid */}
      <div className={`relative z-0 w-full h-full grid gap-px bg-gray-300 border border-gray-800 ${showMenuPanel ? "md:w-[80%]" : "md:w-full"}`}
        style={{
          gridTemplateColumns: `repeat(${responsiveCols}, 1fr)`,
          gridAutoRows: useCompactSpans ? "minmax(220px, auto)" : "minmax(0, 1fr)",
          gridAutoFlow: "dense",
        }}
      >

        {config.cells.map((cell, idx) => {
          const slotId = cell.id;

          return (
            <div key={`cell-${idx}-${slotId}`}
              className={`${useCompactSpans
                ? "col-span-1 row-span-1 min-h-55"
                : cell.span.replace(
                  /col-span-(\d+)/,
                  (_, span) => `col-span-${Math.min(Number(span), responsiveCols)}`
                )
                } relative bg-black border border-gray-900/50 group overflow-hidden`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleDropOnSlot(slotId)}
              onDoubleClick={() => openPopupForSlot(slotId)}
            >

              {/* Webcam Item Container */}
              {!isSingleLayout && (
                <div className="absolute top-0 left-0 right-0 h-1/2 z-20 cursor-grab active:cursor-grabbing"
                  draggable={Boolean(currentUserChannels[slotId]?.url)}
                  onDragStart={() => {
                    if (!currentUserChannels[slotId]?.url) return;
                    setDragFrom(slotId);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  title="Drag here to move"
                  aria-label="Drag handle"
                />
              )}

              {/* Webcam Item */}
              <WebcamItem url={currentUserChannels[slotId]?.url ?? null}
                isHuge={!useCompactSpans && cell.span.includes("col-span-4")}
                isLarge={!useCompactSpans && cell.span.includes("col-span-2")}
                channel={slotId + 1}
                channelName={currentUserChannels[slotId]?.name ?? ""}
                location={currentUserChannels[slotId]?.location ?? ""}
                playbackProfile={playbackProfile}
                qualityCap={qualityCap}
                subtitlesEnabled={effectiveSubtitlesEnabled}
                infoOverlayClickable={isSingleLayout}
                isMenuVisible={isMenuVisible}
                onInfoOverlayClick={() => {
                  if (!isSingleLayout) return;
                  setIsMenuVisible((current) => !current);
                }}
             />
            </div>
          );
        })}
      </div>
    </div>
  );
}
