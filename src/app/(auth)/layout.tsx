"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Activity } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { autenticado, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && autenticado) {
      router.replace("/painel");
    }
  }, [autenticado, loading, router]);

  if (loading || autenticado) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-tr from-primary/5 via-background to-accent/10 p-4 md:p-8">
      <div className="w-full max-w-md">
        {/* Logo superior */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-md shadow-primary/5">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h2 className="font-heading font-bold text-2xl tracking-tight text-foreground">AgendaUBS</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">SISTEMA ÚNICO DE SAÚDE</p>
        </div>

        {children}
      </div>
    </main>
  );
}
