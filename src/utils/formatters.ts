/**
 * Formata uma string numérica em formato de CPF: 000.000.000-00
 */
export function formatarCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

/**
 * Formata uma string numérica em formato de Cartão Nacional de Saúde (CNS): 000 0000 0000 0000
 */
export function formatarCNS(cns: string): string {
  const clean = cns.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 7) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  if (clean.length <= 11) return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 11)} ${clean.slice(11, 15)}`;
}

/**
 * Formata telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatarTelefone(telefone: string): string {
  const clean = telefone.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

/**
 * Formata CEP: 00000-000
 */
export function formatarCEP(cep: string): string {
  const clean = cep.replace(/\D/g, '');
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

/**
 * Formata data de YYYY-MM-DD para DD/MM/YYYY
 */
export function formatarDataBr(dataIso: string): string {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/**
 * Formata data de Date para YYYY-MM-DD (formato de input do tipo date)
 */
export function formatarDataIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
