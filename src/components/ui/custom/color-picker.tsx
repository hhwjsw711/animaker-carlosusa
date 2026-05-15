import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-gray-500",
] as const;

export type ColorOption = (typeof COLOR_OPTIONS)[number];

export { COLOR_OPTIONS };

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onChange(c)}
          className={cn(
            "size-7 rounded-full cursor-pointer transition-shadow",
            c,
            value === c
              ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
              : "hover:ring-1 hover:ring-ring/50",
          )}
        />
      ))}
    </div>
  );
}
