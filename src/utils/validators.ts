/**
 * Valida se um número de CPF é válido de acordo com o algoritmo oficial.
 */
export function validarCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) return false;

  // Elimina CPFs conhecidos inválidos
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Valida primeiro dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;

  if (digitoVerificador1 !== parseInt(cleanCPF.charAt(9))) return false;

  // Valida segundo dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;

  return digitoVerificador2 === parseInt(cleanCPF.charAt(10));
}


/**
 * Valida o Cartão Nacional de Saúde (CNS / Cartão do SUS).
 * O CNS é composto por 15 dígitos numéricos e segue um algoritmo de validação
 * baseado em pesos de 15 a 1 com verificação de resto de divisão por 11.
 */
export function validarCNS(cns: string): boolean {
  const cleanCNS = cns.replace(/\D/g, '');

  if (cleanCNS.length !== 15) return false;

  // CNSs válidos começam com 1, 2, 7, 8 ou 9
  const primeiroDigito = cleanCNS.charAt(0);
  if (!['1', '2', '7', '8', '9'].includes(primeiroDigito)) return false;

  // Validação geral por pesos (peso 15 para o 1º dígito, até peso 1 para o 15º dígito)
  // A soma ponderada dos 15 dígitos deve ser um múltiplo de 11.
  let soma = 0;
  for (let i = 0; i < 15; i++) {
    soma += parseInt(cleanCNS.charAt(i)) * (15 - i);
  }

  return soma % 11 === 0;
}

/**
 * Valida se um e-mail possui formato básico válido.
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida telefone brasileiro (celular ou fixo) com DDD.
 * Suporta formatos: 10 dígitos (fixo) ou 11 dígitos (celular).
 */
export function validarTelefone(telefone: string): boolean {
  const cleanTelefone = telefone.replace(/\D/g, '');
  // DDD + 8 dígitos (fixo) ou DDD + 9 dígitos (celular)
  return cleanTelefone.length === 10 || cleanTelefone.length === 11;
}
