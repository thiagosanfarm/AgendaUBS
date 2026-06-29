import { Paciente } from "@/core/domain/entities/Paciente";
import { IPacienteRepository } from "@/core/domain/repositories/IPacienteRepository";

const LOCAL_STORAGE_KEY = "agendaubs_pacientes";

export class LocalStoragePacienteRepository implements IPacienteRepository {
  private obterTodos(): Paciente[] {
    if (typeof window === "undefined") return [];
    
    const resetKey = "agendaubs_pacientes_reset_v3";
    const hasReset = localStorage.getItem(resetKey);
    
    const pacientesSeed: Paciente[] = [
      {
        id: "paciente-maria-teste",
        nomeCompleto: "Maria Teste",
        cpf: "123.456.789-09",
        cns: "200000000000003",
        dataNascimento: "1990-05-15",
        email: "paciente@agendaubs.local",
        telefone: "(11) 99999-9999",
        genero: "feminino",
        endereco: {
          cep: "01001-000",
          logradouro: "Praça da Sé",
          numero: "100",
          complemento: "",
          bairro: "Sé",
          cidade: "São Paulo",
          uf: "SP"
        },
        senha: "Teste@123",
        dataCriacao: new Date().toISOString(),
        papel: "paciente"
      },
      {
        id: "gestor-ubs-teste",
        nomeCompleto: "Gestor UBS Teste",
        cpf: "987.654.321-26",
        cns: "100000000000007",
        dataNascimento: "1980-10-20",
        email: "gestor@agendaubs.local",
        telefone: "(11) 98888-8888",
        genero: "masculino",
        endereco: {
          cep: "01001-000",
          logradouro: "Praça da Sé",
          numero: "100",
          complemento: "",
          bairro: "Sé",
          cidade: "São Paulo",
          uf: "SP"
        },
        senha: "Teste@123",
        dataCriacao: new Date().toISOString(),
        papel: "administrador",
        ubsId: "ubs-centro"
      }
    ];

    if (!hasReset) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pacientesSeed));
      localStorage.setItem(resetKey, "true");
      return pacientesSeed;
    }

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

  async obterPorEmail(email: string): Promise<Paciente | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const cleanEmail = email.trim().toLowerCase();
    const pacientes = this.obterTodos();
    const paciente = pacientes.find(p => p.email.trim().toLowerCase() === cleanEmail);
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

  async listarTodos(): Promise<Paciente[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.obterTodos();
  }
}
