export enum PlanStatus {
  DRAFT = 'BORRADOR',
  PENDING = 'PENDIENTE',
  APPROVED = 'APROBADO',
  REJECTED = 'RECHAZADO',
  IN_PROGRESS = 'EN_EJECUCION',
  CLOSED = 'CERRADO',
}
export enum HarvestScenario {
  PROJECTED = 'PROYECTADA',
  PLUS_10 = '+10',
  PLUS_20 = '+20',
  MINUS_10 = '-10',
}
export enum HourAdjustmentReason {
  VOLUME_CHANGE = 'CAMBIO_VOLUMEN',
  PRESENT_STAFF = 'PERSONAL_PRESENTE',
}
