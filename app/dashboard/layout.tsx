import { CommandPalette } from "@/components/navigation/command-palette";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <main className="pt-8">
      {children}
      <CommandPalette />
    </main>
  );
}
