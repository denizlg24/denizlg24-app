import { NavigationMenu } from "@/components/navigation/navigation-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <SidebarProvider>
      <NavigationMenu />
      <SidebarInset className="pt-8">{children}</SidebarInset>
    </SidebarProvider>
  );
}
