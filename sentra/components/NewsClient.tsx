"use client";

import { NewsClientProps } from "@/types/typesNews";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical";
import ModuleDisabledNotice from "@/components/ModuleDisabledNotice";

type FilterMode = "all" | "day";
type NewsEvent = NewsClientProps["events"][number] & {
  sourceTown?: string | null;
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

// Preparing address format for serpapi, there are different formats possible
function formatAddress(address: string | null): string {
  if (!address) return "";
  try {
    const obj = JSON.parse(address);
    if (Array.isArray(obj)) {
      return obj.filter(Boolean).join(", ");
    }
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

function isPastDateKey(dateKey: string): boolean {
  const todayKey = formatDateKey(new Date());
  return dateKey < todayKey;
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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarGridStart(date: Date): Date {
  const monthStart = startOfMonth(date);
  const weekdayOffset = (monthStart.getDay() + 6) % 7;
  return addDays(monthStart, -weekdayOffset);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getEventTown(event: NewsEvent, fallbackTown: string): string {
  return event.sourceTown?.trim() || fallbackTown;
}

export default function NewsClient({
  events,
  town,
  dayMeanings,
  error,
  evtEnabled,
}: NewsClientProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [infoVisible, setInfoVisible] = useState(false);
  const [openedMeaningIdx, setOpenedMeaningIdx] = useState<number | null>(null);
  const [openedEventIdx, setOpenedEventIdx] = useState<number | null>(null);
  const [openedDetailIdx, setOpenedDetailIdx] = useState<number | null>(null);
  const [eventList, setEventList] = useState<NewsEvent[]>(events as NewsEvent[]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [meaningDate, setMeaningDate] = useState(() => formatDateKey(new Date()));
  const [meaningList, setMeaningList] = useState(dayMeanings);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const [meaningError, setMeaningError] = useState("");

  const rangeStart =
    selectedStart && selectedEnd
      ? (selectedStart <= selectedEnd ? selectedStart : selectedEnd)
      : selectedStart;
  const rangeEnd =
    selectedStart && selectedEnd
      ? (selectedStart <= selectedEnd ? selectedEnd : selectedStart)
      : selectedEnd;

  const availableLocations = Array.from(
    new Set(
      eventList
        .map((event) => getEventTown(event, town).trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "de-DE"));

  const highlightedDateKeys = new Set(
    eventList
      .filter((event) => {
        if (locationFilter === "all") {
          return true;
        }
        return getEventTown(event, town) === locationFilter;
      })
      .map((event) => getEventDateKey(event.date))
      .filter((dateKey): dateKey is string => Boolean(dateKey)),
  );

  const filteredEvents = eventList.filter((event) => {
    const eventTown = getEventTown(event, town);

    if (locationFilter !== "all" && eventTown !== locationFilter) {
      return false;
    }

    if (filterMode === "all" || !rangeStart) {
      return true;
    }

    const eventDateKey = getEventDateKey(event.date);
    if (!eventDateKey) {
      return false;
    }

    if (!rangeEnd) {
      return eventDateKey === rangeStart;
    }

    return eventDateKey >= rangeStart && eventDateKey <= rangeEnd;
  });

  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    addDays(getCalendarGridStart(calendarMonth), index),
  );

  const currentHeadlineTown =
    locationFilter === "all" ? "all saved locations" : locationFilter;

  const todayKey = formatDateKey(new Date());
  const selectedSingleDay =
    filterMode === "day" && rangeStart && !rangeEnd ? rangeStart : "";

  const meaningTargetDate =
    filterMode === "all" ? todayKey : selectedSingleDay;

  const meaningButtonLabel = useMemo(() => {
    if (filterMode === "all") {
      return `Meaning of today - ${formatCalendarLabel(todayKey)}`;
    }

    if (selectedSingleDay) {
      return `Meaning for ${formatCalendarLabel(selectedSingleDay)}`;
    }

    return "Meaning of today";
  }, [filterMode, selectedSingleDay, todayKey]);

  const canOpenMeaning =
    filterMode === "all" || Boolean(selectedSingleDay);

  function resetDateSelection() {
    setSelectedStart("");
    setSelectedEnd("");
  }


 const loadDayMeanings = useCallback(async (dateKey: string) => {
    if (!dateKey) {
      return;
    }

    if (dateKey === todayKey) {
      setMeaningDate(dateKey);
      setMeaningList(dayMeanings);
      setMeaningError("");
      return;
    }

    try {
      setMeaningLoading(true);
      setMeaningError("");

      const response = await fetch(`/api/day-meanings?date=${dateKey}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Tagesbedeutungen konnten nicht geladen werden.");
      }

      const payload = (await response.json()) as {
        date: string;
        dayMeanings: NewsClientProps["dayMeanings"];
      };

      setMeaningDate(payload.date);
      setMeaningList(payload.dayMeanings ?? []);
    } catch (fetchError) {
      console.error(fetchError);
      setMeaningError("Tagesbedeutungen konnten nicht geladen werden.");
      setMeaningList([]);
      setMeaningDate(dateKey);
    } finally {
      setMeaningLoading(false);
    }
 }, [dayMeanings, todayKey]);

  function handleMeaningButtonClick() {
    if (!canOpenMeaning || !meaningTargetDate) {
      return;
    }

    setOpenedMeaningIdx(null);
    setInfoVisible(true);
    void loadDayMeanings(meaningTargetDate);
  }

  useEffect(() => {
    if (!infoVisible) {
      return;
    }

    if (!canOpenMeaning || !meaningTargetDate) {
      setInfoVisible(false);
      return;
    }

    void loadDayMeanings(meaningTargetDate);
  }, [infoVisible, canOpenMeaning, meaningTargetDate, loadDayMeanings]);

  if (!evtEnabled) {
    return <ModuleDisabledNotice title="News" settingCode="EVT" />;
  }

  function handleFilterModeChange(nextMode: FilterMode) {
    setFilterMode(nextMode);

    if (nextMode === "all") {
      resetDateSelection();
      setShowCalendar(false);
      setForceRefresh(false);
      return;
    }

    setShowCalendar(true);
  }

  function handleCalendarDayClick(dateKey: string, withRangeSelection: boolean) {
    if (isPastDateKey(dateKey)) {
      return;
    }

    if (!forceRefresh) {
      setFilterMode("day");

      if (!withRangeSelection || !selectedStart) {
        setSelectedStart(dateKey);
        setSelectedEnd("");
        return;
      }

      if (dateKey === selectedStart) {
        setSelectedEnd("");
        return;
      }

      const nextStart = dateKey < selectedStart ? dateKey : selectedStart;
      const nextEnd = dateKey < selectedStart ? selectedStart : dateKey;
      const datesInRange: string[] = [];
      let cursor = parseEventDate(nextStart);

      if (!cursor) {
        setSelectedStart(dateKey);
        setSelectedEnd("");
        return;
      }

      while (cursor) {
        const currentKey = formatDateKey(cursor);
        datesInRange.push(currentKey);

        if (currentKey === nextEnd) {
          break;
        }

        cursor = addDays(cursor, 1);
      }

      const rangeHasOnlyEventDays = datesInRange.every((currentKey) =>
        highlightedDateKeys.has(currentKey),
      );

      if (!rangeHasOnlyEventDays) {
        setSelectedStart(dateKey);
        setSelectedEnd("");
        return;
      }

      setSelectedStart(nextStart);
      setSelectedEnd(nextEnd);
      return;
    }

    const requestTown = locationFilter === "all" ? town : locationFilter;
    if (!requestTown) {
      alert("Bitte zuerst einen Standort auswaehlen.");
      return;
    }

    void (async () => {
      try {
        setIsRefreshing(true);

        const response = await fetch("/api/events/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayString: dateKey,
            town: requestTown,
          }),
        });

        if (!response.ok) {
          throw new Error("Force-Refresh fehlgeschlagen.");
        }

        const payload = (await response.json()) as {
          events?: NewsEvent[];
        };

        setEventList(payload.events ?? []);
        setFilterMode("day");
        setSelectedStart(dateKey);
        setSelectedEnd("");
      } catch (refreshError) {
        console.error(refreshError);
        alert("Fehler bei der Event-Abfrage.");
      } finally {
        setIsRefreshing(false);
      }
    })();
  }

  function isSelectedDay(dateKey: string): boolean {
    if (!rangeStart) {
      return false;
    }

    if (!rangeEnd) {
      return dateKey === rangeStart;
    }

    return dateKey === rangeStart || dateKey === rangeEnd;
  }

  function isInSelectedRange(dateKey: string): boolean {
    if (!rangeStart || !rangeEnd) {
      return false;
    }

    return dateKey >= rangeStart && dateKey <= rangeEnd;
  }

  function getCalendarCellClasses(day: Date) {
    const dateKey = formatDateKey(day);
    const outsideMonth = !isSameMonth(day, calendarMonth);
    const hasEvents = highlightedDateKeys.has(dateKey);
    const isSelected = isSelectedDay(dateKey);
    const isInRange = isInSelectedRange(dateKey);
    const isPast = isPastDateKey(dateKey);

    let stateClasses = "border-gray-300 bg-white text-gray-800";

    if (outsideMonth) {
      stateClasses = "border-gray-300 bg-gray-100 text-gray-500";
    } else if (isSelected) {
      stateClasses = "border-gray-300 bg-blue-300 text-gray-800";
    } else if (isInRange) {
      stateClasses = "border-gray-300 bg-blue-300 text-gray-800";
    } else if (hasEvents) {
      stateClasses = "border-gray-300 bg-blue-200 text-gray-700";
    }

    const classes = [
       "flex h-10 items-center justify-center rounded-xl border text-sm font-semibold transition outline-none focus:outline-none focus:ring-0",
      stateClasses,
      !outsideMonth && !isPast ? "hover:bg-blue-300" : "",
      isPast ? "cursor-not-allowed" : "",
    ];

    return classes.filter(Boolean).join(" ");
  }

  return (
    <div className="flex flex-col lg:flex-row gap-1 w-full mx-auto overflow-hidden">
      <div className="lg:w-[24%] w-full bg-gray-200 rounded-lg flex flex-col shrink-0">
        <div className="mx-4 mt-4 rounded-lg border border-gray-300 bg-linear-to-b from-gray-100 to-gray-200 p-4 shadow-[4px_4px_0_0_rgba(156,163,175,1),4px_4px_10px_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" as const, title: "View all events" },
              { label: "Filter", value: "day" as const, title: "Open calendar for filtering" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterModeChange(option.value)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-100 ${filterMode === option.value
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

          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Location
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm font-normal text-gray-700 outline-none focus:border-gray-600"
            >
              <option value="all">All locations</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          {filterMode === "day" && showCalendar && (
            <div className="mt-4 rounded-lg border border-gray-300 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700"
                >
                  {"<"}
                </button>
                <div className="text-sm font-bold text-gray-700">
                  {calendarMonth.toLocaleDateString("de-DE", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700"
                >
                  {">"}
                </button>
              </div>

              <label className="mb-3 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={forceRefresh}
                  onChange={(event) => setForceRefresh(event.target.checked)}
                />
                force
              </label>

              <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-gray-500">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateKey = formatDateKey(day);
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={(event) =>
                        handleCalendarDayClick(dateKey, event.shiftKey)
                      }
                      className={getCalendarCellClasses(day)}
                      title={
                        highlightedDateKeys.has(dateKey)
                          ? `${formatCalendarLabel(dateKey)} - Events vorhanden`
                          : formatCalendarLabel(dateKey)
                      }
                      disabled={isRefreshing || isPastDateKey(dateKey)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-600">
            {filterMode === "all" &&
              (locationFilter === "all"
                ? "All events are displayed."
                : `Filtered by location ${locationFilter}.`)}

            {filterMode === "day" &&
              (rangeStart && rangeEnd
                ? `Filtered from ${formatCalendarLabel(rangeStart)} to ${formatCalendarLabel(rangeEnd)}.`
                : rangeStart
                  ? `Filtered to ${formatCalendarLabel(rangeStart)}.`
                  : "Please select a day or period from the calendar.")}

            {forceRefresh && " force is active: Only a single day can be queried."}
          </div>

          <div className="mt-2 text-xs font-semibold text-gray-500">
            {filteredEvents.length} Event{filteredEvents.length === 1 ? "" : "s"}
          </div>
                  <div className="mt-10 px-4">
          <button
            type="button"
            onClick={handleMeaningButtonClick}
            disabled={!canOpenMeaning}
            className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              canOpenMeaning
                ? "border-gray-500 bg-gray-100 text-gray-700 shadow-[3px_3px_0_0_rgba(156,163,175,1)] hover:bg-white"
                : "border-gray-300 bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed"
            }`}
            title={
              canOpenMeaning
                ? "Show daily meanings"
                : "Available only for all days or a single selected day."
            }
          >
            {meaningButtonLabel}
          </button>
        </div>
        </div> 
</div>
      <MoveableScrollAreaVertical className="flex-1 bg-gray-200 rounded-lg text-gray-800 hide-scrollbar overflow-y-hidden shadow-md cursor-grab select-none">
        <h1 className="text-xl lg:text-2xl my-6 text-center font-extrabold text-gray-700 drop-shadow-[0_4px_8px_rgba(30,41,59,0.35)] tracking-wide select-none">
          Events in {currentHeadlineTown}
        </h1>

        {error && <div className="text-red-600 text-center mb-4">{error}</div>}
        {isRefreshing && (
          <div className="text-blue-700 text-center mb-4">
            Event-Query running...
          </div>
        )}

        {filteredEvents.length > 0 ? (
          <ul className="m-4 flex flex-col border-t ">
            {filteredEvents.map((event, idx) => {
              const isOpened = openedEventIdx === idx;

              return (
                <li
                  key={idx}
                  className={`p-2 border-b flex flex-row transition-all duration-200 cursor-pointer ${isOpened ? "" : "hover:bg-gray-100"
                    }`}
                >
                  <div
                    className={`mx-4 rounded-lg shadow-md relative flex items-center justify-center transition-all duration-200 ${isOpened ? "w-22 h-22" : " w-15 h-15"
                      } my-auto`}
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
                        className={`rounded-lg object-cover shadow-md transition-all duration-200 ${isOpened ? "w-22 h-22" : "w-15 h-15"
                          }`}
                        style={{ objectFit: "cover" }}
                        priority={idx === 0}
                        unoptimized
                      />
                    ) : (
                      <span className="text-white opacity-50 text-xs">No Pic</span>
                    )}
                  </div>

                  <div
                    className={`p-3 flex-1 text-sm cursor-pointer rounded-l-lg ${openedDetailIdx === idx ? "" : "rounded-r-lg"
                      } ${event.domain !== "https://serpapi.com/"
                        ? "bg-red-100/50"
                        : "bg-gray-300/50"
                      }`}
                    onClick={() => setOpenedDetailIdx(openedDetailIdx === idx ? null : idx)}
                  >
                    <h2 className="text-sm font-bold text-gray-700">{event.title}</h2>
                    {formatAddress(event.address)}

                    <div className="text-gray-700">
                      <span className="font-semibold text-gray-700">Date:</span>{" "}{event.date ? formatEventDate(event.date) : ""}
                    </div>


                    {isOpened && (
                      <>
                        <div className="text-gray-700 mb-1">
                          <span className="font-semibold">Domain:</span> {event.domain}
                        </div>
                        {event.description && (
                          <div className="my-2 text-gray-700">{event.description}</div>
                        )}
                        {event.link && (
                          <a
                            href={event.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 underline font-semibold"
                            onClick={(event) => event.stopPropagation()}
                          >
                            More information
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {openedDetailIdx === idx && (
                    <div
                      className="p-4 rounded-r-lg flex items-center justify-center bg-blue-600 shadow-lg cursor-pointer"
                      onClick={async () => {
                        if (!event.id) {
                          alert("Event has no ID!");
                          return;
                        }
                        try {
                          await fetch(`/api/events/${event.id}`, { method: "DELETE" });
                          setEventList((prev) => prev.filter((entry) => entry.id !== event.id));
                          setOpenedDetailIdx(null);
                        } catch (deleteError) {
                          console.error(deleteError);
                          alert("Error during deletion!");
                        }
                      }}
                      title="Delete event"
                    >
                      <h2 className="font-bold text-2xl">X</h2>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          !error && <div className="text-center text-gray-500">No Events found.</div>
        )}
      </MoveableScrollAreaVertical>

      {infoVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => setInfoVisible(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white/80 p-4 shadow-2xl backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Meaning of the day
                </h2>
                <p className="text-sm text-gray-600">
                  {meaningDate ? formatCalendarLabel(meaningDate) : ""}
                </p>
              </div>
              <button
               type="button"
                onClick={() => setInfoVisible(false)}
                className="rounded-xl border border-gray-400 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
              >
                Close
              </button>
            </div>

            {meaningLoading && (
              <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                Loading daily meanings...
              </div>
            )}

           {!meaningLoading && meaningError && (
              <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
                {meaningError}
              </div>
            )}

            {!meaningLoading && !meaningError && meaningList.length === 0 && (
              <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                No meanings are recorded for this day.
              </div>
            )}

            {!meaningLoading && !meaningError && meaningList.length > 0 && (
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                {meaningList.map((meaning, idx) => {
                  const hasUrl = Boolean(meaning.url);
                  const isOpened = openedMeaningIdx === idx;

                 return (
                    <div
                      key={idx}
                      className={`mb-3 rounded-xl border p-3 text-sm shadow-[4px_4px_0_0_rgba(156,163,175,1),4px_4px_10px_rgba(0,0,0,0.12)] transition ${
                        hasUrl ? "cursor-pointer hover:border-gray-500" : "cursor-pointer"
                      }`}
                      onClick={() => setOpenedMeaningIdx(isOpened ? null : idx)}
                      role={hasUrl ? "button" : undefined}
                      tabIndex={0}
                    >
                      <b>{meaning.name}</b> ({meaning.country})
                      {isOpened && meaning.description && (
                        <div className="mt-2 text-gray-700">{meaning.description}</div>
                      )}
                      {hasUrl && (
                        <div className="mt-2">
                          <span
                            className="text-sm text-gray-700 underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              window.open(meaning.url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            Learn more
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



