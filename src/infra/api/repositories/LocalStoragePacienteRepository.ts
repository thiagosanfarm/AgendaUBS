import { Paciente } from "@/core/domain/entities/Paciente";
import { IPacienteRepository } from "@/core/domain/repositories/IPacienteRepository";

const LOCAL_STORAGE_KEY = "agendaubs_pacientes";

export class LocalStoragePacienteRepository implements IPacienteRepository {
  private obterTodos(): Paciente[] {
    if (typeof window === "undefined") return [];
    const dados = localStorage.getItem(LOCAL_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  private salvarTodos(pacientes: Paciente[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pacientes));
  }

  async obterPorId(id: string): Promise<Paciente | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const pacientes = this.obterTodos();
    const paciente = pacientes.find(p => p.id === id);
    return paciente || null;
  }

  async obterPorCpf(cpf: string): Promise<Paciente | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const cleanCpf = cpf.replace(/\D/g, "");
    const pacientes = this.obterTodos();
    const paciente = pacientes.find(p => p.cpf.replace(/\D/g, "") === cleanCpf);
    return paciente || null;
  }

  async obterPorCns(cns: string): Promise<Paciente | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const cleanCns = cns.replace(/\D/g, "");
    const pacientes = this.obterTodos();
    const paciente = pacientes.find(p => p.cns.replace(/\D/g, "") === cleanCns);
    return paciente || null;
  }

  async salvar(paciente: Paciente): Promise<Paciente> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const pacientes = this.obterTodos();
    
    // Verifica se já existe para evitar duplicatas
    const index = pacientes.findIndex(p => p.id === paciente.id);
    if (index >= 0) {
      pacientes[index] = paciente;
    } else {
      pacientes.push(paciente);
    }
    
    this.salvarTodos(pacientes);
    return paciente;
  }

  async atualizar(paciente: Paciente): Promise<Paciente> {
    return this.salvar(paciente);
  }
}
