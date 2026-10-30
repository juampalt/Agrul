/** Normaliza timestamps de PostgreSQL («2026-10-30 19:00:00.123+00») y ISO a milisegundos. */
function aMilisegundos(valor: string): number {
  const iso = valor.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return Date.parse(iso);
}

export function mismaVersion(esperada: string, actual: string): boolean {
  const a = aMilisegundos(esperada);
  return Number.isFinite(a) && a === aMilisegundos(actual);
}
