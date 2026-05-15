import { useStaggerAnimation } from "@/hooks/use-stagger-animation";

interface AnimatedListProps {
  children: React.ReactNode;
  itemCount: number;
  dataKey?: string | number | null;
  visible?: boolean;
  className?: string;
}

export function AnimatedList({
  children,
  itemCount,
  dataKey,
  visible = true,
  className,
}: AnimatedListProps) {
  const containerRef = useStaggerAnimation(itemCount, dataKey, visible);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
