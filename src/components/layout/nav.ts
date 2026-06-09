import {
  BarChart3,
  CalendarCheck,
  Clapperboard,
  Hash,
  LayoutDashboard,
  ListVideo,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const navItems: NavItem[] = [
  {
    title: "Today Ops",
    href: "/today",
    icon: CalendarCheck,
    description: "Lo que toca hoy",
  },
  {
    title: "Clips",
    href: "/clips",
    icon: Clapperboard,
    description: "Videos base",
  },
  {
    title: "Cola de publicación",
    href: "/queue",
    icon: ListVideo,
    description: "Posts planeados",
  },
  {
    title: "Captions & Hashtags",
    href: "/captions",
    icon: Hash,
    description: "Copys y etiquetas",
  },
  {
    title: "Métricas",
    href: "/metrics",
    icon: BarChart3,
    description: "Rendimiento",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Vista general",
  },
];
