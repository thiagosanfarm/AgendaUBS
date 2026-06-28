import { Profissional } from "@/core/domain/entities/Profissional";
import { IProfissionalRepository } from "@/core/domain/repositories/IProfissionalRepository";

const MOCK_PROFISSIONAIS: Profissional[] = [
  // ==========================================
  // UBS Centro (Foco: Consultas Médicas e Odontologia)
  // ==========================================
  {
    id: "prof-carlos",
    nome: "Dr. Carlos Silva",
    registroProfissional: { tipo: "CRM", numero: "123456", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-aline-acs",
    nome: "Aline Souza (ACS)",
    registroProfissional: { tipo: "OUTRO", numero: "789101", uf: "SE" },
    especialidade: "Agente Comunitário de Saúde",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-ana-mfc",
    nome: "Dra. Ana Souza",
    registroProfissional: { tipo: "CRM", numero: "234567", uf: "SP" },
    especialidade: "Médico de Família e Comunidade",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-pediatra-centro",
    nome: "Dr. Marcos Pedi",
    registroProfissional: { tipo: "CRM", numero: "445588", uf: "SP" },
    especialidade: "Pediatria",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-fernanda",
    nome: "Dra. Fernanda Lima",
    registroProfissional: { tipo: "CRM", numero: "345678", uf: "SP" },
    especialidade: "Ginecologia e Obstetrícia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-marcos-cardio",
    nome: "Dr. Marcos Aurélio",
    registroProfissional: { tipo: "CRM", numero: "654321", uf: "SP" },
    especialidade: "Cardiologia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-leticia-dermato",
    nome: "Dra. Letícia Neves",
    registroProfissional: { tipo: "CRM", numero: "765432", uf: "SP" },
    especialidade: "Dermatologia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-mariana-geriatra",
    nome: "Dra. Mariana Geri",
    registroProfissional: { tipo: "CRM", numero: "908172", uf: "SP" },
    especialidade: "Geriatria",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-endocrino-centro",
    nome: "Dr. Fábio Endocrino",
    registroProfissional: { tipo: "CRM", numero: "882711", uf: "SP" },
    especialidade: "Endocrinologia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-infecto-centro",
    nome: "Dr. Gabriel Infecto",
    registroProfissional: { tipo: "CRM", numero: "776655", uf: "SP" },
    especialidade: "Infectologia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-roberto",
    nome: "Dr. Roberto Santos",
    registroProfissional: { tipo: "CRO", numero: "98765", uf: "SP" },
    especialidade: "Odontologia Geral",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-bruno-odontoped",
    nome: "Dr. Bruno Henrique",
    registroProfissional: { tipo: "CRO", numero: "876543", uf: "SP" },
    especialidade: "Odontopediatria",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-carla-endod",
    nome: "Dra. Carla Endo",
    registroProfissional: { tipo: "CRO", numero: "443322", uf: "SP" },
    especialidade: "Endodontia",
    ubsId: "ubs-centro"
  },
  {
    id: "prof-mauro-cirurgia",
    nome: "Dr. Mauro Bucomaxilo",
    registroProfissional: { tipo: "CRO", numero: "112299", uf: "SP" },
    especialidade: "Cirurgia Oral Menor",
    ubsId: "ubs-centro"
  },

  // ==========================================
  // UBS Vila Nova (Foco: Enfermagem e Procedimentos)
  // ==========================================
  {
    id: "prof-joao",
    nome: "Dr. João Lima",
    registroProfissional: { tipo: "CRM", numero: "456789", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-renata-enfermagem",
    nome: "Dra. Renata Coren",
    registroProfissional: { tipo: "COREN", numero: "998877", uf: "SP" },
    especialidade: "Consulta de Enfermagem",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-beatriz-prenatal",
    nome: "Dra. Beatriz Santos",
    registroProfissional: { tipo: "COREN", numero: "332211", uf: "SP" },
    especialidade: "Acompanhamento Pré-Natal",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-lucia-vacina",
    nome: "Dra. Lúcia Imunes",
    registroProfissional: { tipo: "COREN", numero: "554466", uf: "SP" },
    especialidade: "Imunização (Vacinação)",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-marcos-curativos",
    nome: "Dr. Marcos Pele",
    registroProfissional: { tipo: "COREN", numero: "778811", uf: "SP" },
    especialidade: "Curativos",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-camila-exames",
    nome: "Dra. Camila Sangue",
    registroProfissional: { tipo: "COREN", numero: "667799", uf: "SP" },
    especialidade: "Coleta de Exames",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-daniela-rapidos",
    nome: "Dra. Daniela Testes",
    registroProfissional: { tipo: "COREN", numero: "889911", uf: "SP" },
    especialidade: "Testes Rápidos (HIV, Sífilis, Hepatites)",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-sofia-pueri",
    nome: "Dra. Sofia Bebes",
    registroProfissional: { tipo: "COREN", numero: "445588", uf: "SP" },
    especialidade: "Puericultura",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-julio-hiperdia",
    nome: "Dr. Júlio Crônicos",
    registroProfissional: { tipo: "COREN", numero: "112288", uf: "SP" },
    especialidade: "Hiperdia (Hipertensão e Diabetes)",
    ubsId: "ubs-vila-nova"
  },
  {
    id: "prof-marcelo-psiquiatra",
    nome: "Dr. Marcelo Dias",
    registroProfissional: { tipo: "CRM", numero: "112244", uf: "SP" },
    especialidade: "Psiquiatria",
    ubsId: "ubs-vila-nova"
  },

  // ==========================================
  // UBS Jardim das Flores (Foco: Equipe Multiprofissional - Parte A)
  // ==========================================
  {
    id: "prof-juliana",
    nome: "Dra. Juliana Rocha",
    registroProfissional: { tipo: "CRM", numero: "678901", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-patricia-psicoclinica",
    nome: "Dra. Patrícia Costa",
    registroProfissional: { tipo: "OUTRO", numero: "56789", uf: "SP" }, // CRP Simulado
    especialidade: "Psicologia Clínica",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-sofia-psicoinfantil",
    nome: "Dra. Sofia Ramos",
    registroProfissional: { tipo: "OUTRO", numero: "66778", uf: "SP" },
    especialidade: "Psicologia Infantil",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-lucio-grupo",
    nome: "Dr. Lúcio Coletivo",
    registroProfissional: { tipo: "OUTRO", numero: "99182", uf: "SP" },
    especialidade: "Atendimento em Grupo",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-helio-nutri",
    nome: "Dr. Hélio Prato",
    registroProfissional: { tipo: "OUTRO", numero: "22339", uf: "SP" }, // CRN Simulado
    especialidade: "Consulta Nutricional",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-rebeca-reeducacao",
    nome: "Dra. Rebeca Alimentar",
    registroProfissional: { tipo: "OUTRO", numero: "33441", uf: "SP" },
    especialidade: "Reeducação Alimentar",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-amanda-farmacia",
    nome: "Dra. Amanda Remédios",
    registroProfissional: { tipo: "OUTRO", numero: "99881", uf: "SP" }, // CRF Simulado
    especialidade: "Atenção Farmacêutica",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-fabio-farmacodinamica",
    nome: "Dr. Fábio Bula",
    registroProfissional: { tipo: "OUTRO", numero: "88771", uf: "SP" },
    especialidade: "Orientação sobre Uso Correto de Medicamentos",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-andre-social",
    nome: "Dr. André Silva",
    registroProfissional: { tipo: "OUTRO", numero: "88990", uf: "SP" }, // CRESS Simulado
    especialidade: "Atendimento Social",
    ubsId: "ubs-jardim-flores"
  },
  {
    id: "prof-teresa-beneficios",
    nome: "Dra. Teresa Cidadania",
    registroProfissional: { tipo: "OUTRO", numero: "77661", uf: "SP" },
    especialidade: "Encaminhamento para Benefícios",
    ubsId: "ubs-jardim-flores"
  },

  // ==========================================
  // UBS Parque das Nações (Foco: Equipe Multiprofissional - Parte B)
  // ==========================================
  {
    id: "prof-ricardo",
    nome: "Dr. Ricardo Souza",
    registroProfissional: { tipo: "CRM", numero: "789012", uf: "SP" },
    especialidade: "Clínico Geral",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-rodrigo-ortopedica",
    nome: "Dr. Rodrigo Fisio",
    registroProfissional: { tipo: "OUTRO", numero: "11998", uf: "SP" }, // CREFITO Simulado
    especialidade: "Fisioterapia Ortopédica",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-isabela-neurologica",
    nome: "Dra. Isabela Cruz",
    registroProfissional: { tipo: "OUTRO", numero: "22881", uf: "SP" },
    especialidade: "Fisioterapia Neurológica",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-marcio-educador",
    nome: "Dr. Márcio Fitness",
    registroProfissional: { tipo: "OUTRO", numero: "44991", uf: "SP" }, // CREF Simulado
    especialidade: "Avaliação Física",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-silvana-caminhada",
    nome: "Dra. Silvana Passos",
    registroProfissional: { tipo: "OUTRO", numero: "55112", uf: "SP" },
    especialidade: "Grupos de Caminhada",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-caroline-fono",
    nome: "Dra. Caroline Voz",
    registroProfissional: { tipo: "OUTRO", numero: "88221", uf: "SP" }, // CREFONO Simulado
    especialidade: "Avaliação da Fala",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-danilo-linguagem",
    nome: "Dr. Danilo Fala",
    registroProfissional: { tipo: "OUTRO", numero: "99332", uf: "SP" },
    especialidade: "Linguagem Infantil",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-beatriz-to",
    nome: "Dra. Beatriz Ocupação",
    registroProfissional: { tipo: "OUTRO", numero: "11223", uf: "SP" }, // CREFITO TO Simulado
    especialidade: "Desenvolvimento Infantil",
    ubsId: "ubs-parque-nacoes"
  },
  {
    id: "prof-tiago-cognitiva",
    nome: "Dr. Tiago Mente",
    registroProfissional: { tipo: "OUTRO", numero: "22334", uf: "SP" },
    especialidade: "Estimulação Cognitiva",
    ubsId: "ubs-parque-nacoes"
  }
];

const KEY = "agendaubs_profissionais";

const obterListaProfissionais = (): Profissional[] => {
  if (typeof window === "undefined") {
    return MOCK_PROFISSIONAIS;
  }
  const saved = localStorage.getItem(KEY);
  if (!saved) {
    localStorage.setItem(KEY, JSON.stringify(MOCK_PROFISSIONAIS));
    return MOCK_PROFISSIONAIS;
  }
  try {
    return JSON.parse(saved);
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
