"use client";
import { NewsClientProps } from "@/types/typesNews";
import { useState } from "react";
import Image from "next/image";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"

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

export default function NewsClient({ events, dayMeanings, error }: NewsClientProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openedMeaningIdx, setOpenedMeaningIdx] = useState<number | null>(null);
  const [openedEventIdx, setOpenedEventIdx] = useState<number | null>(null);

  // Alle einzigartigen Datumswerte (im Format "DD.MM.") aus den Events extrahieren
  const uniqueDates = Array.from(
    new Set(events.map(e => {
      const d = new Date(e.date);
      return !isNaN(d.getTime()) ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : e.date;
    }))
  );

  // Events nach ausgewähltem Datum filtern
  const filteredEvents = selectedDate
    ? events.filter(e => {
      const d = new Date(e.date);
      const eventDate = !isNaN(d.getTime()) ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : e.date;
      return eventDate === selectedDate;
    })
    : events;


  return (
    <div className="flex flex-col lg:flex-row gap-1 w-full mx-auto overflow-hidden">

      {/* Left <div> */}
      <div className="lg:w-[20%] w-full bg-gray-200 rounded-md flex flex-col shrink-0">

        {/* Quadrat for every date */}
        <div className="mx-4 mt-4  flex flex-row flex-wrap gap-3">
          { /* All Button */}
          <button
            onClick={() => setSelectedDate(null)}
            className="
              w-14 h-14 shrink-0
              flex items-center justify-center
              rounded-xl
              font-semibold text-sm
              bg-linear-to-b from-gray-200 to-gray-300
              border border-gray-400
            text-gray-700
              transition-all duration-100
              shadow-[4px_4px_0_0_rgba(156,163,175,1),4px_4px_10px_rgba(0,0,0,0.15)]
              hover:shadow-md
              active:translate-x-1.0
              active:translate-y-1.0
              active:shadow-[2px_2px_0_0_rgba(156,163,175,1)]
            "
            title="Alle Events anzeigen"
          >
            Alle
          </button>

          {uniqueDates.slice().reverse().map(date => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`
                w-14 h-14 shrink-0
                flex items-center justify-center
                rounded-xl
                font-bold text-sm
                border
                hover:shadow-md
                transition-all duration-100

                ${selectedDate === date ?
                  `
                bg-linear-to-b from-gray-400 to-gray-500
              text-white
              border-gray-600
                shadow-[4px_4px_0_0_rgba(37,99,235,1),6px_6px_10px_rgba(0,0,0,0.25)]
                active:translate-x-1.0
                active:translate-y-1.0
                active:shadow-[2px_2px_0_0_rgba(37,99,235,1)]
                ` : `
                bg-linear-to-b from-gray-200 to-gray-300
              text-gray-700
              border-gray-400
                shadow-[4px_4px_0_0_rgba(156,163,175,1),6px_6px_10px_rgba(0,0,0,0.15)]
                active:translate-x-1.0
                active:translate-y-1.0
                active:shadow-[2px_2px_0_0_rgba(156,163,175,1)]
                `
                }
             `}
              title={`Events am ${date}`}
            >
              {date}
            </button>
          ))}
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
                      onClick={e => {
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
            !error && <div className="text-center text-gray-500">Für den heutigen Tag sind keine Bedeutungen vermerkt.</div>
          )}
        </div>
      </div>

      {/* Right <div> */}
      <MoveableScrollAreaVertical className="flex-1 bg-gray-200  rounded-xl text-gray-800 hide-scrollbar overflow-y-hidden shadow-md cursor-grab select-none">
        {/* Events am Standort */}
        <h1 className="text-xl lg:text-2xl my-6 text-center font-extrabold text-gray-700 drop-shadow-[0_4px_8px_rgba(30,41,59,0.35)] tracking-wide select-none">
          Events am Standort
        </h1>
        {error && <div className="text-red-600 text-center mb-4">{error}</div>}

        {filteredEvents.length > 0 ? (
          <ul className="m-4 flex flex-col border-t ">
            {filteredEvents.map((event, idx) => {
              const isOpened = openedEventIdx === idx;
              return (
                <li
                  key={idx}
                  className={`p-2 border-b flex flex-row 
                  transition-all duration-200 cursor-pointer ${isOpened ? "" : "hover:bg-gray-100"}`}
                >
                  {/* Event-Image */}
                  <div
                    className={`mx-4 rounded-lg shadow-md relative flex items-center justify-center 
                    transition-all duration-200 ${isOpened ? "w-22 h-22" : " w-10 h-10"} my-auto`}
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
                        className={`rounded-lg object-cover shadow-md transition-all duration-200 ${isOpened ? "w-22 h-22" : "w-10 h-10"}`}
                        style={{ objectFit: "cover" }}
                        priority={idx === 0}
                        unoptimized
                      />
                    ) : (
                      <span className="text-white opacity-50 text-xs">Kein Bild</span>
                    )}
                  </div>


                  <div className="flex-1 text-sm">
                    {/* Event-Title */}
                    <h2 className="text-sm font-bold text-gray-700">{event.title}</h2>
                    {/* Event-Date */}
                    <div className="text-gray-700">
                      <span className="font-semibold text-gray-700">Datum:</span> {event.date
                        ? new Date(event.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : ""}
                    </div>

                    {/* Ausgeklappte Details */}
                    {isOpened && (
                      <>
                        {/* Event-Domain */}
                        <div className="text-gray-700 mb-1">
                          <span className="font-semibold">Domain:</span> {event.domain}
                        </div>
                        {/* Event-Address */}
                        <div className="mb-1">
                          <span className="font-semibold">Ort:</span> {formatAddress(event.address)}
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
                            onClick={e => e.stopPropagation()}
                          >
                            Mehr Infos
                          </a>
                        )}
                      </>
                    )}
                  </div>
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