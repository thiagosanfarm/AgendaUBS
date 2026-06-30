"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatarTelefone, formatarDataBr } from "@/utils/formatters";
import { LocalStorageAgendamentoRepository } from "@/infra/api/repositories/LocalStorageAgendamentoRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { verificarEEnviarLembretes, formatarMensagemWhatsAppLembrete } from "@/utils/whatsapp-reminder-helper";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Search,
  CheckCheck,
  User,
  Calendar,
  Building
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const agendamentoRepository = new LocalStorageAgendamentoRepository();
const pacienteRepository = new LocalStoragePacienteRepository();

interface LembreteLog {
  agendamentoId: string;
  pacienteNome: string;
  telefone: string;
  especialidade: string;
  dataConsulta: string;
  horarioConsulta: string;
  ubsNome: string;
  dataEnvio: string;
  horarioEnvio: string;
  status: 'entregue' | 'falha';
  motivoErro?: string;
  confirmado: boolean;
  mensagem: string;
}

export default function MensageriaPage() {
  const { profissional, tipoUsuario } = useAuth();
  const [logs, setLogs] = useState<LembreteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPaciente, setFiltroPaciente] = useState("");
  const [isProcessando, setIsProcessando] = useState(false);

  // Carrega e processa os logs baseando-se nos agendamentos e pacientes reais
  const carregarLogs = async () => {
    setLoading(true);
    try {
      const agendamentos = agendamentoRepository.obterTodos();
      const pacientes = await pacienteRepository.listarTodos();

      // Processa agendamentos que contêm informações de lembrete
      const listaLogs: LembreteLog[] = agendamentos
        .filter(a => a.lembreteWhatsApp !== undefined)
        .map(a => {
          const pac = pacientes.find(p => p.id === a.pacienteId);
          const pacNome = pac ? pac.nomeCompleto : "Paciente Não Localizado";
          const fone = pac ? pac.telefone : "Sem Telefone";
          const mensagem = formatarMensagemWhatsAppLembrete(a, pacNome);

          return {
            agendamentoId: a.id,
            pacienteNome: pacNome,
            telefone: fone,
            especialidade: a.especialidade,
            dataConsulta: a.data,
            horarioConsulta: a.horario,
            ubsNome: a.ubsNome,
            dataEnvio: a.lembreteWhatsApp!.dataEnvio || "-",
            horarioEnvio: a.lembreteWhatsApp!.horarioEnvio || "-",
            status: a.lembreteWhatsApp!.statusEntrega || "falha",
            motivoErro: a.lembreteWhatsApp!.motivoErro,
            confirmado: !!a.lembreteWhatsApp!.confirmadoPaciente,
            mensagem
          };
        })
        .sort((a, b) => {
          // Mais recentes primeiro
          const dataA = new Date(`${a.dataEnvio}T${a.horarioEnvio}:00`);
          const dataB = new Date(`${b.dataEnvio}T${b.horarioEnvio}:00`);
          return dataB.getTime() - dataA.getTime();
        });

      setLogs(listaLogs);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados de mensageria.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  // Dispara varredura manual de lembretes para testes
  const handleVarreduraManual = async () => {
    setIsProcessando(true);
    try {
      const agendamentos = agendamentoRepository.obterTodos();
      const pacientes = await pacienteRepository.listarTodos();

      const { enviados, falhas, novosAgendamentos } = await verificarEEnviarLembretes(agendamentos, pacientes);

      if (enviados > 0 || falhas > 0) {
        agendamentoRepository.salvarTodos(novosAgendamentos);
        toast.success(`Varredura concluída! ${enviados} enviados com sucesso, ${falhas} falha(s).`);
        await carregarLogs();
      } else {
        toast.info("Nenhum novo lembrete atende aos critérios de antecedência no momento.");
      }
    } catch (err) {
      toast.error("Erro ao executar varredura manual.");
    } finally {
      setIsProcessando(false);
    }
  };

  // Métricas do painel
  const totalEnviados = logs.filter(l => l.status === "entregue").length;
  const totalConfirmados = logs.filter(l => l.confirmado).length;
  const totalFalhas = logs.filter(l => l.status === "falha").length;

  const logsFiltrados = logs.filter(l => 
    l.pacienteNome.toLowerCase().includes(filtroPaciente.toLowerCase()) ||
    l.especialidade.toLowerCase().includes(filtroPaciente.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Topo com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Central de Lembretes WhatsApp
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitore, audite e gerencie o envio de lembretes automáticos pré-consulta.
          </p>
        </div>
        
        {tipoUsuario !== "paciente" && (
          <Button
            onClick={handleVarreduraManual}
            disabled={isProcessando}
            className="font-bold text-xs h-10 rounded-xl cursor-pointer gap-2 shrink-0 bg-primary hover:bg-primary/95 text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessando && "animate-spin"}`} />
            Forçar Varredura Manual
          </Button>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-border shadow-xs">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Entregues</span>
              <span className="text-3xl font-black text-[#00a884] block">{totalEnviados}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#00a884]/10 text-[#00a884] flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Presença Confirmada</span>
              <span className="text-3xl font-black text-sky-600 block">{totalConfirmados}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <CheckCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Falhas de Envio</span>
              <span className="text-3xl font-black text-destructive block">{totalFalhas}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-100 text-destructive flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Disparos */}
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/15 border-b p-4 flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Relatório de Envio de Lembretes</CardTitle>
            <CardDescription className="text-[11px]">Auditabilidade e logs de entrega de WhatsApp em tempo real.</CardDescription>
          </div>
          
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filtroPaciente}
              onChange={(e) => setFiltroPaciente(e.target.value)}
              placeholder="Filtrar por paciente ou especialidade..."
              className="pl-9 text-xs h-9 rounded-xl border border-input"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Carregando logs de disparos...</div>
          ) : logsFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Paciente / Contato</th>
                    <th className="py-3 px-4">Consulta / Exame</th>
                    <th className="py-3 px-4">Data Envio</th>
                    <th className="py-3 px-4">Status Lembrete</th>
                    <th className="py-3 px-4 text-center">Presença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logsFiltrados.map((log, idx) => {
                    const isSucesso = log.status === "entregue";
                    return (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="leading-tight">
                            <span className="font-bold text-foreground block">{log.pacienteNome}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{formatarTelefone(log.telefone)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="leading-tight">
                            <span className="font-semibold text-foreground capitalize block">{log.especialidade}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{log.ubsNome}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="leading-tight">
                            <span className="font-semibold text-foreground block">{log.dataEnvio}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{log.horarioEnvio}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isSucesso ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00a884]/15 text-[#00a884] uppercase border border-[#00a884]/20">
                              <CheckCircle className="h-3 w-3" />
                              Entregue
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 uppercase border border-red-500/20">
                                <AlertCircle className="h-3 w-3" />
                                Falhou
                              </span>
                              {log.motivoErro && (
                                <p className="text-[9px] text-destructive max-w-[200px] leading-tight font-medium">
                                  {log.motivoErro}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {log.confirmado ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 uppercase border border-sky-500/20">
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 uppercase border border-slate-500/20">
                              Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-xs italic">
              Nenhum registro de lembrete WhatsApp localizado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
