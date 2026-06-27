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
        {/* Logo superior SUS Agendamento conforme protótipo */}
        <div className="flex flex-col items-center mb-8 select-none">
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary mb-2"
          >
            {/* Desenho da cruz clássica do SUS (faixas dobradas) */}
            <path 
              d="M32 12H68V32H88V68H68V88H32V68H12V32H32Z" 
              fill="currentColor" 
            />
            {/* Efeito de perspectiva interna */}
            <path 
              d="M32 32L50 50L68 32M32 68L50 50L68 68" 
              stroke="var(--background)" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M32 32V68M68 32V68" 
              stroke="var(--background)" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
          <h2 className="font-heading font-black text-2xl tracking-tighter text-primary leading-none uppercase">
            SUS
          </h2>
          <p className="font-heading font-bold text-sm tracking-tight text-primary mt-0.5">
            Agendamento
          </p>
        </div>

        {children}
      </div>
    </main>
  );

}
