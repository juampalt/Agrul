import {
  NotificadorStockAlertasPort,
  AlertaReposicionStockPayload,
} from '../../core/ports/notificador-stock-alertas.port.js';

export class NotificadorStockAlertasService implements NotificadorStockAlertasPort {
  private alertasEnviadas: AlertaReposicionStockPayload[] = [];

  public async notificarAlertaReposicion(
    payload: AlertaReposicionStockPayload
  ): Promise<{ enviado: boolean; destinatarios: string[] }> {
    const destinatarios =
      payload.destinatarios && payload.destinatarios.length > 0
        ? payload.destinatarios
        : ['responsable.stock@agrul.local', 'compras@agrul.local'];

    this.alertasEnviadas.push({ ...payload, destinatarios });

    return {
      enviado: true,
      destinatarios,
    };
  }

  public getAlertasEnviadas(): AlertaReposicionStockPayload[] {
    return [...this.alertasEnviadas];
  }

  public limpiar(): void {
    this.alertasEnviadas = [];
  }
}
