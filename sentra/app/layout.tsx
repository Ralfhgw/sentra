import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";


export const metadata: Metadata = {
  title: "Meine App",
  description: "Beschreibung",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="de">
      <body className="m-0">
        <AuthProvider>
          <div className="w-screen h-screen flex items-center justify-center">

            <div
              className="relative w-full h-full box-border shadow-inner"
              style={{
                border: "50px solid transparent",
                borderImageSource: 'url("/wooden-frame.png")',
                borderImageSlice: 80,
                borderImageRepeat: "stretch",
                boxShadow: "inset 0 0 25px rgba(0,0,0,0.35)",
              }}
            >
              {/* Eck-Buttons nur wenn user angemeldet */}

              <div className="absolute inset-0.5 flex items-center justify-center overflow-auto font-serif hide-scrollbar">
                <main className="mt-0 w-full h-full flex justify-center hide-scrollbar">
                  {children}
                </main>
              </div>
            </div>
          </div>

        </AuthProvider>
      </body>
    </html>
  );
}