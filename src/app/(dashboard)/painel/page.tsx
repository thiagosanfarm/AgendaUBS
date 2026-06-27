"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { Agendamento } from "@/core/domain/entities/Agendamento";
import { obterNomeDiaSemana, obterDataPorExtenso } from "@/utils/date-helpers";
import { formatarDataBr } from "@/utils/formatters";
import { 
  CalendarPlus, 
  CalendarRange, 
  User, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const agendamentoRepository = new LocalStorageAgendamentoRepository();

export default function PainelPage() {
  const { paciente } = useAuth();
  const [proximoAgendamento, setProximoAgendamento] = useState<Agendamento | null>(null);
  const [agendamentosRecentes, setAgendamentosRecentes] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const hojeIso = new Date().toISOString().split("T")[0];
  const diaSemana = obterNomeDiaSemana(hojeIso);
  const dataExtenso = obterDataPorExtenso(hojeIso);

  useEffect(() => {
    if (paciente) {
      agendamentoRepository
        .listarPorPaciente(paciente.id)
        .then((lista) => {
          // Filtra o próximo agendamento (ativo e com data/hora futura)
          const ativos = lista
            .filter((a) => a.status === "agendado")
            .sort((a, b) => {
              const dataA = new Date(`${a.data}T${a.horario}:00`);
              const dataB = new Date(`${b.data}T${b.horario}:00`);
              return dataA.getTime() - dataB.getTime(); // Mais próximo primeiro
            });

          setProximoAgendamento(ativos.length > 0 ? ativos[0] : null);
          setAgendamentosRecentes(lista.slice(0, 3)); // Pega os 3 mais recentes no geral
        })
        .catch((err) => console.error("Erro ao carregar agendamentos:", err))
        .finally(() => setLoading(false));
    }
  }, [paciente]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Boas-vindas */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-linear-to-r from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-md">
        <div>
          <h2 className="font-heading font-bold text-2xl md:text-3xl tracking-tight">
            Olá, {paciente?.nomeCompleto.split(" ")[0]}!
          </h2>
          <p className="text-primary-foreground/80 text-sm mt-1 font-medium">
            Seja bem-vindo ao portal digital de agendamentos da rede de saúde.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2 text-right self-start md:self-auto">
          <span className="block text-xs uppercase tracking-wider font-semibold opacity-75">{diaSemana}</span>
          <span className="block text-sm font-bold">{dataExtenso}</span>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Atalhos & Próximo Agendamento */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Atalhos Rápidos */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Acesso Rápido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/agendamentos/novo" className="group">
                <Card className="hover:border-primary hover:bg-primary/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <CalendarPlus className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Novo Agendamento
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Marque uma nova consulta ou exame na UBS de sua escolha.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/agendamentos" className="group">
                <Card className="hover:border-primary hover:bg-primary/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <CalendarRange className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Ver Meus Agendamentos
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Consulte detalhes e horários de compromissos marcados.</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/perfil" className="group">
                <Card className="hover:border-primary hover:bg-primary/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
                      <User className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                      Visualizar Perfil
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Visualize seus dados cadastrais e o cartão digital do SUS.</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Próximo Compromisso */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Próximo Agendamento
            </h3>
            {loading ? (
              <Card className="border-border">
                <CardContent className="p-6 flex justify-center items-center h-32">
                  <span className="text-sm text-muted-foreground animate-pulse">Carregando compromissos...</span>
                </CardContent>
              </Card>
            ) : proximoAgendamento ? (
              <Card className="border-l-4 border-l-primary bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                          {proximoAgendamento.tipo}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {proximoAgendamento.especialidade}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span>Profissional: <strong className="text-foreground">{proximoAgendamento.profissionalNome}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>Local: <strong className="text-foreground">{proximoAgendamento.ubsNome}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4 self-start md:self-auto">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground font-medium">Data e Horário</span>
                        <span className="block text-sm font-bold text-foreground">
                          {formatarDataBr(proximoAgendamento.data)} às {proximoAgendamento.horario}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border mt-5 pt-4">
                    <span className="text-xs text-muted-foreground">
                      * Compareça com 15 minutos de antecedência levando seu documento e cartão SUS.
                    </span>
                    <Link href="/agendamentos">
                      <Button variant="outline" size="sm" className="font-semibold cursor-pointer">
                        Gerenciar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-border bg-transparent">
                <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Nenhum compromisso marcado</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Você não tem consultas ou exames agendados para os próximos dias.
                    </p>
                  </div>
                  <Link href="/agendamentos/novo" className="mt-2">
                    <Button size="sm" className="font-semibold cursor-pointer">
                      Agendar Consulta/Exame
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* Lado Direito: Histórico de Atividades Recentes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Atividades Recentes
          </h3>
          
          <Card className="border-border">
            <CardContent className="p-4 space-y-4">
              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
                  Carregando histórico...
                </div>
              ) : agendamentosRecentes.length > 0 ? (
                <div className="divide-y divide-border">
                  {agendamentosRecentes.map((agendamento) => {
                    const isAgendado = agendamento.status === "agendado";
                    const isRealizado = agendamento.status === "realizado";
                    const isCancelado = agendamento.status === "cancelado";

                    return (
                      <div key={agendamento.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                        <div className="mt-0.5">
                          {isAgendado && <Clock className="h-4.5 w-4.5 text-blue-500" />}
                          {isRealizado && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
                          {isCancelado && <XCircle className="h-4.5 w-4.5 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-semibold text-foreground text-xs truncate">
                              {agendamento.especialidade}
                            </h5>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                              {formatarDataBr(agendamento.data)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {agendamento.profissionalNome} • {agendamento.ubsNome}
                          </p>
                          <span className={`inline-block text-[9px] font-semibold px-2 py-0.2 rounded-full mt-1.5 capitalize ${
                            isAgendado ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" :
                            isRealizado ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" :
                            "bg-destructive/10 text-destructive"
                          }`}>
                            {agendamento.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 opacity-55" />
                  <span>Nenhum histórico disponível.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
