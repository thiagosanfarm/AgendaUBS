import { Profissional } from "@/core/domain/entities/Profissional";
import { IProfissionalRepository } from "@/core/domain/repositories/IProfissionalRepository";

const MOCK_PROFISSIONAIS: Profissional[] = [
  {
    id: "prof-joao-teste",
    nome: "Dr. João Teste",
    registroProfissional: { tipo: "CRM", numero: "999999", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-centro",
    cpf: "345.678.901-75",
    email: "profissional@agendaubs.local",
    senha: "Teste@123"
  },
  {
    id: "prof-ana-acs-teste",
    nome: "Ana ACS Teste",
    registroProfissional: { tipo: "OUTRO", numero: "888888", uf: "SP" },
    especialidade: "Agente Comunitário de Saúde",
    ubsId: "ubs-centro",
    cpf: "345.678.901-75",
    email: "acs@agendaubs.local",
    senha: "Teste@123"
  }
];

const KEY = "agendaubs_profissionais";

const obterListaProfissionais = (): Profissional[] => {
  if (typeof window === "undefined") {
    return MOCK_PROFISSIONAIS;
  }
  const resetKey = "agendaubs_profissionais_reset_v3";
  const hasReset = localStorage.getItem(resetKey);
  if (!hasReset) {
    localStorage.setItem(KEY, JSON.stringify(MOCK_PROFISSIONAIS));
    localStorage.setItem(resetKey, "true");
    return MOCK_PROFISSIONAIS;
  }
  const saved = localStorage.getItem(KEY);
  if (!saved) {
    localStorage.setItem(KEY, JSON.stringify(MOCK_PROFISSIONAIS));
    return MOCK_PROFISSIONAIS;
  }
  try {
    const lista = JSON.parse(saved) as Profissional[];
    return lista;
  } catch {
    return MOCK_PROFISSIONAIS;
  }
};

const salvarListaProfissionais = (lista: Profissional[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(lista));
  }
};

export class MockProfissionalRepository implements IProfissionalRepository {
  async obterPorId(id: string): Promise<Profissional | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const lista = obterListaProfissionais();
    const profissional = lista.find(p => p.id === id);
    return profissional || null;
  }

  async listarPorUbs(ubsId: string): Promise<Profissional[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const lista = obterListaProfissionais();
    return lista.filter(p => p.ubsId === ubsId);
  }

  async listarPorUbsEEspecialidade(ubsId: string, especialidade: string): Promise<Profissional[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const lista = obterListaProfissionais();
    return lista.filter(p => p.ubsId === ubsId && p.especialidade === especialidade);
  }

  async listarEspecialidadesDisponiveis(ubsId: string): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const lista = obterListaProfissionais();
    const profissionaisDaUbs = lista.filter(p => p.ubsId === ubsId);
    const especialidades = profissionaisDaUbs.map(p => p.especialidade);
    return Array.from(new Set(especialidades));
  }

  async cadastrar(profissional: Profissional): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const lista = obterListaProfissionais();
    lista.push(profissional);
    salvarListaProfissionais(lista);
  }

  async obterPorCpfOuRegistro(cpf?: string, registro?: string): Promise<Profissional | null> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const lista = obterListaProfissionais();
    const prof = lista.find(p => {
      const bateCpf = cpf && p.cpf === cpf;
      const bateReg = registro && p.registroProfissional.numero === registro;
      return bateCpf || bateReg;
    });
    return prof || null;
  }

  async obterPorIdentificador(identificador: string): Promise<Profissional | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const lista = obterListaProfissionais();
    const limpo = identificador.replace(/\D/g, ""); // Remove pontos/traços para CPF
    
    const prof = lista.find(p => {
      const bateCpf = limpo && p.cpf && p.cpf.replace(/\D/g, "") === limpo;
      const bateReg = p.registroProfissional.numero === identificador;
      
      // Gera e-mail fictício caso o profissional mockado não o tenha explicitamente
      const emailPadrao = `${p.nome.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@sus.gov.br`;
      const bateEmail = p.email 
        ? p.email.toLowerCase() === identificador.toLowerCase()
        : emailPadrao === identificador.toLowerCase();
        
      return bateCpf || bateReg || bateEmail;
    });
    return prof || null;
  }
}
