import localFont from "next/font/local";
import SimulationViewer from "@/components/simulation-playground-testing/simulation-viewer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function Home() {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} bg-slate-100 flex flex-col py-10 items-center justify-center w-full min-h-screen`}
    >
    <SimulationViewer />
    </div>
  );
}
