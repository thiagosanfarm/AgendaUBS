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
import { validarCPF, validarCNS, validarEmail } from "@/utils/validators";

export default function CadastroPage() {
  const router = useRouter();
  const { cadastrar } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dos campos
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [cns, setCns] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [genero, setGenero] = useState<"masculino" | "feminino" | "outro">("masculino");
  
  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = formatarCEP(e.target.value);
    setCep(formattedCep);

    // Busca automática por CEP via API ViaCEP
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
          toast.success("Endereço autocompletado com sucesso!");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações locais
    if (nomeCompleto.trim().split(" ").length < 2) {
      toast.error("Por favor, insira seu nome completo (nome e sobrenome).");
      return;
    }

    if (!validarCPF(cpf)) {
      toast.error("CPF inválido.");
      return;
    }

    if (!validarCNS(cns)) {
      toast.error("Cartão Nacional de Saúde (CNS) inválido.");
      return;
    }

    if (!validarEmail(email)) {
      toast.error("E-mail inválido.");
      return;
    }

    if (!dataNascimento) {
      toast.error("Data de nascimento é obrigatória.");
      return;
    }

    if (!cep || !logradouro || !numero || !bairro || !cidade || !uf) {
      toast.error("Por favor, preencha todos os campos obrigatórios de endereço.");
      return;
    }

    setIsSubmitting(true);

    try {
      await cadastrar({
        nomeCompleto,
        cpf,
        cns,
        dataNascimento,
        email,
        telefone,
        genero,
        endereco: {
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
        },
      });

      toast.success("Cadastro realizado com sucesso!");
      router.push("/painel");
    } catch (err: any) {
      toast.error(err.message || "Erro ao realizar cadastro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border shadow-lg shadow-black/5 bg-card/75 backdrop-blur-md max-h-[85vh] overflow-y-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Criar Conta Digital SUS</CardTitle>
        <CardDescription>
          Faça seu cadastro para começar a agendar consultas e exames de forma simples e digital.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Seção 1: Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
              Dados Pessoais
            </h3>

            <div className="space-y-2">
              <label htmlFor="nomeCompleto" className="text-xs font-semibold text-foreground">
                Nome Completo *
              </label>
              <Input
                id="nomeCompleto"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Ex: Maria Oliveira Silva"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="cpf" className="text-xs font-semibold text-foreground">
                  CPF *
                </label>
                <InputCPF
                  id="cpf"
                  value={cpf}
                  onChange={setCpf}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="cns" className="text-xs font-semibold text-foreground">
                  Nº Cartão SUS *
                </label>
                <InputCNS
                  id="cns"
                  value={cns}
                  onChange={setCns}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="dataNascimento" className="text-xs font-semibold text-foreground">
                  Data de Nascimento *
                </label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="genero" className="text-xs font-semibold text-foreground">
                  Gênero *
                </label>
                <select
                  id="genero"
                  value={genero}
                  onChange={(e: any) => setGenero(e.target.value)}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring"
                  required
                  disabled={isSubmitting}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="telefone" className="text-xs font-semibold text-foreground">
                  Celular/Telefone
                </label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold text-foreground">
                  E-mail *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Endereço */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
              Endereço Residencial
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-2">
                <label htmlFor="cep" className="text-xs font-semibold text-foreground">
                  CEP *
                </label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={handleCepChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label htmlFor="logradouro" className="text-xs font-semibold text-foreground">
                  Logradouro (Rua, Av.) *
                </label>
                <Input
                  id="logradouro"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Nome da rua ou avenida"
                  required
                  disabled={isSubmitting}
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
                  placeholder="Nº"
                  required
                  disabled={isSubmitting}
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
                  placeholder="Apt, Bloco, etc."
                  disabled={isSubmitting}
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
                  required
                  disabled={isSubmitting}
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
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="uf" className="text-xs font-semibold text-foreground">
                  UF *
                </label>
                <Input
                  id="uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  maxLength={2}
                  placeholder="SP"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border pt-4">
          <Button type="submit" className="w-full font-semibold cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? "Cadastrando..." : "Confirmar Cadastro"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Já possui cadastro?{" "}
            <Link 
              href="/login" 
              className="text-primary font-semibold hover:underline"
            >
              Fazer Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
