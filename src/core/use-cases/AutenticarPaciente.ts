import { Paciente } from "../domain/entities/Paciente";
import { IPacienteRepository } from "../domain/repositories/IPacienteRepository";
import { IAuditoriaRepository } from "../domain/repositories/IAuditoriaRepository";
import { validarCPF, validarEmail } from "@/utils/validators";

export interface AutenticarPacienteInput {
  identificador: string; // CPF ou E-mail
  senha: string;
  userAgentSimulado?: string;
}

export class AutenticarPaciente {
  constructor(
    private pacienteRepository: IPacienteRepository,
    private auditoriaRepository: IAuditoriaRepository
  ) {}

  async executar(input: AutenticarPacienteInput): Promise<Paciente> {
    const ident = input.identificador.trim();
    const ua = input.userAgentSimulado || "Desconhecido";
    
    // 1. Validações básicas de preenchimento
    if (!ident) {
      throw new Error("Identificador (CPF ou E-mail) é obrigatório.");
    }
    if (!input.senha) {
      throw new Error("Senha é obrigatória.");
    }

    let paciente: Paciente | null = null;
    const ehEmail = ident.includes("@");

    // 2. Busca pelo CPF ou E-mail
    if (ehEmail) {
      if (validarEmail(ident)) {
        paciente = await this.pacienteRepository.obterPorEmail(ident);
      }
    } else {
      const cleanCpf = ident.replace(/\D/g, "");
      if (cleanCpf.length === 11 && validarCPF(cleanCpf)) {
        paciente = await this.pacienteRepository.obterPorCpf(cleanCpf);
      }
    }

    // 3. Verificação de credenciais e registro de auditoria
    if (!paciente || paciente.senha !== input.senha) {
      // Registra falha na auditoria
      await this.auditoriaRepository.registrarTentativaLogin({
        identificador: ident,
        sucesso: false,
        ipSimulado: "192.168.0.1", // Simulação de IP local do cliente
        userAgentSimulado: ua
      });

      // Erro genérico para segurança (Critério R004)
      throw new Error("Usuário ou senha incorretos.");
    }

    // Registra sucesso na auditoria
    await this.auditoriaRepository.registrarTentativaLogin({
      identificador: ident,
      sucesso: true,
      ipSimulado: "192.168.0.1",
      userAgentSimulado: ua
    });

    return paciente;
  }
}
