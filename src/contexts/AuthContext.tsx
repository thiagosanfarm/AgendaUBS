"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Paciente } from "@/core/domain/entities/Paciente";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { LocalStorageAuditoriaRepository } from "@/infra/api/repositories/LocalStorageAuditoriaRepository";
import { CadastrarPaciente, CadastrarPacienteInput } from "@/core/use-cases/CadastrarPaciente";
import { AutenticarPaciente } from "@/core/use-cases/AutenticarPaciente";
import { toast } from "sonner";

interface AuthContextType {
  paciente: Paciente | null;
  loading: boolean;
  autenticado: boolean;
  login: (identificador: string, senha: string, lembrar: boolean) => Promise<Paciente>;
  cadastrar: (input: CadastrarPacienteInput) => Promise<Paciente>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const pacienteRepository = new LocalStoragePacienteRepository();
const auditoriaRepository = new LocalStorageAuditoriaRepository();
const cadastrarPacienteUseCase = new CadastrarPaciente(pacienteRepository);
const autenticarPacienteUseCase = new AutenticarPaciente(pacienteRepository, auditoriaRepository);

// Tempo de expiração padrão configurado (30 minutos para sessões normais, 7 dias se "Lembrar Acesso")
const TEMPO_SESSAO_PADRAO = 30 * 60 * 1000; 
const TEMPO_SESSAO_LEMBRAR = 7 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restaura a sessão do paciente do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const idSalvo = localStorage.getItem("agendaubs_sessao_paciente_id");
      const expiracaoSalva = localStorage.getItem("agendaubs_sessao_expiracao");

      if (idSalvo && expiracaoSalva) {
        const expiracaoTimestamp = parseInt(expiracaoSalva, 10);
        
        // Verifica se a sessão expirou
        if (Date.now() > expiracaoTimestamp) {
          logout();
          toast.info("Sessão expirada por inatividade. Faça login novamente.");
          setLoading(false);
        } else {
          // Renova o tempo de sessão por inatividade se for uma sessão normal
          const ehLembrar = localStorage.getItem("agendaubs_sessao_lembrar") === "true";
          const novoTempoExp = Date.now() + (ehLembrar ? TEMPO_SESSAO_LEMBRAR : TEMPO_SESSAO_PADRAO);
          localStorage.setItem("agendaubs_sessao_expiracao", String(novoTempoExp));

          pacienteRepository
            .obterPorId(idSalvo)
            .then((dados) => {
              if (dados) setPaciente(dados);
            })
            .catch((err) => console.error("Erro ao restaurar sessão:", err))
            .finally(() => setLoading(false));
        }
      } else {
        setLoading(false);
      }
    }
  }, []);

  const login = async (identificador: string, senha: string, lembrar: boolean): Promise<Paciente> => {
    setLoading(true);
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Navegador Cliente";
      const dados = await autenticarPacienteUseCase.executar({
        identificador,
        senha,
        userAgentSimulado: ua
      });

      setPaciente(dados);

      // Configuração de tempo de sessão conforme "Lembrar Acesso"
      const tempoExpiracao = Date.now() + (lembrar ? TEMPO_SESSAO_LEMBRAR : TEMPO_SESSAO_PADRAO);
      
      localStorage.setItem("agendaubs_sessao_paciente_id", dados.id);
      localStorage.setItem("agendaubs_sessao_expiracao", String(tempoExpiracao));
      localStorage.setItem("agendaubs_sessao_lembrar", String(lembrar));

      if (lembrar) {
        localStorage.setItem("agendaubs_lembrar_usuario", identificador);
      } else {
        localStorage.removeItem("agendaubs_lembrar_usuario");
      }

      return dados;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cadastrar = async (input: CadastrarPacienteInput): Promise<Paciente> => {
    setLoading(true);
    try {
      const novoPaciente = await cadastrarPacienteUseCase.executar(input);
      setPaciente(novoPaciente);

      // Sessão de cadastro dura 30 minutos por padrão
      const tempoExpiracao = Date.now() + TEMPO_SESSAO_PADRAO;
      localStorage.setItem("agendaubs_sessao_paciente_id", novoPaciente.id);
      localStorage.setItem("agendaubs_sessao_expiracao", String(tempoExpiracao));
      localStorage.setItem("agendaubs_sessao_lembrar", "false");

      return novoPaciente;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setPaciente(null);
    localStorage.removeItem("agendaubs_sessao_paciente_id");
    localStorage.removeItem("agendaubs_sessao_expiracao");
    localStorage.removeItem("agendaubs_sessao_lembrar");
  };

  return (
    <AuthContext.Provider
      value={{
        paciente,
        loading,
        autenticado: !!paciente,
        login,
        cadastrar,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
