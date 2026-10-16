export interface OnlineSnapshot {
  servers: Server[]
  players: number
  peakToday: number
  peakYesterday: number
  peakTodayRelativePercent: number
  peakAllTime: number
  peakAllTimeDate: string
  globalPeakAllTime: number
  globalPeakAllTimeDate: string
}

export type ServerRegion = "ru" | "en"
export type ServerProject = "majestic" | "russiaonline"
export type ServerBranch = "release"
export type ServerStatus = "online" | "offline" | "tech-works"
export type ServerCountry = "ru" | "de" | "pl"
export type ServerRegOpened = "yes" | "no"

export type ServerExtrasProject = "ro"

export interface ServerExtras {
  project?: ServerExtrasProject
  showInWebsite?: boolean
  showInLauncher?: boolean
  showInMasterlist?: boolean
  forBeginners?: boolean
  advantages?: {
    newServer?: boolean
    seasonPassMultiplier?: number
  }
}

export interface Server {
  id: string
  benefitId: string
  name: string
  branch: ServerBranch
  ip: string
  region: ServerRegion
  project: ServerProject
  country: ServerCountry

  status: boolean
  statusText: string
  techWorks: boolean
  isRegOpened: ServerRegOpened

  extras?: ServerExtras

  seasonPassMultiplier: string
  forBeginnersLauncher: boolean
  forBeginnersSite: boolean

  players: number
  activePlayers: number
  queuedPlayers: number

  peakAllTime: number
  peakAllTimeDate: string
}

interface WikiApiSuccessResponse<T> {
  status: "ok"
  message: string
  data: T
}

interface WikiApiErrorResponse {
  statusCode: number
  message: string
  error: string
}

export type WikiApiResponseDto<T = unknown> =
  | WikiApiSuccessResponse<T>
  | WikiApiErrorResponse

export function isWikiApiResponseSuccess<T>(
  data: WikiApiResponseDto<T>,
): data is WikiApiSuccessResponse<T> {
  return data !== null && "status" in data && data.status === "ok"
}
