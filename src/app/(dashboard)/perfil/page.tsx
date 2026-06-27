"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatarCPF, formatarCNS, formatarTelefone, formatarCEP, formatarDataBr } from "@/utils/formatters";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
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
  Heart
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const pacienteRepository = new LocalStoragePacienteRepository();

export default function PerfilPage() {
  const { paciente, cadastrar } = useAuth(); // usamos o contexto para obter e atualizar dados se necessário (o AuthContext expõe cadastrar para salvar, mas podemos atualizar também)
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de Edição (Contato & Endereço)
  const [telefone, setTelefone] = useState(paciente ? formatarTelefone(paciente.telefone) : "");
  const [email, setEmail] = useState(paciente?.email || "");
  const [cep, setCep] = useState(paciente?.endereco.cep || "");
  const [logradouro, setLogradouro] = useState(paciente?.endereco.logradouro || "");
  const [numero, setNumero] = useState(paciente?.endereco.numero || "");
  const [complemento, setComplemento] = useState(paciente?.endereco.complemento || "");
  const [bairro, setBairro] = useState(paciente?.endereco.bairro || "");
  const [cidade, setCidade] = useState(paciente?.endereco.cidade || "");
  const [uf, setUf] = useState(paciente?.endereco.uf || "");

  if (!paciente) {
    return <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Carregando dados...</div>;
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const pacienteAtualizado = {
        ...paciente,
        telefone,
        email,
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
      
      // Atualiza o estado local recarregando a página ou forçando o reload da sessão
      toast.success("Dados cadastrais atualizados com sucesso!");
      setIsEditing(false);
      
      // Pequeno timeout para recarregar e aplicar o estado no AuthContext
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      toast.error("Ocorreu um erro ao salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Seção 1: Cartão SUS Digital (WOW Factor) */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-4.5 w-4.5 text-primary" />
          Cartão Nacional de Saúde Digital
        </h3>
        
        {/* Cartão SUS Virtual */}
        <div className="relative w-full max-w-md mx-auto aspect-16/10 rounded-2xl p-6 overflow-hidden text-white shadow-xl shadow-primary/10 select-none bg-linear-to-br from-[#0284c7] via-[#0369a1] to-[#0f172a] dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a]">
          {/* Logo do SUS no Background */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <Activity className="h-56 w-56 stroke-[4]" />
          </div>
          
          <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
            <Heart className="h-32 w-32 fill-white stroke-none" />
          </div>

          <div className="h-full flex flex-col justify-between relative z-10">
            {/* Topo do Cartão */}
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

            {/* Número do Cartão SUS */}
            <div className="my-auto">
              <span className="block text-[9px] uppercase tracking-wider text-sky-200 font-semibold">Número do CNS</span>
              <span className="font-mono text-xl md:text-2xl font-bold tracking-widest text-white leading-none block mt-1">
                {formatarCNS(paciente.cns)}
              </span>
            </div>

            {/* Rodapé do Cartão */}
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
                      // Restaura valores originais
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
    </div>
  );
}
