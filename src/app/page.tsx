import React from "react";
import Link from "next/link";
import { Activity, Calendar, Shield, Users, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-linear-to-b from-background via-background to-accent/5">
      {/* Header */}
      <header className="h-16 px-6 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg text-foreground tracking-tight block">AgendaUBS</span>
            <span className="text-[10px] text-muted-foreground block -mt-1 font-medium">MINISTÉRIO DA SAÚDE</span>
          </div>
        </div>

        <Link href="/login">
          <Button variant="outline" size="sm" className="font-semibold cursor-pointer gap-1.5">
            Acessar Painel
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center py-16 px-6 max-w-6xl mx-auto w-full gap-16">
        <section className="text-center space-y-6 max-w-3xl mx-auto py-8">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider inline-block">
            Inovação na Saúde Pública
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground leading-[1.1] animate-in fade-in slide-in-from-bottom-5 duration-300">
            Seu agendamento de saúde, <span className="text-primary">agora 100% digital</span>.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 delay-100">
            Evite filas e economize tempo. O AgendaUBS integra o agendamento de consultas e exames do SUS
            diretamente ao seu celular ou computador.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-in fade-in slide-in-from-bottom-5 duration-300 delay-200">
            <Link href="/cadastro">
              <Button size="lg" className="w-full sm:w-auto font-bold text-base px-8 cursor-pointer shadow-md shadow-primary/20">
                Criar Conta SUS Digital
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold text-base px-8 cursor-pointer">
                Entrar com CPF
              </Button>
            </Link>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/30 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Marcação Descomplicada</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Selecione a especialidade, o médico e o horário mais conveniente para você em poucos cliques.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/30 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Redução de Filas</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Otimize o fluxo das Unidades Básicas de Saúde, ajudando a diminuir o tempo de espera local.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/30 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Dados Integrados</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Seu histórico de atendimentos e consultas é atualizado no seu Cartão SUS Digital em tempo real.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted-foreground bg-card/30">
        <p>© {new Date().getFullYear()} AgendaUBS. Desenvolvido para a otimização de recursos da Saúde Pública.</p>
        <p className="mt-1 opacity-75">Ministério da Saúde • SUS • Governo Federal</p>
      </footer>
    </div>
  );
}
