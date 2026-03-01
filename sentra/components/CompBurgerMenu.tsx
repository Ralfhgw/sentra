"use client";
import { useState } from "react";
import Link from "next/link";

export function CompBurgerMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Burger Icon */}
      <button
        aria-label="Menü öffnen"
        className="flex flex-col justify-center items-center w-10 h-10 rounded bg-gray-500/40 text-orange-400 shadow-lg focus:outline-none"
        onClick={() => setOpen(!open)}
      >
        <span className="block w-6 h-0.5 bg-orange-400 mb-1"></span>
        <span className="block w-6 h-0.5 bg-orange-400 mb-1"></span>
        <span className="block w-6 h-0.5 bg-orange-400"></span>
      </button>

      {/* Menü */}
      {open && (
        <nav className="absolute top-12 right-0 bg-gray-600 rounded-xl shadow-xl p-4 flex flex-col gap-4 min-w-40">
          <Link href="/" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/news" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            News
          </Link>
          <Link href="/weather" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            Weather
          </Link>
          <Link href="/liveview" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            LiveView
          </Link>
          <Link href="/liveview" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            LiveTalk
          </Link>
          <Link href="/liveview" className="ml-2 text-orange-400 hover:text-white font-bold" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link href="/liveview" className="ml-2 text-center bg-gray-300 rounded-xl text-orange-400 hover:bg-gray-400 font-bold" onClick={() => setOpen(false)}>
            Logout
          </Link>
        </nav>
      )}
    </div>
  );
}