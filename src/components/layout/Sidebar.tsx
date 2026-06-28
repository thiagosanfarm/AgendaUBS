"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarPlus, 
  CalendarRange, 
  User, 
  LogOut, 
  Activity,
  UserPlus,
  ShieldCheck,
  Clipboard,
  MapPin,
  CalendarCheck,
  FileCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { logout, paciente, profissional } = useAuth();

  const menuItems = [
    {
      label: "Painel Geral",
      href: "/painel",
      icon: LayoutDashboard,
    },
    {
      label: "Novo Agendamento",
      href: "/agendamentos/novo",
      icon: CalendarPlus,
    },
    {
      label: "Meus Agendamentos",
      href: "/agendamentos",
      icon: CalendarRange,
    },
    {
      label: "Meu Perfil",
      href: "/perfil",
      icon: User,
    },
  ];

  if (paciente?.papel === "administrador") {
    menuItems.push({
      label: "Cadastrar Profissional",
      href: "/painel/profissionais/novo",
      icon: UserPlus,
    });
    menuItems.push({
      label: "Cadastrar Gestor UBS",
      href: "/painel/administradores/novo",
      icon: ShieldCheck,
    });
  }

  const isAcs = profissional?.especialidade === "Agente Comunitário de Saúde";
  const isProfissional = profissional !== null;
  const isAdmin = paciente?.papel === "administrador";

  if (isAdmin || isAcs) {
    menuItems.push({
      label: "Visitas em Campo (ACS)",
      href: "/acs",
      icon: Clipboard,
    });
    menuItems.push({
      label: "Validar Endereços",
      href: "/painel/validacoes",
      icon: MapPin,
    });
  }

  if (isAdmin || isProfissional) {
    menuItems.push({
      label: "Agendamento Assistido",
      href: "/painel/agendamento-assistido",
      icon: CalendarCheck,
    });
    menuItems.push({
      label: "Regulação de Vagas",
      href: "/painel/regulacao",
      icon: FileCheck,
    });
  }

  return (
    <aside className={cn(
      "w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0 justify-between select-none",
      className
    )}>
      {/* Header Logo */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg text-foreground tracking-tight block">AgendaUBS</span>
            <span className="text-[10px] text-muted-foreground block -mt-1 font-medium">MINISTÉRIO DA SAÚDE</span>
          </div>
        </div>

        {/* Links do Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Verifica se está na rota exata ou se é um subcaminho (excluindo /agendamentos/novo de /agendamentos)
            const isActive = item.href === "/agendamentos" 
              ? pathname === "/agendamentos"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.label}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-primary-foreground rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Perfil & Logout no Rodapé */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {paciente?.nomeCompleto?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "PA"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {paciente?.nomeCompleto || "Carregando..."}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              CNS: {paciente?.cns ? `${paciente.cns.slice(0, 3)}...` : "SUS"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
