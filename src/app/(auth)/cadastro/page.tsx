"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputCPF } from "@/components/forms/InputCPF";
import { InputCNS } from "@/components/forms/InputCNS";
import { formatarTelefone, formatarCEP } from "@/utils/formatters";
import { validarCPF, validarCNS, validarEmail, validarTelefone } from "@/utils/validators";
import { Eye, EyeOff } from "lucide-react";
import { MockUbsRepository } from "@/infra/api/repositories/MockUbsRepository";
import { identificarUbsPorEndereco, registrarVinculoUbs } from "@/utils/ubs-matcher";

const ubsRepository = new MockUbsRepository();

export default function CadastroPage() {
  const router = useRouter();
  const { cadastrar } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dos campos pessoais
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [cns, setCns] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [genero, setGenero] = useState<"masculino" | "feminino" | "outro">("masculino");
  
  // Senhas
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  
  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Estado de erros individuais (UX melhorada com shadcn/ui)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = formatarCEP(e.target.value);
    setCep(formattedCep);
    if (errors.cep) setErrors(prev => ({ ...prev, cep: "" }));

    const cleanCep = formattedCep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
          
          // Limpa erros de endereço autocompletados
          setErrors(prev => ({
            ...prev,
            logradouro: "",
            bairro: "",
            cidade: "",
            uf: ""
          }));

          toast.success("Endereço autocompletado via CEP!");
        } else {
          setErrors(prev => ({ ...prev, cep: "CEP não encontrado." }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };

  const validarCampos = (): boolean => {
    const novosErros: Record<string, string> = {};

    // Nome completo (deve ter nome e sobrenome)
    if (!nomeCompleto.trim()) {
      novosErros.nomeCompleto = "O nome completo é obrigatório.";
    } else if (nomeCompleto.trim().split(/\s+/).length < 2) {
      novosErros.nomeCompleto = "Insira seu nome completo (nome e pelo menos um sobrenome).";
    }

    // CPF
    if (!cpf) {
      novosErros.cpf = "O CPF é obrigatório.";
    } else if (!validarCPF(cpf)) {
      novosErros.cpf = "CPF inválido de acordo com o padrão nacional.";
    }

    // Cartão SUS (CNS)
    if (!cns) {
      novosErros.cns = "O Cartão do SUS é obrigatório.";
    } else if (!validarCNS(cns)) {
      novosErros.cns = "Cartão Nacional de Saúde (CNS) inválido.";
    }

    // Data de Nascimento
    if (!dataNascimento) {
      novosErros.dataNascimento = "A data de nascimento é obrigatória.";
    }

    // E-mail
    if (!email) {
      novosErros.email = "O e-mail é obrigatório.";
    } else if (!validarEmail(email)) {
      novosErros.email = "Formato de e-mail inválido.";
    }

    // Telefone (obrigatório pelo R001)
    if (!telefone) {
      novosErros.telefone = "O telefone é obrigatório.";
    } else if (!validarTelefone(telefone)) {
      novosErros.telefone = "Telefone inválido. Insira DDD + número.";
    }

    // Senha
    if (!senha) {
      novosErros.senha = "A senha é obrigatória.";
    } else if (senha.length < 6) {
      novosErros.senha = "A senha deve conter no mínimo 6 caracteres.";
    }

    // Confirmação de Senha
    if (!confirmarSenha) {
      novosErros.confirmarSenha = "A confirmação de senha é obrigatória.";
    } else if (senha !== confirmarSenha) {
      novosErros.confirmarSenha = "As senhas informadas não coincidem.";
    }

    // Endereço Residencial
    if (!cep) novosErros.cep = "O CEP é obrigatório.";
    if (!logradouro) novosErros.logradouro = "O logradouro é obrigatório.";
    if (!numero) novosErros.numero = "O número é obrigatório.";
    if (!bairro) novosErros.bairro = "O bairro é obrigatório.";
    if (!cidade) novosErros.cidade = "A cidade é obrigatória.";
    if (!uf) novosErros.uf = "A UF é obrigatória.";

    setErrors(novosErros);

    // Se houver algum erro, exibe feedback no toast informando que existem pendências
    if (Object.keys(novosErros).length > 0) {
      toast.error("Por favor, corrija os erros sinalizados no formulário.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarCampos()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Identificar automaticamente a UBS correspondente
      const ubss = await ubsRepository.listarTodas();
      const ubsCorrespondente = identificarUbsPorEndereco(bairro, cep, cidade, ubss);

      // 2. Realizar cadastro
      const pacienteCriado = await cadastrar({
        nomeCompleto,
        cpf,
        cns,
        dataNascimento,
        email,
        telefone,
        genero,
        senha,
        endereco: {
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
        },
        ubsId: ubsCorrespondente?.id // Realiza a vinculação automática no cadastro
      });

      // 3. Registrar o vínculo no histórico se identificada
      if (ubsCorrespondente) {
        registrarVinculoUbs(
          pacienteCriado.id, 
          null, 
          ubsCorrespondente.id, 
          "Vinculação automática realizada no cadastro com base no endereço residencial."
        );
        toast.success(`Unidade vinculada automaticamente: ${ubsCorrespondente.nome}`);
      } else {
        toast.warning("Atenção: Não identificamos uma UBS de cobertura padrão para seu endereço. Você poderá atualizar seus dados no Perfil.");
      }

      toast.success("Cadastro realizado com sucesso! Bem-vindo ao AgendaUBS.");
      router.push("/painel");
    } catch (err: any) {
      const msg = err.message || "";
      // Exibe erros de unicidade vindos do backend/banco de dados inline sob o campo correspondente
      if (msg.includes("CPF")) {
        setErrors(prev => ({ ...prev, cpf: msg }));
        toast.error(msg);
      } else if (msg.includes("SUS") || msg.includes("CNS")) {
        setErrors(prev => ({ ...prev, cns: msg }));
        toast.error(msg);
      } else {
        toast.error(msg || "Falha ao processar o cadastro. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-lg shadow-black/5 bg-card/75 backdrop-blur-md max-h-[85vh] overflow-y-auto animate-in fade-in duration-300">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Criar Cartão SUS Digital</CardTitle>
        <CardDescription>
          Preencha os dados obrigatórios para criar sua conta digital e agendar seus atendimentos.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-6">
          
          {/* Seção 1: Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-border pb-1">
              Dados Pessoais e de Contato
            </h3>

            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label htmlFor="nomeCompleto" className="text-xs font-semibold text-foreground">
                Nome Completo *
              </label>
              <Input
                id="nomeCompleto"
                value={nomeCompleto}
                onChange={(e) => {
                  setNomeCompleto(e.target.value);
                  if (errors.nomeCompleto) setErrors(prev => ({ ...prev, nomeCompleto: "" }));
                }}
                placeholder="Ex: Maria Oliveira Silva"
                aria-invalid={!!errors.nomeCompleto}
                disabled={isSubmitting}
              />
              {errors.nomeCompleto && (
                <p className="text-[11px] font-semibold text-destructive mt-1">
                  {errors.nomeCompleto}
                </p>
              )}
            </div>

            {/* CPF e CNS (SUS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="cpf" className="text-xs font-semibold text-foreground">
                  CPF *
                </label>
                <InputCPF
                  id="cpf"
                  value={cpf}
                  onChange={(val) => {
                    setCpf(val);
                    if (errors.cpf) setErrors(prev => ({ ...prev, cpf: "" }));
                  }}
                  aria-invalid={!!errors.cpf}
                  disabled={isSubmitting}
                />
                {errors.cpf && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.cpf}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cns" className="text-xs font-semibold text-foreground">
                  Nº Cartão SUS *
                </label>
                <InputCNS
                  id="cns"
                  value={cns}
                  onChange={(val) => {
                    setCns(val);
                    if (errors.cns) setErrors(prev => ({ ...prev, cns: "" }));
                  }}
                  aria-invalid={!!errors.cns}
                  disabled={isSubmitting}
                />
                {errors.cns && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.cns}
                  </p>
                )}
              </div>
            </div>

            {/* Data de Nascimento e Gênero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="dataNascimento" className="text-xs font-semibold text-foreground">
                  Data de Nascimento *
                </label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => {
                    setDataNascimento(e.target.value);
                    if (errors.dataNascimento) setErrors(prev => ({ ...prev, dataNascimento: "" }));
                  }}
                  aria-invalid={!!errors.dataNascimento}
                  disabled={isSubmitting}
                />
                {errors.dataNascimento && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.dataNascimento}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="genero" className="text-xs font-semibold text-foreground">
                  Gênero *
                </label>
                <select
                  id="genero"
                  value={genero}
                  onChange={(e: any) => setGenero(e.target.value)}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  disabled={isSubmitting}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            {/* Telefone e E-mail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="telefone" className="text-xs font-semibold text-foreground">
                  Telefone / Celular *
                </label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => {
                    setTelefone(formatarTelefone(e.target.value));
                    if (errors.telefone) setErrors(prev => ({ ...prev, telefone: "" }));
                  }}
                  aria-invalid={!!errors.telefone}
                  disabled={isSubmitting}
                />
                {errors.telefone && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.telefone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground">
                  E-mail *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                  }}
                  aria-invalid={!!errors.email}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Senha e Confirmação de Senha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="senha" className="text-xs font-semibold text-foreground">
                  Senha * (mín. 6 caracteres)
                </label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="Crie uma senha"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      if (errors.senha) setErrors(prev => ({ ...prev, senha: "" }));
                    }}
                    className="pr-10"
                    aria-invalid={!!errors.senha}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    disabled={isSubmitting}
                    tabIndex={-1}
                  >
                    {showSenha ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.senha && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.senha}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmarSenha" className="text-xs font-semibold text-foreground">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <Input
                    id="confirmarSenha"
                    type={showConfirmarSenha ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      if (errors.confirmarSenha) setErrors(prev => ({ ...prev, confirmarSenha: "" }));
                    }}
                    className="pr-10"
                    aria-invalid={!!errors.confirmarSenha}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    disabled={isSubmitting}
                    tabIndex={-1}
                  >
                    {showConfirmarSenha ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.confirmarSenha && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.confirmarSenha}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Endereço */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-border pb-1">
              Endereço Residencial
            </h3>

            {/* CEP e Logradouro */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <label htmlFor="cep" className="text-xs font-semibold text-foreground">
                  CEP *
                </label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={handleCepChange}
                  aria-invalid={!!errors.cep}
                  disabled={isSubmitting}
                />
                {errors.cep && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.cep}
                  </p>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <label htmlFor="logradouro" className="text-xs font-semibold text-foreground">
                  Logradouro *
                </label>
                <Input
                  id="logradouro"
                  value={logradouro}
                  onChange={(e) => {
                    setLogradouro(e.target.value);
                    if (errors.logradouro) setErrors(prev => ({ ...prev, logradouro: "" }));
                  }}
                  placeholder="Rua, Avenida, etc."
                  aria-invalid={!!errors.logradouro}
                  disabled={isSubmitting}
                />
                {errors.logradouro && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.logradouro}
                  </p>
                )}
              </div>
            </div>

            {/* Número e Complemento */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <label htmlFor="numero" className="text-xs font-semibold text-foreground">
                  Número *
                </label>
                <Input
                  id="numero"
                  value={numero}
                  onChange={(e) => {
                    setNumero(e.target.value);
                    if (errors.numero) setErrors(prev => ({ ...prev, numero: "" }));
                  }}
                  placeholder="Nº"
                  aria-invalid={!!errors.numero}
                  disabled={isSubmitting}
                />
                {errors.numero && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.numero}
                  </p>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <label htmlFor="complemento" className="text-xs font-semibold text-foreground">
                  Complemento
                </label>
                <Input
                  id="complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, Bloco, etc. (Opcional)"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Bairro, Cidade e UF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="bairro" className="text-xs font-semibold text-foreground">
                  Bairro *
                </label>
                <Input
                  id="bairro"
                  value={bairro}
                  onChange={(e) => {
                    setBairro(e.target.value);
                    if (errors.bairro) setErrors(prev => ({ ...prev, bairro: "" }));
                  }}
                  placeholder="Ex: Centro"
                  aria-invalid={!!errors.bairro}
                  disabled={isSubmitting}
                />
                {errors.bairro && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.bairro}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cidade" className="text-xs font-semibold text-foreground">
                  Cidade *
                </label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => {
                    setCidade(e.target.value);
                    if (errors.cidade) setErrors(prev => ({ ...prev, cidade: "" }));
                  }}
                  placeholder="Ex: São Paulo"
                  aria-invalid={!!errors.cidade}
                  disabled={isSubmitting}
                />
                {errors.cidade && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.cidade}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="uf" className="text-xs font-semibold text-foreground">
                  UF *
                </label>
                <Input
                  id="uf"
                  value={uf}
                  onChange={(e) => {
                    setUf(e.target.value);
                    if (errors.uf) setErrors(prev => ({ ...prev, uf: "" }));
                  }}
                  maxLength={2}
                  placeholder="SP"
                  aria-invalid={!!errors.uf}
                  disabled={isSubmitting}
                />
                {errors.uf && (
                  <p className="text-[11px] font-semibold text-destructive mt-1">
                    {errors.uf}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border pt-4">
          <Button type="submit" className="w-full font-semibold cursor-pointer shadow-sm shadow-primary/10" disabled={isSubmitting}>
            {isSubmitting ? "Efetuando cadastro..." : "Cadastrar"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Já possui cadastro?{" "}
            <Link 
              href="/login" 
              className="text-primary font-semibold hover:underline"
            >
              Entrar na minha conta
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
