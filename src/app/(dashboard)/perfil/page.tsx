"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatarCPF, formatarCNS, formatarTelefone, formatarCEP, formatarDataBr } from "@/utils/formatters";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { identificarUbsPorEndereco, obterHistoricoVinculoUbs, registrarVinculoUbs, HistoricoVinculoUbs } from "@/utils/ubs-matcher";
import { UBS } from "@/core/domain/entities/UBS";
import { toast } from "sonner";
import { 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  User2, 
  Edit3, 
  Save, 
  X, 
  Activity,
  Heart,
  Building,
  AlertTriangle,
  History,
  Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pacienteRepository = new LocalStoragePacienteRepository();
const ubsRepository = new MockUbsRepository();

export default function PerfilPage() {
  const { paciente } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de Edição (Contato & Endereço)
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Estados do Matcher de UBS
  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);
  const [ubsVinculada, setUbsVinculada] = useState<UBS | null>(null);
  const [historicoUbs, setHistoricoUbs] = useState<HistoricoVinculoUbs[]>([]);

  // Inicializa dados
  useEffect(() => {
    if (paciente) {
      setTelefone(formatarTelefone(paciente.telefone));
      setEmail(paciente.email);
      setCep(paciente.endereco.cep);
      setLogradouro(paciente.endereco.logradouro);
      setNumero(paciente.endereco.numero);
      setComplemento(paciente.endereco.complemento || "");
      setBairro(paciente.endereco.bairro);
      setCidade(paciente.endereco.cidade);
      setUf(paciente.endereco.uf);

      // Carrega UBSs
      ubsRepository.listarTodas().then((ubss) => {
        setTodasUbs(ubss);
        if (paciente.ubsId) {
          const ubs = ubss.find((u) => u.id === paciente.ubsId);
          if (ubs) setUbsVinculada(ubs);
        }
      });

      // Carrega histórico de vinculações
      setHistoricoUbs(obterHistoricoVinculoUbs(paciente.id));
    }
  }, [paciente]);

  if (!paciente) {
    return <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Carregando dados...</div>;
  }

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
          toast.success("Endereço atualizado pelo CEP!");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Validações básicas de preenchimento
    if (!cep.trim() || !logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios de endereço.");
      setIsSaving(false);
      return;
    }

    try {
      // 1. Mapeia a UBS responsável com base no novo endereço editado (R007)
      const ubsResponsavel = identificarUbsPorEndereco(bairro, cep, cidade, todasUbs);
      const novoUbsId = ubsResponsavel?.id || "";

      // Verifica se a UBS vinculada foi alterada
      const ubsAnteriorId = paciente.ubsId || null;
      const ubsAlterada = ubsAnteriorId !== novoUbsId;

      const pacienteAtualizado = {
        ...paciente,
        telefone: telefone.replace(/\D/g, ""),
        email: email.trim().toLowerCase(),
        ubsId: novoUbsId || undefined, // Atualiza a UBS vinculada do paciente
        endereco: {
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
        }
      };

      await pacienteRepository.salvar(pacienteAtualizado);
      
      // 2. Se mudou a UBS, registra no histórico de vinculação (R007)
      if (ubsAlterada) {
        if (novoUbsId) {
          registrarVinculoUbs(
            paciente.id,
            ubsAnteriorId,
            novoUbsId,
            "Mudança ou atualização do endereço residencial pelo paciente."
          );
        }
        
        toast.info(
          ubsResponsavel 
            ? `Sua UBS de cobertura foi atualizada para: ${ubsResponsavel.nome}`
            : "Seu endereço foi alterado, mas não identificamos nenhuma UBS correspondente."
        );
      }

      toast.success("Dados cadastrais atualizados com sucesso!");
      setIsEditing(false);
      
      // Atualiza os estados locais imediatamente para refletir na UI sem refresh
      setUbsVinculada(ubsResponsavel);
      setHistoricoUbs(obterHistoricoVinculoUbs(paciente.id));

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      toast.error("Ocorreu um erro ao salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Seção 1: Cartão SUS Digital */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-4.5 w-4.5 text-primary" />
          Cartão Nacional de Saúde Digital
        </h3>
        
        <div className="relative w-full max-w-md mx-auto aspect-16/10 rounded-2xl p-6 overflow-hidden text-white shadow-xl shadow-primary/10 select-none bg-linear-to-br from-[#0284c7] via-[#0369a1] to-[#0f172a] dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a]">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <Activity className="h-56 w-56 stroke-[4]" />
          </div>
          
          <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
            <Heart className="h-32 w-32 fill-white stroke-none" />
          </div>

          <div className="h-full flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-sky-200">República Federativa do Brasil</span>
                <span className="block text-xs uppercase font-extrabold tracking-wider text-white -mt-0.5">Ministério da Saúde</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15">
                <Activity className="h-4.5 w-4.5 text-sky-300 stroke-[2.5]" />
                <span className="text-[10px] font-black tracking-tighter text-white">SUS</span>
              </div>
            </div>

            <div className="my-auto">
              <span className="block text-[9px] uppercase tracking-wider text-sky-200 font-semibold">Número do CNS</span>
              <span className="font-mono text-xl md:text-2xl font-bold tracking-widest text-white leading-none block mt-1">
                {formatarCNS(paciente.cns)}
              </span>
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-3">
              <div className="flex-1 min-w-0 pr-2">
                <span className="block text-[8px] uppercase tracking-wider text-sky-200 font-semibold">Nome do Usuário</span>
                <span className="block text-sm font-bold text-white truncate leading-tight uppercase">
                  {paciente.nomeCompleto}
                </span>
              </div>
              <div className="flex gap-4 text-right shrink-0">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-sky-200 font-semibold">Nascimento</span>
                  <span className="block text-xs font-bold text-white">
                    {formatarDataBr(paciente.dataNascimento)}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-sky-200 font-semibold">Gênero</span>
                  <span className="block text-xs font-bold text-white capitalize">
                    {paciente.genero}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Dados Pessoais & Endereço */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Dados de Cadastro
          </h3>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 font-semibold cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              Editar Dados
            </Button>
          )}
        </div>

        <form onSubmit={handleSalvar}>
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              
              {/* Informações Fixas do Core */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <User2 className="h-4 w-4 text-primary" />
                    Nome Completo
                  </span>
                  <p className="text-sm font-semibold text-foreground">{paciente.nomeCompleto}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Documento (CPF)
                  </span>
                  <p className="text-sm font-semibold text-foreground">{formatarCPF(paciente.cpf)}</p>
                </div>
              </div>

              {/* Informações Editáveis */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Dados de Contato e Endereço</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      E-mail *
                    </label>
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="telefone" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Celular/Telefone
                    </label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                      disabled={!isEditing || isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-2">
                    <label htmlFor="cep" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      CEP *
                    </label>
                    <Input
                      id="cep"
                      value={cep}
                      onChange={(e) => setCep(formatarCEP(e.target.value))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label htmlFor="logradouro" className="text-xs font-semibold text-foreground">
                      Logradouro *
                    </label>
                    <Input
                      id="logradouro"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-2">
                    <label htmlFor="numero" className="text-xs font-semibold text-foreground">
                      Número *
                    </label>
                    <Input
                      id="numero"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label htmlFor="complemento" className="text-xs font-semibold text-foreground">
                      Complemento
                    </label>
                    <Input
                      id="complemento"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      disabled={!isEditing || isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="bairro" className="text-xs font-semibold text-foreground">
                      Bairro *
                    </label>
                    <Input
                      id="bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Bairro do paciente"
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="cidade" className="text-xs font-semibold text-foreground">
                      Cidade *
                    </label>
                    <Input
                      id="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="uf" className="text-xs font-semibold text-foreground">
                      Estado (UF) *
                    </label>
                    <Input
                      id="uf"
                      value={uf}
                      onChange={(e) => setUf(e.target.value)}
                      maxLength={2}
                      disabled={!isEditing || isSaving}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação ao Editar */}
              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-border animate-in fade-in duration-150">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setTelefone(formatarTelefone(paciente.telefone));
                      setEmail(paciente.email);
                      setCep(paciente.endereco.cep);
                      setLogradouro(paciente.endereco.logradouro);
                      setNumero(paciente.endereco.numero);
                      setComplemento(paciente.endereco.complemento || "");
                      setBairro(paciente.endereco.bairro);
                      setCidade(paciente.endereco.cidade);
                      setUf(paciente.endereco.uf);
                    }}
                    disabled={isSaving}
                    className="gap-1.5 font-semibold cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="gap-1.5 font-semibold cursor-pointer shadow-sm"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </form>
      </section>

      {/* Seção 3: Minha Unidade Básica de Saúde (R007) */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Building className="h-4.5 w-4.5 text-primary" />
          Minha Unidade de Saúde Vinculada
        </h3>

        {ubsVinculada ? (
          /* Exibição da UBS Vinculada Ativa */
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">{ubsVinculada.nome}</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Unidade responsável pelo atendimento territorial da sua residência.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="block text-muted-foreground font-semibold">Endereço da Unidade:</span>
                  <span className="text-foreground font-medium block">
                    {ubsVinculada.endereco.logradouro}, nº {ubsVinculada.endereco.numero} - {ubsVinculada.endereco.bairro}
                  </span>
                  <span className="text-muted-foreground block">
                    {ubsVinculada.endereco.cidade}/{ubsVinculada.endereco.uf} - CEP {formatarCEP(ubsVinculada.endereco.cep)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-muted-foreground">Telefone/Contato:</span>
                    <span className="text-foreground font-medium">{formatarTelefone(ubsVinculada.telefone)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-muted-foreground">Horário de Funcionamento:</span>
                    <span className="text-foreground font-medium">{ubsVinculada.horarioFuncionamento}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-muted-foreground">Registro CNES:</span>
                    <span className="text-foreground font-medium">{ubsVinculada.cnes}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Aviso de Não Identificação da UBS por dados incompletos/inválidos */
          <Card className="border-amber-500/20 bg-amber-500/5 shadow-xs">
            <CardContent className="p-5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="font-bold text-amber-800 text-sm">Não foi possível identificar sua UBS de cobertura</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Para que o SUS identifique automaticamente a unidade de saúde responsável pelo seu atendimento, 
                  garanta que o **bairro**, **CEP** e **cidade** do seu endereço residencial estejam corretos e completos.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                  className="h-8 border-amber-300 text-amber-800 hover:bg-amber-100 cursor-pointer font-bold text-xs"
                >
                  Corrigir Endereço Residencial
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Seção 4: Histórico de Alterações de Vinculação (R007) */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-primary" />
          Histórico de Vinculação de UBS
        </h3>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            {historicoUbs.length > 0 ? (
              <div className="relative border-l border-border ml-3 pl-5 space-y-5">
                {historicoUbs.map((log) => {
                  const ubsNovaNome = todasUbs.find(u => u.id === log.ubsIdNova)?.nome || "Unidade de Saúde";
                  const ubsAnteriorNome = log.ubsIdAnterior 
                    ? (todasUbs.find(u => u.id === log.ubsIdAnterior)?.nome || "Unidade Anterior")
                    : "Nenhuma (Cadastro)";

                  return (
                    <div key={log.id} className="relative">
                      {/* Ponto na timeline */}
                      <span className="absolute -left-[26.5px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      
                      <div className="space-y-1">
                        <span className="block text-[10px] font-bold text-muted-foreground">
                          {formatarDataBr(log.dataAlteracao.split("T")[0])} às {log.dataAlteracao.split("T")[1]?.slice(0, 5)}
                        </span>
                        <h4 className="text-xs font-bold text-foreground">
                          Vinculado a: {ubsNovaNome}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Anterior: <span className="font-semibold">{ubsAnteriorNome}</span> • Motivo: {log.motivo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Nenhum registro de alteração de unidade vinculada no histórico.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
