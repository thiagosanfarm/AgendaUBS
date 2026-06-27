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
}
