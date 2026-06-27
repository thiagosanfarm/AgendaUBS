export interface HorarioAtendimento {
  diaSemana: string; // Ex: "Segunda-feira", "Terça-feira", etc.
  horaInicio: string; // Ex: "08:00"
  horaFim: string; // Ex: "17:00"
}

export interface Profissional {
  id: string;
  nome: string;
  registroProfissional: {
    tipo: 'CRM' | 'COREN' | 'CRO' | 'OUTRO'; // CRM (Médico), COREN (Enfermeiro), CRO (Dentista)
    numero: string;
    uf: string;
  };
  especialidade: string; // Ex: "Clínico Geral", "Pediatria", "Ginecologia", "Odontologia"
  ubsId: string; // ID da UBS onde o profissional atende
  cpf?: string;
  horariosAtendimento?: HorarioAtendimento[];
  senha?: string; // Senha para login do profissional
  email?: string; // E-mail para login do profissional
}
