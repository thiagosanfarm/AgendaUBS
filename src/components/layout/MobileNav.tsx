"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarPlus, 
  CalendarRange, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: "Painel",
      href: "/painel",
      icon: LayoutDashboard,
    },
    {
      label: "Agendar",
      href: "/agendamentos/novo",
      icon: CalendarPlus,
    },
    {
      label: "Agenda",
      href: "/agendamentos",
      icon: CalendarRange,
    },
    {
      label: "Perfil",
      href: "/perfil",
      icon: User,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-card flex items-center justify-around px-2 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/agendamentos" 
          ? pathname === "/agendamentos"
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-150 relative",
              isActive 
                ? "text-primary font-semibold" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 mb-1 transition-transform",
              isActive && "scale-110"
            )} />
            <span className="text-[10px] tracking-wide">{item.label}</span>
            {isActive && (
              <span className="absolute top-0 w-8 h-1 bg-primary rounded-b-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
