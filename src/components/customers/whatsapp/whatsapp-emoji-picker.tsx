import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Smile } from "lucide-react";

const EMOJI_GRID = [
  "😀", "😂", "😍", "🥰", "😊", "😎", "🤩", "😘",
  "🤔", "😅", "😢", "😭", "😡", "🤯", "🥳", "😴",
  "👍", "👎", "👏", "🙌", "🤝", "💪", "🙏", "❤️",
  "🔥", "⭐", "✅", "❌", "💯", "🎉", "👀", "💬",
  "📱", "💻", "📧", "📞", "📅", "⏰", "📍", "🏠",
  "🚀", "💡", "📝", "📎", "🔗", "💰", "📊", "🎯",
];

interface WhatsAppEmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function WhatsAppEmojiPicker({ onSelect, disabled }: WhatsAppEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" disabled={disabled} className="shrink-0" aria-label="Emoji">
            <Smile className="size-4.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-72 p-2">
        <div className="grid grid-cols-8 gap-0.5" role="grid">
          {EMOJI_GRID.map((emoji, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              className="flex items-center justify-center size-8 rounded hover:bg-accent cursor-pointer text-base"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
