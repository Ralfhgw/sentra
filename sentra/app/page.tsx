"use client";
import ProtectedRoute from "@/context/CompProtectedRoute";

export default function Home() {

  return (
    <ProtectedRoute>
      <div>
        Startseite
      </div>
    </ProtectedRoute>
  );
}