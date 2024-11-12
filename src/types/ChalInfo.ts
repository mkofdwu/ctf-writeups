export type ChalCat =
  | 'web'
  | 'misc'
  | 'crypto'
  | 'pwn'
  | 'rev'
  | 'forensics'
  | 'osint'
  | 'hardware'
  | 'mobile'
  | 'cloud'
  | 'blockchain'

export type ChalInfo = {
  ctf: string
  title: string
  author: string
  description: string
  cats: ChalCat[]
  numSolves: number
  numPoints: number
  attachments: { name: string; url: string }[]
  sourceUrl: string
  datePosted: string
}
