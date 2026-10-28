import crypto from 'node:crypto';
import { SesionesRepositoryPort } from '../../core/ports/sesiones-repository.port.js';
import { AuditoriaSeguridadRepositoryPort } from '../../core/ports/auditoria-seguridad-repository.port.js';
import { UsuariosTransaccionPort } from '../../core/ports/usuarios-transaccion.port.js';
import { AuditoriaSeguridadLog } from '../../core/domain/entities/auditoria-seguridad-log.entity.js';
import { CryptoAuthService, TokenPayload } from '../../infrastructure/services/crypto-auth.service.js';

export class CerrarSesionUseCase {
  constructor(private readonly sesiones: SesionesRepositoryPort, private readonly auditoria: AuditoriaSeguridadRepositoryPort,
    private readonly transaccion?: UsuariosTransaccionPort) {}

  async execute(token: string, payload: TokenPayload): Promise<void> {
    if (this.transaccion) return this.transaccion.ejecutar([payload.sub], async repos => {
      if (!repos.sesionesRepo) throw new Error('Repositorio de sesiones no configurado.');
      await new CerrarSesionUseCase(repos.sesionesRepo, repos.auditoriaRepo).execute(token, payload);
    });
    if (!await this.sesiones.cerrar(CryptoAuthService.hashToken(token), payload.sub)) return;
    await this.auditoria.registrar(AuditoriaSeguridadLog.crear({ id: crypto.randomUUID(), usuarioId: payload.sub,
      usuarioEmail: payload.email, accion: 'LOGOUT', entidad: 'SESION', entidadId: payload.jti ?? null }));
  }
}
