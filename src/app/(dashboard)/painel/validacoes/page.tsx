"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { identificarUbsPorEndereco, registrarVinculoUbs } from "@/utils/ubs-matcher";
import { UBS } from "@/core/domain/entities/UBS";
import { Paciente } from "@/core/domain/entities/Paciente";
import { toast } from "sonner";
import { formatarDataBr, formatarCEP } from "@/utils/formatters";
import { 
  ShieldAlert, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Check, 
  X, 
  ChevronLeft,
  FileText,
  User,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SolicitacaoEndereco {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  enderecoAnterior: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  enderecoNovo: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  dataSolicitacao: string;
  status: "pendente" | "aprovada" | "rejeitada";
  justificativaRejeicao?: string;
  validadorId?: string;
  validadorNome?: string;
  dataDecisao?: string;
}

const ubsRepository = new MockUbsRepository();
const pacienteRepository = new LocalStoragePacienteRepository();

export default function ValidarEnderecosPage() {
  const router = useRouter();
  const { paciente, profissional } = useAuth();

  // Controle de privilégios: ACS ou Administrador (R008)
  const isAcs = profissional?.especialidade === "Agente Comunitário de Saúde";
  const isAdmin = paciente?.papel === "administrador";
  const autorizado = isAdmin || isAcs;

  const validadorNome = profissional?.nome || paciente?.nomeCompleto || "Agente de Saúde";
  const validadorId = profissional?.id || paciente?.id || "agente-1";

  // Estados de dados
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoEndereco[]>([]);
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de controle de rejeição
  const [rejeitandoId, setRejeitandoId] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    // Carrega UBSs
    ubsRepository.listarTodas().then(setTodasUbs);

    // Carrega solicitações do LocalStorage
    const salvas = localStorage.getItem("agendaubs_solicitacoes_endereco");
    if (salvas) {
      setSolicitacoes(JSON.parse(salvas));
    }
    setLoading(false);
  }, []);

  const pendentes = solicitacoes.filter(s => s.status === "pendente");
  const historico = solicitacoes.filter(s => s.status !== "pendente");

  const handleAprovar = async (sol: SolicitacaoEndereco) => {
    try {
      // 1. Carrega a lista completa de pacientes
      const keyPacientes = "agendaubs_pacientes";
      const saved = localStorage.getItem(keyPacientes);
      const listaPacientes: Paciente[] = saved ? JSON.parse(saved) : [];

      const pIdx = listaPacientes.findIndex(p => p.id === sol.pacienteId);
      if (pIdx === -1) {
        toast.error("Paciente não encontrado na base de dados.");
        return;
      }

      const pac = listaPacientes[pIdx];

      // 2. Mapeia a nova UBS correspondente ao novo endereço
      const novaUbs = identificarUbsPorEndereco(
        sol.enderecoNovo.bairro,
        sol.enderecoNovo.cep,
        sol.enderecoNovo.cidade,
        todasUbs
      );

      const ubsAnteriorId = pac.ubsId || null;
      const ubsNovaId = novaUbs?.id || "";

      // 3. Atualiza o endereço e UBS vinculada do paciente (R008)
      listaPacientes[pIdx].endereco = { ...sol.enderecoNovo };
      if (ubsAnteriorId !== ubsNovaId && ubsNovaId) {
        listaPacientes[pIdx].ubsId = ubsNovaId;
        // Registra o log no histórico de vinculação do paciente (R007/R008)
        registrarVinculoUbs(
          pac.id,
          ubsAnteriorId,
          ubsNovaId,
          `Mudança de endereço residencial aprovada pelo agente ${validadorNome}.`
        );
      }

      localStorage.setItem(keyPacientes, JSON.stringify(listaPacientes));

      // 4. Grava os metadados da validação na solicitação
      const solicitacoesAtualizadas = solicitacoes.map(s => {
        if (s.id === sol.id) {
          return {
            ...s,
            status: "aprovada" as const,
            validadorId,
            validadorNome,
            dataDecisao: new Date().toISOString()
          };
        }
        return s;
      });
      localStorage.setItem("agendaubs_solicitacoes_endereco", JSON.stringify(solicitacoesAtualizadas));
      setSolicitacoes(solicitacoesAtualizadas);

      // 5. Gera notificação para o paciente (R008)
      const msgNotif = `Sua solicitação de mudança de endereço foi aprovada por ${validadorNome}! ` +
        (novaUbs ? `Sua nova UBS vinculada é: ${novaUbs.nome}.` : "Seu endereço residencial foi atualizado.");
        
      const notifsSalvas = localStorage.getItem("agendaubs_notificacoes");
      const listaNotif = notifsSalvas ? JSON.parse(notifsSalvas) : [];
      listaNotif.push({
        id: `notif-${Date.now()}`,
        pacienteId: sol.pacienteId,
        mensagem: msgNotif,
        lida: false,
        dataCriacao: new Date().toISOString(),
        tipo: "sucesso"
      });
      localStorage.setItem("agendaubs_notificacoes", JSON.stringify(listaNotif));

      toast.success("Solicitação de endereço aprovada e sincronizada!");
    } catch (err) {
      toast.error("Ocorreu um erro ao aprovar a solicitação.");
    }
  };

  const handleRejeitar = (id: string) => {
    setRejeitandoId(id);
    setJustificativa("");
  };

  const confirmarRejeicao = (sol: SolicitacaoEndereco) => {
    if (!justificativa.trim()) {
      toast.error("A justificativa de rejeição é obrigatória.");
      return;
    }

    try {
      // 1. Grava os metadados de rejeição na solicitação (R008)
      const solicitacoesAtualizadas = solicitacoes.map(s => {
        if (s.id === sol.id) {
          return {
            ...s,
            status: "rejeitada" as const,
            justificativaRejeicao: justificativa.trim(),
            validadorId,
            validadorNome,
            dataDecisao: new Date().toISOString()
          };
        }
        return s;
      });
      localStorage.setItem("agendaubs_solicitacoes_endereco", JSON.stringify(solicitacoesAtualizadas));
      setSolicitacoes(solicitacoesAtualizadas);

      // 2. Gera notificação de rejeição para o paciente (R008)
      const msgNotif = `Sua solicitação de mudança de endereço foi REJEITADA por ${validadorNome}. Motivo: ${justificativa.trim()}`;
        
      const notifsSalvas = localStorage.getItem("agendaubs_notificacoes");
      const listaNotif = notifsSalvas ? JSON.parse(notifsSalvas) : [];
      listaNotif.push({
        id: `notif-${Date.now()}`,
        pacienteId: sol.pacienteId,
        mensagem: msgNotif,
        lida: false,
        dataCriacao: new Date().toISOString(),
        tipo: "erro"
      });
      localStorage.setItem("agendaubs_notificacoes", JSON.stringify(listaNotif));

      toast.warning("Solicitação de endereço rejeitada com sucesso.");
      setRejeitandoId(null);
      setJustificativa("");
    } catch (err) {
      toast.error("Erro ao registrar a rejeição.");
    }
  };

  const handleSimularACS = () => {
    if (paciente) {
      try {
        toast.info("Logue na aba 'Profissional' com o identificador '789101' e senha '123456' para simular a agente comunitária Aline.");
        router.push("/login");
      } catch (err) {
        toast.error("Falha ao direcionar para a simulação.");
      }
    }
  };

  if (!paciente && !profissional) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  // Barreira de Privilégios ACS / Administrador R008
  if (!autorizado) {
    return (
      <div className="max-w-md mx-auto py-12 animate-in fade-in duration-300">
        <Card className="border-border shadow-md">
          <CardContent className="p-6 text-center space-y-6">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-xl text-foreground">Acesso Restrito</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Esta funcionalidade é restrita para **Agentes Comunitários de Saúde (ACS)** e responsáveis autorizados pela unidade de saúde.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl text-left border space-y-3">
              <span className="block text-xs font-bold text-foreground">Testar Perfil de ACS (Aline Souza):</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Clique no botão abaixo para ir para a tela de login, onde poderá acessar a conta da Agente Comunitária de Saúde simulada.
              </p>
              <Button
                type="button"
                onClick={handleSimularACS}
                className="w-full text-xs font-bold cursor-pointer gap-1.5"
              >
                Ir para Login de ACS
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push("/painel")}
              className="w-full text-xs font-semibold cursor-pointer"
            >
              Voltar ao Painel Geral
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-2 sm:px-0 animate-in fade-in duration-300">
      
      {/* Barra superior de controle & Alternador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/painel")}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Painel
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push("/acs")}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer p-0 h-auto"
          >
            Registrar Visitas em Campo
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start sm:self-auto flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Módulo de Validação Cadastral
        </span>
      </div>

      {/* Solicitações Pendentes */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-primary" />
          Solicitações Pendentes de Validação ({pendentes.length})
        </h3>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Carregando solicitações...</div>
        ) : pendentes.length > 0 ? (
          <div className="space-y-4">
            {pendentes.map((sol) => (
              <Card key={sol.id} className="border-border shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/15 border-b p-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">{sol.pacienteNome}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Solicitado em: {formatarDataBr(sol.dataSolicitacao.split("T")[0])}
                  </span>
                </CardHeader>
                
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Endereço Anterior */}
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Endereço Anterior:</span>
                      <p className="text-foreground leading-relaxed">
                        {sol.enderecoAnterior.logradouro}, nº {sol.enderecoAnterior.numero} <br />
                        {sol.enderecoAnterior.bairro} - {sol.enderecoAnterior.cidade}/{sol.enderecoAnterior.uf} <br />
                        CEP: {formatarCEP(sol.enderecoAnterior.cep)}
                      </p>
                    </div>

                    {/* Novo Endereço */}
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="block text-[10px] uppercase font-bold text-primary mb-1">Novo Endereço Solicitado:</span>
                      <p className="text-foreground leading-relaxed font-medium">
                        {sol.enderecoNovo.logradouro}, nº {sol.enderecoNovo.numero} <br />
                        {sol.enderecoNovo.bairro} - {sol.enderecoNovo.cidade}/{sol.enderecoNovo.uf} <br />
                        CEP: {formatarCEP(sol.enderecoNovo.cep)}
                      </p>
                    </div>
                  </div>

                  {/* Formulário de Rejeição Integrado (R008) */}
                  {rejeitandoId === sol.id && (
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="block font-bold text-destructive">Justificativa da Rejeição (Obrigatória) *</label>
                      <Input
                        placeholder="Ex: Endereço inexistente ou comprovante de residência inválido."
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        className="text-xs"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejeitandoId(null)}
                          className="h-7 text-[10px] font-bold text-muted-foreground cursor-pointer"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmarRejeicao(sol)}
                          className="h-7 text-[10px] font-bold cursor-pointer"
                        >
                          Confirmar Rejeição
                        </Button>
                      </div>
                    </div>
                  )}

                </CardContent>

                {rejeitandoId !== sol.id && (
                  <CardFooter className="p-4 border-t justify-end gap-2 bg-muted/5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejeitar(sol.id)}
                      className="h-8 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/10 cursor-pointer gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Rejeitar Alteração
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAprovar(sol)}
                      className="h-8 text-xs font-semibold cursor-pointer gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Homologar / Aprovar
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg bg-card/50">
            Nenhuma solicitação de alteração de endereço pendente de validação.
          </div>
        )}
      </section>

      {/* Histórico das Validações Realizadas */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-primary" />
          Histórico de Validações Realizadas ({historico.length})
        </h3>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            {historico.length > 0 ? (
              <div className="space-y-4 divide-y divide-border">
                {historico.map((sol, idx) => {
                  const aprovada = sol.status === "aprovada";

                  return (
                    <div key={sol.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx > 0 && "pt-3.5"}`}>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{sol.pacienteNome}</span>
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            aprovada ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                            "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}>
                            {sol.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          De: {sol.enderecoAnterior.bairro} → Para: {sol.enderecoNovo.bairro}
                        </p>
                        {!aprovada && sol.justificativaRejeicao && (
                          <p className="text-[11px] text-destructive bg-destructive/5 p-2 rounded-lg italic">
                            Motivo Rejeição: "{sol.justificativaRejeicao}"
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground font-semibold">
                          Validador: {sol.validadorNome} em {formatarDataBr(sol.dataDecisao?.split("T")[0] || "")} às {sol.dataDecisao?.split("T")[1]?.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Nenhuma validação cadastrada no histórico.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
