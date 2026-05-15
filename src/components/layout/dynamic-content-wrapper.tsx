import { useIsMobile } from "@/hooks/use-mobile";

export function DynamicContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex-1 md:ml-18 pt-18 flex flex-col h-dvh overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="flex-1 md:ml-18 flex flex-col h-screen overflow-hidden">
      {children}
    </div>
  );
}
