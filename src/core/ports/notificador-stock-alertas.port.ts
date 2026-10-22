export interface AlertaReposicionStockPayload {
  insumoId: string;
  nombreComercial: string;
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  nivelAlerta: 'CRITICO' | 'BAJO' | 'NORMAL';
  unidadMedida: string;
  fecha: string;
  destinatarios?: string[];
}

export interface NotificadorStockAlertasPort {
  notificarAlertaReposicion(
    payload: AlertaReposicionStockPayload
  ): Promise<{ enviado: boolean; destinatarios: string[] }>;
}
