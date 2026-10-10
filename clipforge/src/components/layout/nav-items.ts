import { Coins, Film, LayoutGrid, Sparkles } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/templates", label: "Templates", icon: LayoutGrid },
  { href: "/library", label: "Library", icon: Film },
  { href: "/credits", label: "Credits", icon: Coins },
] as const;
