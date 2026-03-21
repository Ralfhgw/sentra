"use client";
import { NewsClientProps } from "@/types/typesNews";
import { useState } from "react";
import Image from "next/image";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical";

type FilterMode = "all" | "day" | "range";

// Preparing address format for serpapi, there are different formats possible
function formatAddress(address: string | null): string {
  if (!address) return "";
  try {
    const obj = JSON.parse(address);
    // if array, select values and merge it together splitted by comma
    if (Array.isArray(obj)) {
      return obj.filter(Boolean).join(", ");
    }
    // if a object, select values and merge it together spletted by comma
    if (typeof obj === "object" && obj !== null) {
      return [obj.city, obj.state, obj.country].filter(Boolean).join(", ");
    }
    return String(obj);
  } catch {
    return address;
  }
}

function parseEventDate(rawDate: string): Date | null {
  const isoDateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
  );
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEventDateKey(rawDate: string): string | null {
  const parsedDate = parseEventDate(rawDate);
  return parsedDate ? formatDateKey(parsedDate) : null;
}

function formatCalendarLabel(dateKey: string): string {
  const parsedDate = parseEventDate(dateKey);
  if (!parsedDate) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatEventDate(rawDate: string): string {
  const parsedDate = parseEventDate(rawDate);
  if (!parsedDate) {
    return rawDate;
  }

  return parsedDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function NewsClient({ events, town, dayMeanings, error }: NewsClientProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedDay, setSelectedDay] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [openedMeaningIdx, setOpenedMeaningIdx] = useState<number | null>(null);
  const [openedEventIdx, setOpenedEventIdx] = useState<number | null>(null);
  const [openedDetailIdx, setOpenedDetailIdx] = useState<number | null>(null);
  const [eventList, setEventList] = useState(events);

  const availableDateKeys = Array.from(
    new Set(
      eventList
        .map((event) => getEventDateKey(event.date))
        .filter((dateKey): dateKey is string => Boolean(dateKey)),
    ),
  ).sort();

  const minSelectableDate = availableDateKeys[0] ?? "";
  const maxSelectableDate = availableDateKeys[availableDateKeys.length - 1] ?? "";
  const normalizedRangeStart =
    rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeStart : rangeEnd) : rangeStart;
  const normalizedRangeEnd =
    rangeStart && rangeEnd ? (rangeStart <= rangeEnd ? rangeEnd : rangeStart) : rangeEnd;

  const filteredEvents = eventList.filter((event) => {
    if (filterMode === "all") {
      return true;
    }

    const eventDateKey = getEventDateKey(event.date);
    if (!eventDateKey) {
      return false;
    }

    if (filterMode === "day") {
      return selectedDay ? eventDateKey === selectedDay : true;
    }

    if (normalizedRangeStart && eventDateKey < normalizedRangeStart) {
      return false;
    }

    if (normalizedRangeEnd && eventDateKey > normalizedRangeEnd) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-1 w-full mx-auto overflow-hidden">
      {/* Left <div> */}
      <div className="lg:w-[20%] w-full bg-gray-200 rounded-md flex flex-col shrink-0">
        {/* Kalender-Filter */}
        <div className="mx-4 mt-4 rounded-2xl border border-gray-300 bg-linear-to-b from-gray-100 to-gray-200 p-4 shadow-[4px_4px_0_0_rgba(156,163,175,1),4px_4px_10px_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Alle", value: "all" as const, title: "Alle Events anzeigen" },
              { label: "Tag", value: "day" as const, title: "Events an einem bestimmten Tag filtern" },
              { label: "Zeitraum", value: "range" as const, title: "Events in einem Zeitraum filtern" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterMode(option.value)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-100 ${
                  filterMode === option.value
                    ? "border-gray-600 bg-gray-500 text-white shadow-[3px_3px_0_0_rgba(75,85,99,1)]"
                    : "border-gray-400 bg-gray-100 text-gray-700 shadow-[3px_3px_0_0_rgba(156,163,175,1)] hover:shadow-md"
                }`}
                title={option.title}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {filterMode === "day" && (
            <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-gray-700">
              Tag auswaehlen
              <input
                type="date"
                value={selectedDay}
                min={minSelectableDate || undefined}
                max={maxSelectableDate || undefined}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="rounded-xl border border-gray-400 bg-white px-3 py-2 text-sm font-normal text-gray-700 outline-none focus:border-gray-600"
              />
            </label>
          )}

          {filterMode === "range" && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
                Von
                <input
                  type="date"
                  value={rangeStart}
                  min={minSelectableDate || undefined}
                  max={maxSelectableDate || undefined}
                  onChange={(event) => setRangeStart(event.target.value)}
                  className="rounded-xl border border-gray-400 bg-white px-3 py-2 text-sm font-normal text-gray-700 outline-none focus:border-gray-600"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
                Bis
                <input
                  type="date"
                  value={rangeEnd}
                  min={minSelectableDate || undefined}
                  max={maxSelectableDate || undefined}
                  onChange={(event) => setRangeEnd(event.target.value)}
                  className="rounded-xl border border-gray-400 bg-white px-3 py-2 text-sm font-normal text-gray-700 outline-none focus:border-gray-600"
                />
              </label>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-600">
            {filterMode === "all" && "Alle Events werden angezeigt."}
            {filterMode === "day" &&
              (selectedDay
                ? `Gefiltert auf ${formatCalendarLabel(selectedDay)}.`
                : "Bitte einen Tag im Kalender auswaehlen.")}
            {filterMode === "range" &&
              (normalizedRangeStart || normalizedRangeEnd
                ? `Gefiltert von ${normalizedRangeStart ? formatCalendarLabel(normalizedRangeStart) : "Anfang"} bis ${normalizedRangeEnd ? formatCalendarLabel(normalizedRangeEnd) : "Ende"}.`
                : "Bitte einen Zeitraum im Kalender auswaehlen.")}
          </div>

          <div className="mt-2 text-xs font-semibold text-gray-500">
            {filteredEvents.length} Event{filteredEvents.length === 1 ? "" : "s"} sichtbar
          </div>
        </div>

        {/* Bedeutung des heutigen Tages */}
        <div className="mt-10">
          <h3 className="mb-6 text-gray-700 text-lg font-bold drop-shadow-[0_4px_8px_rgba(30,41,59,0.35)] text-center">
            {`Bedeutung des heutigen Tages`}<br />
            {`${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
          </h3>

          {dayMeanings.length > 0 ? (
            dayMeanings.map((meaning, idx) => {
              const hasUrl = Boolean(meaning.url);
              const isOpened = openedMeaningIdx === idx;
              return (
                <div
                  key={idx}
                  className={`
                    mb-2 
                    text-sm
                    mx-4 
                    p-3 
                    border 
                    rounded-xl 
                    transition 
                    shadow-[4px_4px_0_0_rgba(156,163,175,1),4px_4px_10px_rgba(0,0,0,0.15)]
                    hover:shadow-md
                    active:shadow-[2px_2px_0_0_rgba(156,163,175,1)]
                    ${hasUrl ? "hover:border-gray-500 cursor-pointer" : "opacity-70 cursor-pointer"}`}
                  onClick={() => setOpenedMeaningIdx(isOpened ? null : idx)}
                  role={hasUrl ? "link" : undefined}
                  tabIndex={0}
                >
                  <b>{meaning.name}</b> ({meaning.country})<br />
                  {isOpened && meaning.description && (
                    <div className="my-2 text-sm text-gray-700">{meaning.description}</div>
                  )}
                  {hasUrl && (
                    <span
                      className="text-gray-700 text-sm underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(meaning.url, "_blank", "noopener,noreferrer");
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      Mehr erfahren
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            !error && <div className="text-center text-gray-500">Fuer den heutigen Tag sind keine Bedeutungen vermerkt.</div>
          )}
        </div>
      </div>

      {/* Right <div> */}
      <MoveableScrollAreaVertical className="flex-1 bg-gray-200 rounded-xl text-gray-800 hide-scrollbar overflow-y-hidden shadow-md cursor-grab select-none">
        {/* Events am Standort */}
        <h1 className="text-xl lg:text-2xl my-6 text-center font-extrabold text-gray-700 drop-shadow-[0_4px_8px_rgba(30,41,59,0.35)] tracking-wide select-none">
          Events in {town}
        </h1>
        {error && <div className="text-red-600 text-center mb-4">{error}</div>}

        {filteredEvents.length > 0 ? (
          <ul className="m-4 flex flex-col border-t ">
            {filteredEvents.map((event, idx) => {
              const isOpened = openedEventIdx === idx;
              return (
                <li
                  key={idx}
                  className={`p-2 border-b flex flex-row transition-all duration-200 cursor-pointer ${isOpened ? "" : "hover:bg-gray-100"}`}
                >
                  {/* Event-Image */}
                  <div
                    className={`mx-4 rounded-lg shadow-md relative flex items-center justify-center 
                transition-all duration-200 ${isOpened ? "w-22 h-22" : " w-15 h-15"} my-auto`}
                    onClick={() => setOpenedEventIdx(isOpened ? null : idx)}
                    tabIndex={0}
                    role="button"
                  >
                    {event.image ? (
                      <Image
                        src={event.image}
                        alt={event.title}
                        width={isOpened ? 90 : 10}
                        height={isOpened ? 90 : 10}
                        className={`rounded-lg object-cover shadow-md transition-all duration-200 ${isOpened ? "w-22 h-22" : "w-15 h-15"}`}
                        style={{ objectFit: "cover" }}
                        priority={idx === 0}
                        unoptimized
                      />
                    ) : (
                      <span className="text-white opacity-50 text-xs">Kein Bild</span>
                    )}
                  </div>

                  {/* Description */}
                  <div
                    className={`p-3 flex-1 text-sm cursor-pointer rounded-l-xl 
                    ${openedDetailIdx === idx ? "" : "rounded-r-xl"}
                    ${event.domain !== "https://serpapi.com/" ? "bg-red-100/50" : "bg-gray-300/50"}
                    `}
                    onClick={() => setOpenedDetailIdx(openedDetailIdx === idx ? null : idx)}
                  >
                    {/* Event-Title */}
                    <h2 className="text-sm font-bold text-gray-700">{event.title}</h2>
                    {formatAddress(event.address)}
                    {/* Event-Date */}
                    <div className="text-gray-700">
                      <span className="font-semibold text-gray-700">Datum:</span>{" "}
                      {event.date ? formatEventDate(event.date) : ""}
                    </div>

                    {/* Ausgeklappte Details */}
                    {isOpened && (
                      <>
                        {/* Event-Domain */}
                        <div className="text-gray-700 mb-1">
                          <span className="font-semibold">Domain:</span> {event.domain}
                        </div>
                        {/* Event-Description */}
                        {event.description && (
                          <div className="my-2 text-gray-700">{event.description}</div>
                        )}
                        {/* Event-Link */}
                        {event.link && (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 underline font-semibold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Mehr Infos
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {/* Detail-Div nur beim geklickten Element */}
                  {openedDetailIdx === idx && (
                    <div
                      className="p-4 rounded-r-xl flex items-center justify-center bg-blue-600 shadow-lg cursor-pointer"
                      onClick={async () => {
                        console.log("Event:", event);
                        if (!event.id) {
                          alert("Event hat keine ID!");
                          return;
                        }
                        try {
                          await fetch(`/api/events/${event.id}`, { method: "DELETE" });
                          setEventList((prev) => prev.filter((entry) => entry.id !== event.id));
                          setOpenedDetailIdx(null);
                        } catch (err) {
                          console.error(err);
                          alert("Fehler beim Loeschen!");
                        }
                      }}
                      title="Event loeschen"
                    >
                      <h2 className="font-bold text-2xl">X</h2>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          !error && <div className="text-center text-gray-500">Keine Events gefunden.</div>
        )}
      </MoveableScrollAreaVertical>
    </div>
  );
}

