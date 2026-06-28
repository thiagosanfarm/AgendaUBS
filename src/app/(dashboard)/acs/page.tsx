"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { identificarUbsPorEndereco, registrarVinculoUbs } from "@/utils/ubs-matcher";
import { Paciente } from "@/core/domain/entities/Paciente";
import { UBS } from "@/core/domain/entities/UBS";
import { formatarCEP, formatarTelefone } from "@/utils/formatters";
import { toast } from "sonner";
import { 
  Users, 
  MapPin, 
  Phone, 
  Clipboard, 
  FileText, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ChevronRight,
  UserCheck,
  Search,
  MapPinCheck,
  ChevronLeft,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Interface local de visita domiciliar
interface VisitaDomiciliar {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  agenteId: string;
  agenteNome: string;
  data: string;
  horario: string;
  localizacao?: {
    latitude: number;
    longitude: number;
  };
  telefoneAtualizado: string;
  enderecoAtualizado: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  composicaoFamiliar: string;
  observacoes: string;
  sincronizado: "sincronizado" | "pendente" | "erro";
}

const LOCAL_STORAGE_VISITAS_KEY = "agendaubs_visitas_acs";
const pacienteRepository = new LocalStoragePacienteRepository();
const ubsRepository = new MockUbsRepository();

export default function VisitasAcsPage() {
  const router = useRouter();
  const { profissional, paciente } = useAuth();
  
  // Quem é o agente logado (profissional ACS ou administrador simulado)
  const agenteNome = profissional?.nome || paciente?.nomeCompleto || "Agente Comunitário";
  const agenteId = profissional?.id || paciente?.id || "agente-1";

  // Estados de dados
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  
  // Estados do formulário
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [composicaoFamiliar, setComposicaoFamiliar] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Geolocation
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  // Estados de Conexão e Sincronização (R009)
  const [isOnline, setIsOnline] = useState(true);
  const [visitas, setVisitas] = useState<VisitaDomiciliar[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [simularErroSync, setSimularErroSync] = useState(false);

  const [todasUbs, setTodasUbs] = useState<UBS[]>([]);

  // Carrega pacientes, UBSs e visitas salvas do LocalStorage
  useEffect(() => {
    // Busca geolocalização do navegador
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => console.warn("Geolocalização não concedida pelo usuário.", err)
      );
    }

    // Carrega UBSs
    ubsRepository.listarTodas().then(setTodasUbs);

    // Carrega pacientes
    const key = `agendaubs_pacientes`;
    const savedPacientes = localStorage.getItem(key);
    if (savedPacientes) {
      setPacientes(JSON.parse(savedPacientes));
    }

    // Carrega histórico de visitas do ACS
    const savedVisitas = localStorage.getItem(LOCAL_STORAGE_VISITAS_KEY);
    if (savedVisitas) {
      setVisitas(JSON.parse(savedVisitas));
    }
  }, []);

  // Filtro reativo de pesquisa de paciente
  const pacientesFiltrados = searchTerm.trim() === "" 
    ? [] 
    : pacientes.filter(p => 
        p.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm)
      );

  const handleSelectPaciente = (p: Paciente) => {
    setPacienteSelecionado(p);
    setTelefone(formatarTelefone(p.telefone));
    setCep(p.endereco.cep);
    setLogradouro(p.endereco.logradouro);
    setNumero(p.endereco.numero);
    setComplemento(p.endereco.complemento || "");
    setBairro(p.endereco.bairro);
    setCidade(p.endereco.cidade);
    setUf(p.endereco.uf);
    setComposicaoFamiliar("");
    setObservacoes("");
    setSearchTerm("");
  };

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
        }
      } catch (err) {
        console.error("Erro ao buscar CEP no ACS", err);
      }
    }
  };

  // Lógica de sincronização manual ou reativa quando volta a ficar Online (R009)
  const syncVisitas = async (visitasAtuais: VisitaDomiciliar[]) => {
    const pendentes = visitasAtuais.filter(v => v.sincronizado === "pendente" || v.sincronizado === "erro");
    if (pendentes.length === 0) return;

    setIsSyncing(true);
    toast.loading("Sincronizando atualizações pendentes com o servidor...");

    // Simula atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (simularErroSync) {
      const atualizadas = visitasAtuais.map(v => 
        v.sincronizado === "pendente" ? { ...v, sincronizado: "erro" as const } : v
      );
      localStorage.setItem(LOCAL_STORAGE_VISITAS_KEY, JSON.stringify(atualizadas));
      setVisitas(atualizadas);
      toast.dismiss();
      toast.error("Erro na sincronização de dados. Tente novamente mais tarde.");
      setIsSyncing(false);
      return;
    }

    // Processa a sincronização e grava os dados nos Pacientes reais
    const pacientesChave = `agendaubs_pacientes`;
    const savedPacientes = localStorage.getItem(pacientesChave);
    const listaPacientes: Paciente[] = savedPacientes ? JSON.parse(savedPacientes) : [];

    pendentes.forEach(visita => {
      const pIdx = listaPacientes.findIndex(p => p.id === visita.pacienteId);
      if (pIdx !== -1) {
        const pAntigo = listaPacientes[pIdx];

        // Atualiza a UBS de acordo com o endereço alterado
        const novaUbs = identificarUbsPorEndereco(
          visita.enderecoAtualizado.bairro,
          visita.enderecoAtualizado.cep,
          visita.enderecoAtualizado.cidade,
          todasUbs
        );

        if (novaUbs && novaUbs.id !== pAntigo.ubsId) {
          registrarVinculoUbs(
            pAntigo.id,
            pAntigo.ubsId || null,
            novaUbs.id,
            `Visita domiciliar realizada pelo agente ${visita.agenteNome}.`
          );
          listaPacientes[pIdx].ubsId = novaUbs.id;
        }

        // Atualiza os dados cadastrais
        listaPacientes[pIdx].telefone = visita.telefoneAtualizado.replace(/\D/g, "");
        listaPacientes[pIdx].endereco = {
          ...visita.enderecoAtualizado
        };
      }
    });

    // Salva a lista de pacientes atualizada
    localStorage.setItem(pacientesChave, JSON.stringify(listaPacientes));
    setPacientes(listaPacientes);

    // Marca todas como sincronizadas
    const atualizadas = visitasAtuais.map(v => 
      v.sincronizado === "pendente" || v.sincronizado === "erro" 
        ? { ...v, sincronizado: "sincronizado" as const } 
        : v
    );

    localStorage.setItem(LOCAL_STORAGE_VISITAS_KEY, JSON.stringify(atualizadas));
    setVisitas(atualizadas);
    
    toast.dismiss();
    toast.success("Sincronização em lote concluída com sucesso!");
    setIsSyncing(false);
  };

  const handleToggleOnline = async (online: boolean) => {
    setIsOnline(online);
    if (online) {
      toast.success("Dispositivo reconectado! Sincronizando dados...");
      await syncVisitas(visitas);
    } else {
      toast.info("Dispositivo operando em modo OFFLINE. Atualizações serão guardadas localmente.");
    }
  };

  const handleSalvarVisita = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pacienteSelecionado) {
      toast.error("Por favor, selecione um paciente.");
      return;
    }

    // Validação de campos obrigatórios (R009)
    if (!telefone.trim() || !cep.trim() || !logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
      toast.error("Preencha todos os campos obrigatórios de endereço e telefone.");
      return;
    }

    const agora = new Date();
    const dataVisita = agora.toISOString().split("T")[0];
    const horaVisita = agora.toTimeString().split(" ")[0].slice(0, 5);

    const novaVisita: VisitaDomiciliar = {
      id: `visita-${Date.now()}`,
      pacienteId: pacienteSelecionado.id,
      pacienteNome: pacienteSelecionado.nomeCompleto,
      agenteId,
      agenteNome,
      data: dataVisita,
      horario: horaVisita,
      localizacao: location,
      telefoneAtualizado: telefone,
      enderecoAtualizado: {
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf
      },
      composicaoFamiliar,
      observacoes,
      sincronizado: isOnline ? "sincronizado" : "pendente"
    };

    const listaAtualizada = [novaVisita, ...visitas];
    localStorage.setItem(LOCAL_STORAGE_VISITAS_KEY, JSON.stringify(listaAtualizada));
    setVisitas(listaAtualizada);

    // Se estiver online, atualiza os dados cadastrais do paciente imediatamente
    if (isOnline) {
      try {
        const ubsCoincidente = identificarUbsPorEndereco(bairro, cep, cidade, todasUbs);
        
        const pacienteAtualizado: Paciente = {
          ...pacienteSelecionado,
          telefone: telefone.replace(/\D/g, ""),
          ubsId: ubsCoincidente?.id || pacienteSelecionado.ubsId,
          endereco: {
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf
          }
        };

        if (ubsCoincidente && ubsCoincidente.id !== pacienteSelecionado.ubsId) {
          registrarVinculoUbs(
            pacienteSelecionado.id,
            pacienteSelecionado.ubsId || null,
            ubsCoincidente.id,
            `Visita domiciliar realizada pelo agente ${agenteNome}.`
          );
        }

        await pacienteRepository.salvar(pacienteAtualizado);
        toast.success("Atualização cadastral enviada e sincronizada com sucesso!");
      } catch (err) {
        console.error("Falha ao salvar de forma síncrona", err);
      }
    } else {
      toast.warning("Visita gravada no modo OFFLINE. Pendente de sincronização.");
    }

    // Reseta o formulário
    setPacienteSelecionado(null);
    setTelefone("");
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setUf("");
    setComposicaoFamiliar("");
    setObservacoes("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0 animate-in fade-in duration-300">
      
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
            onClick={() => router.push("/painel/validacoes")}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer p-0 h-auto"
          >
            Validar Endereços de Pacientes
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full self-start sm:self-auto flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Modo Agente de Saúde
        </span>
      </div>

      {/* Cabeçalho de Controle Offline/Online */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border border-border">
        <div>
          <span className="block text-[10px] font-bold text-muted-foreground uppercase">Agente de Saúde</span>
          <span className="block text-sm font-bold text-foreground">{agenteNome}</span>
        </div>

        {/* Chaves de Modo de Conexão Simulado (R009) */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={isOnline ? "default" : "outline"}
            onClick={() => handleToggleOnline(true)}
            size="sm"
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Wifi className="h-4 w-4" />
            Online
          </Button>
          <Button
            type="button"
            variant={!isOnline ? "destructive" : "outline"}
            onClick={() => handleToggleOnline(false)}
            size="sm"
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <WifiOff className="h-4 w-4" />
            Offline
          </Button>

          {isOnline && visitas.some(v => v.sincronizado === "pendente" || v.sincronizado === "erro") && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => syncVisitas(visitas)}
              disabled={isSyncing}
              className="h-9 w-9 shrink-0 cursor-pointer animate-spin"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Switch de simulação de erro para fins de testes de homologação */}
      {!isOnline && (
        <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs flex justify-between items-center">
          <span>Simular Falha de Conexão no Servidor ao Sincronizar?</span>
          <button
            onClick={() => setSimularErroSync(!simularErroSync)}
            className={`px-3 py-1 text-[10px] font-bold uppercase rounded border cursor-pointer ${
              simularErroSync 
                ? "bg-destructive text-white border-transparent" 
                : "bg-white text-destructive border-destructive"
            }`}
          >
            {simularErroSync ? "Ativo" : "Inativo"}
          </button>
        </div>
      )}

      {/* Seção Principal: Registro de Visita */}
      {!pacienteSelecionado ? (
        /* Busca de Paciente */
        <Card className="border-border shadow-xs">
          <CardHeader className="p-5 border-b">
            <CardTitle className="font-heading font-bold text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Pesquisar Paciente Domiciliar
            </CardTitle>
            <CardDescription>
              Busque o cidadão por nome completo ou CPF para iniciar o registro da visita em campo.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                placeholder="Nome ou CPF do paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-xs"
              />
            </div>

            {pacientesFiltrados.length > 0 && (
              <div className="border rounded-lg divide-y bg-card max-h-60 overflow-y-auto">
                {pacientesFiltrados.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPaciente(p)}
                    className="w-full p-3 text-left text-xs hover:bg-muted/40 transition-colors flex justify-between items-center group cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-foreground block group-hover:text-primary transition-colors">
                        {p.nomeCompleto}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        CPF: {p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")} • CNS: {p.cns}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
            {searchTerm.trim() !== "" && pacientesFiltrados.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum paciente localizado na base local.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Formulário de Visita */
        <Card className="border-border shadow-md animate-in slide-in-from-right duration-250">
          <CardHeader className="p-5 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading font-bold text-base flex items-center gap-1.5">
                <UserCheck className="h-5 w-5 text-primary" />
                Atualização: {pacienteSelecionado.nomeCompleto}
              </CardTitle>
              <CardDescription>
                Atualize as informações domiciliares do paciente durante a visita em campo.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPacienteSelecionado(null)}
              className="text-xs font-semibold cursor-pointer text-muted-foreground"
            >
              Cancelar
            </Button>
          </CardHeader>
          
          <form onSubmit={handleSalvarVisita}>
            <CardContent className="p-5 space-y-4 text-xs">
              
              {/* Telefone e CEP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Celular/Telefone *</label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={telefone}
                      onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">CEP *</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={cep}
                      onChange={(e) => setCep(formatarCEP(e.target.value))}
                      onBlur={handleCepBlur}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Logradouro e Número */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-foreground">Logradouro *</label>
                  <Input
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <label className="font-bold text-foreground">Número *</label>
                  <Input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              {/* Bairro, Cidade e UF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Bairro *</label>
                  <Input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Cidade *</label>
                  <Input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Estado (UF) *</label>
                  <Input
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="text-xs"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              {/* Composição Familiar */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Composição Familiar (Moradores / Grau parentesco)</label>
                <Textarea
                  placeholder="Ex: Mãe e 2 filhos. Avô mora no anexo."
                  value={composicaoFamiliar}
                  onChange={(e) => setComposicaoFamiliar(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* Observações da Visita */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">Observações Clínicas / Visita</label>
                <Textarea
                  placeholder="Ex: Paciente acamado com dores articulares. Necessita de visita médica."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              {/* Destaque de Geolocalização (R009) */}
              {location && (
                <div className="flex items-center gap-1.5 p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px]">
                  <MapPinCheck className="h-4 w-4" />
                  <span>Geolocalização registrada: Lat {location.latitude.toFixed(6)}, Lng {location.longitude.toFixed(6)}</span>
                </div>
              )}

            </CardContent>

            <CardFooter className="p-5 border-t justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPacienteSelecionado(null)}
                className="font-semibold text-xs cursor-pointer"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="font-semibold text-xs cursor-pointer shadow-sm"
              >
                Salvar Registro de Visita
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Histórico das Visitas Realizadas pelo ACS (R009) */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clipboard className="h-4.5 w-4.5 text-primary" />
          Registros e Status de Atualizações em Campo
        </h3>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            {visitas.length > 0 ? (
              <div className="space-y-4 divide-y divide-border">
                {visitas.map((v, idx) => {
                  const isSync = v.sincronizado === "sincronizado";
                  const isPend = v.sincronizado === "pendente";
                  const isErr = v.sincronizado === "erro";

                  return (
                    <div key={v.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${idx > 0 && "pt-3.5"}`}>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{v.pacienteNome}</span>
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isSync ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                            isPend ? "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse" :
                            "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}>
                            {isSync && "✓ Sincronizado"}
                            {isPend && "⚠️ Pendente (Offline)"}
                            {isErr && "❌ Erro de Sincronização"}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px]">
                          Endereço: {v.enderecoAtualizado.logradouro}, {v.enderecoAtualizado.numero} - {v.enderecoAtualizado.bairro}
                        </p>
                        {v.observacoes && (
                          <p className="text-[11px] text-foreground bg-muted/40 p-2 rounded-lg italic">
                            "{v.observacoes}"
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground font-semibold">
                          ACS: {v.agenteNome} • Reg: {v.data} às {v.horario}
                        </p>
                      </div>

                      {isErr && isOnline && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncVisitas(visitas)}
                          className="h-7 text-[10px] font-bold text-primary cursor-pointer shrink-0"
                        >
                          Tentar Novamente
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 opacity-50" />
                <span>Nenhuma visita registrada em campo por você.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
