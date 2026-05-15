import type { LucideIcon } from "lucide-react";

interface FeatureVisualProps {
  icon: LucideIcon;
}

export function FeatureVisual({ icon: Icon }: FeatureVisualProps) {
  return (
    <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-br from-primary/5 via-primary/5 to-transparent"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex size-28 items-center justify-center rounded-3xl bg-primary/5 text-primary ring-1 ring-primary/20">
          <Icon className="size-14" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
