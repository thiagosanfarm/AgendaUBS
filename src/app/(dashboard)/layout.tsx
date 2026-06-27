"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Activity } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { paciente, autenticado, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [titulo, setTitulo] = useState("AgendaUBS");

  // Define dinamicamente o título do Header com base no caminho
  useEffect(() => {
    if (pathname.startsWith("/painel")) {
      setTitulo("Painel do Paciente");
    } else if (pathname.startsWith("/agendamentos/novo")) {
      setTitulo("Novo Agendamento");
    } else if (pathname.startsWith("/agendamentos")) {
      setTitulo("Meus Agendamentos");
    } else if (pathname.startsWith("/perfil")) {
      setTitulo("Meu Perfil");
    }
  }, [pathname]);

  useEffect(() => {
    if (!loading && !autenticado) {
      router.replace("/login");
    }
  }, [autenticado, loading, router]);

  if (loading || !autenticado) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-linear-to-b from-background via-background to-accent/5">
      {/* Sidebar - Desktop */}
      <Sidebar className="hidden md:flex" />

      {/* Área de conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Header Superior */}
        <Header titulo={titulo} />

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Navegação Inferior - Mobile */}
      <MobileNav />
    </div>
  );
}
