import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Corners } from "@/components/CompCorners";
import { CompBurgerMenu } from "@/components/CompBurgerMenu";
import { SettingsProvider } from "@/context/SettingsContext";


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
          <SettingsProvider>
          <div className="w-screen min-h-screen flex justify-center">
            {/* Mit Rahmen auf Desktop */}
            <div className="relative w-full min-h-screen box-border hidden lg:block"
              style={{
                border: "50px solid transparent",
                borderImageSource: 'url("/wooden-frame.png")',
                borderImageSlice: 80,
                borderImageRepeat: "stretch",
                boxShadow: "inset 0 0 25px rgba(0,0,0,0.35)",
              }}
            >
              {/* Eck-Buttons nur wenn user angemeldet */}
              <Corners />
              <div className="absolute inset-0.5 flex justify-center overflow-auto font-serif hide-scrollbar">
                <main className="mt-0 w-full min-h-full flex justify-center hide-scrollbar">
                  {children}
                </main>
              </div>
            </div>

            {/* Ohne Rahmen auf Mobile */}
            <div className="relative w-full min-h-screen box-border lg:hidden">
              <CompBurgerMenu />
              <div className="relative w-full h-full flex justify-center overflow-auto font-serif hide-scrollbar">
                <main className="mt-0 w-full h-full flex justify-center hide-scrollbar">
                  {children}
                </main>
              </div>
            </div>
          </div>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}