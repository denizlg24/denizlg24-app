"use client";

export const DisableContextMenu = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <main className="w-full" onContextMenu={(e) => e.preventDefault()}>
      {children}
    </main>
  );
};
