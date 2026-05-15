import {
  MessageSquare,
  Users,
  Briefcase,
  Package,
  Calendar,
  Wallet,
  Bot,
  Sparkles,
  UsersRound,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FeatureKey =
  | "chat"
  | "customers"
  | "services"
  | "products"
  | "calendar"
  | "finance"
  | "agents"
  | "skills"
  | "collaborators"
  | "usage";

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  chat: MessageSquare,
  customers: Users,
  services: Briefcase,
  products: Package,
  calendar: Calendar,
  finance: Wallet,
  agents: Bot,
  skills: Sparkles,
  collaborators: UsersRound,
  usage: BarChart3,
};

export const FEATURE_ORDER: FeatureKey[] = [
  "chat",
  "customers",
  "services",
  "products",
  "calendar",
  "finance",
  "agents",
  "skills",
  "collaborators",
  "usage",
];
