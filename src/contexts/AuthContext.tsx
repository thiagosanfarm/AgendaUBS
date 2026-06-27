"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Paciente } from "@/core/domain/entities/Paciente";
import { Profissional } from "@/core/domain/entities/Profissional";
import { LocalStoragePacienteRepository } from "@/infra/api/repositories/LocalStoragePacienteRepository";
import { LocalStorageAuditoriaRepository } from "@/infra/api/repositories/LocalStorageAuditoriaRepository";
import { MockProfissionalRepository } from "@/infra/api/repositories/MockProfissionalRepository";
import { CadastrarPaciente, CadastrarPacienteInput } from "@/core/use-cases/CadastrarPaciente";
import { AutenticarPaciente } from "@/core/use-cases/AutenticarPaciente";
import { AutenticarProfissional } from "@/core/use-cases/AutenticarProfissional";
import { toast } from "sonner";

interface AuthContextType {
  paciente: Paciente | null;
  profissional: Profissional | null;
  tipoUsuario: "paciente" | "profissional" | "administrador" | null;
  loading: boolean;
  autenticado: boolean;
  login: (identificador: string, senha: string, tipo: "paciente" | "profissional" | "administrador", lembrar: boolean) => Promise<any>;
  cadastrar: (input: CadastrarPacienteInput) => Promise<Paciente>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const pacienteRepository = new LocalStoragePacienteRepository();
const auditoriaRepository = new LocalStorageAuditoriaRepository();
const profissionalRepository = new MockProfissionalRepository();

const cadastrarPacienteUseCase = new CadastrarPaciente(pacienteRepository);
const autenticarPacienteUseCase = new AutenticarPaciente(pacienteRepository, auditoriaRepository);
const autenticarProfissionalUseCase = new AutenticarProfissional(profissionalRepository);

// Tempo de expiração padrão configurado
const TEMPO_SESSAO_PADRAO = 30 * 60 * 1000; 
const TEMPO_SESSAO_LEMBRAR = 7 * 24 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [tipoUsuario, setTipoUsuario] = useState<"paciente" | "profissional" | "administrador" | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restaura a sessão do usuário do localStorage ao iniciar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const idSalvo = localStorage.getItem("agendaubs_sessao_usuario_id");
      const tipoSalvo = localStorage.getItem("agendaubs_sessao_tipo") as any;
      const expiracaoSalva = localStorage.getItem("agendaubs_sessao_expiracao");

      if (idSalvo && expiracaoSalva && tipoSalvo) {
        const expiracaoTimestamp = parseInt(expiracaoSalva, 10);
        
        // Verifica se a sessão expirou
        if (Date.now() > expiracaoTimestamp) {
          logout();
          toast.info("Sessão expirada por inatividade. Faça login novamente.");
          setLoading(false);
        } else {
          // Renova o tempo de sessão por inatividade
          const ehLembrar = localStorage.getItem("agendaubs_sessao_lembrar") === "true";
          const novoTempoExp = Date.now() + (ehLembrar ? TEMPO_SESSAO_LEMBRAR : TEMPO_SESSAO_PADRAO);
          localStorage.setItem("agendaubs_sessao_expiracao", String(novoTempoExp));

          setTipoUsuario(tipoSalvo);

          if (tipoSalvo === "profissional") {
            profissionalRepository
              .obterPorId(idSalvo)
              .then((dados) => {
                if (dados) setProfissional(dados);
              })
              .catch((err) => console.error("Erro ao restaurar sessão de profissional:", err))
              .finally(() => setLoading(false));
          } else {
            pacienteRepository
              .obterPorId(idSalvo)
              .then((dados) => {
                if (dados) setPaciente(dados);
              })
              .catch((err) => console.error("Erro ao restaurar sessão de paciente:", err))
              .finally(() => setLoading(false));
          }
        }
      } else {
        setLoading(false);
      }
    }
  }, []);

  const login = async (
    identificador: string, 
    senha: string, 
    tipo: "paciente" | "profissional" | "administrador", 
    lembrar: boolean
  ): Promise<any> => {
    setLoading(true);
    try {
      if (tipo === "profissional") {
        const dados = await autenticarProfissionalUseCase.executar({
          identificador,
          senha
        });

        setProfissional(dados);
        setPaciente(null);
        setTipoUsuario("profissional");

        const tempoExpiracao = Date.now() + (lembrar ? TEMPO_SESSAO_LEMBRAR : TEMPO_SESSAO_PADRAO);
        
        localStorage.setItem("agendaubs_sessao_usuario_id", dados.id);
        localStorage.setItem("agendaubs_sessao_tipo", "profissional");
        localStorage.setItem("agendaubs_sessao_expiracao", String(tempoExpiracao));
        localStorage.setItem("agendaubs_sessao_lembrar", String(lembrar));

        if (lembrar) {
          localStorage.setItem("agendaubs_lembrar_usuario", identificador);
        } else {
          localStorage.removeItem("agendaubs_lembrar_usuario");
        }

        return dados;
      } else {
        // Paciente ou Administrador
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Navegador Cliente";
        const dados = await autenticarPacienteUseCase.executar({
          identificador,
          senha,
          userAgentSimulado: ua
        });

        // Validação de segurança: se selecionou 'administrador', a conta deve ter privilégios
        if (tipo === "administrador" && dados.papel !== "administrador") {
          throw new Error("Acesso negado. Esta conta não possui privilégios de administrador.");
        }

        setPaciente(dados);
        setProfissional(null);
        setTipoUsuario(dados.papel === "administrador" ? "administrador" : "paciente");

        const tempoExpiracao = Date.now() + (lembrar ? TEMPO_SESSAO_LEMBRAR : TEMPO_SESSAO_PADRAO);
        
        localStorage.setItem("agendaubs_sessao_usuario_id", dados.id);
        localStorage.setItem("agendaubs_sessao_tipo", dados.papel === "administrador" ? "administrador" : "paciente");
        localStorage.setItem("agendaubs_sessao_expiracao", String(tempoExpiracao));
        localStorage.setItem("agendaubs_sessao_lembrar", String(lembrar));

        if (lembrar) {
          localStorage.setItem("agendaubs_lembrar_usuario", identificador);
        } else {
          localStorage.removeItem("agendaubs_lembrar_usuario");
        }

        return dados;
      }
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
      setProfissional(null);
      setTipoUsuario("paciente");

      // Sessão de cadastro dura 30 minutos por padrão
      const tempoExpiracao = Date.now() + TEMPO_SESSAO_PADRAO;
      localStorage.setItem("agendaubs_sessao_usuario_id", novoPaciente.id);
      localStorage.setItem("agendaubs_sessao_tipo", "paciente");
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
    setProfissional(null);
    setTipoUsuario(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("agendaubs_sessao_usuario_id");
      localStorage.removeItem("agendaubs_sessao_tipo");
      localStorage.removeItem("agendaubs_sessao_expiracao");
      localStorage.removeItem("agendaubs_sessao_lembrar");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        paciente,
        profissional,
        tipoUsuario,
        loading,
        autenticado: !!paciente || !!profissional,
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
