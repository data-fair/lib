export type UiNotif = UiNotifBase | UiNotifError

export interface PartialUiNotif {
  type?: 'default' | 'info' | 'success' | 'warning' | 'error'
  msg: string
  error?: any
  errorMsg?: string
}

interface UiNotifBase {
  type?: 'default' | 'info' | 'success' | 'warning'
  msg: string
}

interface UiNotifError {
  type: 'error'
  msg: string
  error: any
  errorMsg: string
}
