export const CUSTOMER_COLORS = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  pink: "bg-pink-500",
  gray: "bg-gray-400",
} as const;

export type CustomerColor = keyof typeof CUSTOMER_COLORS;

export const CUSTOMER_COLOR_KEYS = Object.keys(CUSTOMER_COLORS) as CustomerColor[];
