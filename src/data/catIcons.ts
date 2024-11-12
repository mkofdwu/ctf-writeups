import type { ChalCat } from '@/types/ChalInfo'

export const catIcons: { [k in ChalCat]: string } = {
  web: 'language',
  pwn: 'bug_report',
  rev: 'keyboard_double_arrow_left',
  misc: 'help',
  forensics: 'quick_reference_all',
  crypto: 'key',
  mobile: 'phone_android',
  cloud: 'cloud',
  osint: 'visibility',
  blockchain: 'currency_bitcoin',
  hardware: 'memory'
}
