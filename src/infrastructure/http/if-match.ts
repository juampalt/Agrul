import { FastifyRequest } from 'fastify';

/** `If-Match` con el `actualizadoEn` leído (con o sin comillas); `*` o ausente no exige versión. */
export function versionEsperada(req: FastifyRequest): string | undefined {
  const valor = req.headers['if-match'];
  const texto = (Array.isArray(valor) ? valor[0] : valor)?.trim().replace(/^W\//, '').replace(/^"|"$/g, '');
  return texto && texto !== '*' ? texto : undefined;
}
