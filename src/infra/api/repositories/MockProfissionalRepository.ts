import { Profissional } from "@/core/domain/entities/Profissional";
import { IProfissionalRepository } from "@/core/domain/repositories/IProfissionalRepository";

const MOCK_PROFISSIONAIS: Profissional[] = [
  // UBS Centro
  {
    id: "prof-carlos",
    nome: "Dr. Carlos Silva",
    registroProfissional: { tipo: "CRM", numero: "123456", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-ana",
    nome: "Dra. Ana Souza",
    registroProfissional: { tipo: "CRM", numero: "234567", uf: "SP" },
    especialidade: "Pediatria",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-fernanda",
    nome: "Dra. Fernanda Lima",
    registroProfissional: { tipo: "CRM", numero: "345678", uf: "SP" },
    especialidade: "Ginecologia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-roberto",
    nome: "Dr. Roberto Santos",
    registroProfissional: { tipo: "CRO", numero: "98765", uf: "SP" },
    especialidade: "Odontologia",
    ubsId: "ubs-centro"
  },

  // UBS Vila Nova
  {
    id: "prof-joao",
    nome: "Dr. João Lima",
    registroProfissional: { tipo: "CRM", numero: "456789", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-patricia",
    nome: "Dra. Patrícia Costa",
    registroProfissional: { tipo: "CRM", numero: "567890", uf: "SP" },
    especialidade: "Pediatria",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-lucas",
    nome: "Dr. Lucas Oliveira",
    registroProfissional: { tipo: "CRO", numero: "87654", uf: "SP" },
    especialidade: "Odontologia",
    ubsId: "ubs-vila-nova"
  },

  // UBS Jardim das Flores
  {
    id: "prof-juliana",
    nome: "Dra. Juliana Rocha",
    registroProfissional: { tipo: "CRM", numero: "678901", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-camila",
    nome: "Dra. Camila Santos",
    registroProfissional: { tipo: "COREN", numero: "112233", uf: "SP" },
    especialidade: "Enfermagem",
    ubsId: "ubs-jardim-flores"
  },

  // UBS Parque das Nações
  {
    id: "prof-ricardo",
    nome: "Dr. Ricardo Souza",
    registroProfissional: { tipo: "CRM", numero: "789012", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-aline",
    nome: "Dra. Aline Ferreira",
    registroProfissional: { tipo: "CRM", numero: "890123", uf: "SP" },
    especialidade: "Ginecologia",
    ubsId: "ubs-parque-nacoes"
  }
];

export class MockProfissionalRepository implements IProfissionalRepository {
  async obterPorId(id: string): Promise<Profissional | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const profissional = MOCK_PROFISSIONAIS.find(p => p.id === id);
    return profissional || null;
  }

  async listarPorUbs(ubsId: string): Promise<Profissional[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_PROFISSIONAIS.filter(p => p.ubsId === ubsId);
  }

  async listarPorUbsEEspecialidade(ubsId: string, especialidade: string): Promise<Profissional[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_PROFISSIONAIS.filter(p => p.ubsId === ubsId && p.especialidade === especialidade);
  }

  async listarEspecialidadesDisponiveis(ubsId: string): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const profissionaisDaUbs = MOCK_PROFISSIONAIS.filter(p => p.ubsId === ubsId);
    const especialidades = profissionaisDaUbs.map(p => p.especialidade);
    // Remove duplicatas
    return Array.from(new Set(especialidades));
  }
}
