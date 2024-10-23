export type ChalInfo = {
  ctf: string
  title: string
  author: string
  description: string
  cats: (
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
  )[]
  numSolves: number
  numPoints: number
  attachments: { name: string; url: string }[]
  sourceUrl: string
  datePosted: string
}
