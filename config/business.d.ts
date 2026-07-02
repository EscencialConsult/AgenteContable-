export interface Option {
  value: string
  label: string
}

export interface CategoriaLabelRecord {
  [key: string]: string
}

export interface ConditionMapRecord {
  [key: string]: string
}

export interface CategoryMapRecord {
  [key: string]: string
}

export interface ValidacionConfig {
  ANIOS_MAX: number
  IVA_DIFF_THRESHOLD: number
  IMPORTE_ELEVADO: number
  CAE_LENGTH: number
}

export const CATEGORIA_LABELS: CategoriaLabelRecord
export const CATEGORIA_OPTIONS: Option[]
export const ESTADO_OPTIONS: Option[]
export const TIPO_OPTIONS: Option[]
export const CONDITION_MAP: ConditionMapRecord
export const CATEGORY_MAP: CategoryMapRecord
export const ALICUOTAS: string[]
export const ALICUOTA_TOLERANCE: number
export const VALIDACION: ValidacionConfig
