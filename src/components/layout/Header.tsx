"use client";

import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  titulo: string;
}

export function Header({ titulo }: HeaderProps) {
  const { logout, paciente, profissional } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-40 select-none">
      {/* Mobile Logo / Title */}
      <div className="flex items-center gap-3">
        <div className="md:hidden h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Activity className="h-4 w-4 stroke-[2.5]" />
        </div>
        <h1 className="font-heading font-bold text-lg md:text-xl text-foreground tracking-tight">
          {titulo}
        </h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs text-muted-foreground font-medium"> usuário logado</span>
          <span className="text-sm font-semibold text-foreground -mt-0.5">
            {paciente?.nomeCompleto?.split(" ")[0] || profissional?.nomeCompleto?.split(" ")[0] || "Usuário"}
          </span>
        </div>

        {/* Mobile LogOut Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="md:hidden h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
          aria-label="Sair"
        >
          <LogOut className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </div>
    </header>
  );
}
