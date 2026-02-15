import { TitleBar } from "@/components/window/title-bar";
import { UpdateNotifier } from "@/components/update-notifier";
import { Toaster } from "@/components/ui/sonner";
import { UserSettingsProvider } from "@/context/user-context";
import { Inter, Calistoga } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const calistoga = Calistoga({
  subsets: ["latin"],
  variable: "--font-calistoga",
  display: "swap",
  weight: "400",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${calistoga.variable} antialiased font-inter bg-background text-foreground`}
      >
        <TitleBar />
        <UserSettingsProvider>{children}</UserSettingsProvider>
        <Toaster />
        <UpdateNotifier />
      </body>
    </html>
  );
}
