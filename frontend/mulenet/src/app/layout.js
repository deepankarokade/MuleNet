import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ForensicsProvider } from "@/context/ForensicsContext";
import WorkstationShell from "@/components/WorkstationShell";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "MuleNet — Financial Forensics & AML Detection Platform",
  description: "Institutional transaction intelligence platform for detecting money muling rings, smurfing structures, and circular fund routing.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#F4F6F8] text-[#172033] font-sans">
        <ForensicsProvider>
          <WorkstationShell>
            {children}
          </WorkstationShell>
        </ForensicsProvider>
      </body>
    </html>
  );
}
