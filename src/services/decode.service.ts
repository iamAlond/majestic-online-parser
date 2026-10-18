import type {
	OnlineSnapshot,
	Server,
	ServerBranch,
	ServerCountry,
	ServerExtras,
	ServerProject,
	ServerRegion,
	ServerRegOpened,
	ServerStatus
} from '../types/index.js'

const DEFAULT_FALLBACK_DATE = '2023-07-07T00:00:00.000Z'

export class DecodeService {
	public decodeSnapshot(wire: any, projectType: ServerProject): OnlineSnapshot {
		if (!wire) return this.createEmptySnapshot()

		const rawServers = Array.isArray(wire.servers) ? wire.servers : []
		const decodedServers: Server[] = rawServers.map((s: any) => this.decodeServer(s, projectType))
		const servers = this.sortServers(decodedServers)

		const players = Number(wire.players ?? 0)
		const peakToday = Number(wire.peakToday ?? 0)
		const peakYesterday = Number(wire.peakYesterday ?? 0)
		const peakTodayRelativePercent = Number(wire.peakTodayRelativePercent ?? 0)
		const peakAllTime = Number(wire.peakAllTime ?? 0)
		const peakAllTimeDate = wire.peakAllTimeDate ?? DEFAULT_FALLBACK_DATE
		const globalPeakAllTime = Number(wire.globalPeakAllTime ?? 0)
		const globalPeakAllTimeDate = wire.globalPeakAllTimeDate ?? DEFAULT_FALLBACK_DATE

		return {
			servers: servers,
			players: players,
			peakToday: peakToday,
			peakYesterday: peakYesterday,
			peakTodayRelativePercent: peakTodayRelativePercent,
			peakAllTime: peakAllTime,
			peakAllTimeDate: peakAllTimeDate,
			globalPeakAllTime: globalPeakAllTime,
			globalPeakAllTimeDate: globalPeakAllTimeDate
		}
	}

	public createEmptySnapshot(): OnlineSnapshot {
		return {
			servers: [],
			players: 0,
			peakToday: 0,
			peakYesterday: 0,
			peakTodayRelativePercent: 0,
			peakAllTime: 0,
			peakAllTimeDate: DEFAULT_FALLBACK_DATE,
			globalPeakAllTime: 0,
			globalPeakAllTimeDate: DEFAULT_FALLBACK_DATE
		}
	}

	private sortServers(servers: Server[]): Server[] {
		const regex = /^([a-zA-Z]+)(\d+)$/

		return [...servers].sort((a, b) => {
			const matchA = a.id.match(regex)
			const matchB = b.id.match(regex)

			if (!matchA && !matchB) {
				return a.id.localeCompare(b.id)
			}

			if (!matchA) return -1
			if (!matchB) return 1

			const prefixA = matchA[1] ?? ''
			const prefixB = matchB[1] ?? ''

			const numStrA = matchA[2] ?? '0'
			const numStrB = matchB[2] ?? '0'

			if (prefixA !== prefixB) {
				return prefixA.localeCompare(prefixB)
			}

			return Number(numStrA) - Number(numStrB)
		})
	}

	private decodeServer(wire: any, defaultProject: ServerProject): Server {
		const id = typeof wire.id === 'number' ? String(wire.id) : String(wire.id ?? '')
		const benefitId = String(wire.benefitId ?? id)
		const name = String(wire.name ?? id)
		const branch = String(wire.branch ?? 'release') as ServerBranch
		const ip = String(wire.ip ?? '')

		const wireExtras = wire.extras ?? {}
		const wireAdvantages = wireExtras.advantages ?? {}

		const region = String(wire.region ?? 'ru') as ServerRegion
		const country = String(wire.country ?? 'ru') as ServerCountry
		const project = wireExtras.project === 'ro' ? 'russiaonline' : defaultProject

		const status = !!wire.status !== false
		const statusText = this.decodeStatus(wire)
		const techWorks = !!wire.techWorks
		const isRegOpened = (wire.isRegOpened ?? 'yes') as ServerRegOpened

		const extras: ServerExtras = {
			project: wireExtras.project ?? (defaultProject === 'russiaonline' ? 'ro' : undefined),
			showInWebsite: wireExtras.showInWebsite ?? true,
			showInLauncher: wireExtras.showInLauncher ?? true,
			showInMasterlist: wireExtras.showInMasterlist ?? true,

			forBeginners: wireExtras.forBeginners ?? wire.forBeginnersLauncher ?? false,

			advantages: {
				newServer: wireAdvantages.newServer ?? false,
				seasonPassMultiplier: wireAdvantages.seasonPassMultiplier ? Number(wireAdvantages.advantages?.seasonPassMultiplier) : 1
			}
		}

		const seasonPassMultiplier = String(wireAdvantages.seasonPassMultiplier ?? '1')
		const forBeginnersLauncher = !!wire.forBeginnersLauncher
		const forBeginnersSite = !!(wire.forBeginnersSite ?? false)

		const player = Number(wire.players ?? 0)
		const queuedPlayers = Number(wire.queuedPlayers ?? 0)
		const activePlayers = player + queuedPlayers
		const peakAllTime = Number(wire.peakAllTime ?? 0)
		const peakAllTimeDate = wire.peakAllTimeDate ?? DEFAULT_FALLBACK_DATE

		return {
			id: id,
			benefitId: benefitId,
			name: name,
			branch: branch,
			ip: ip,
			region: region,
			project: project,
			country: country,

			status: status,
			statusText: statusText,
			techWorks: techWorks,
			isRegOpened: isRegOpened,

			extras,

			seasonPassMultiplier: seasonPassMultiplier,
			forBeginnersLauncher: forBeginnersLauncher,
			forBeginnersSite: forBeginnersSite,

			players: player,
			activePlayers: activePlayers,
			queuedPlayers: queuedPlayers,
			peakAllTime: peakAllTime,
			peakAllTimeDate: peakAllTimeDate
		}
	}

	private decodeStatus(wire: any): ServerStatus {
		if (wire.techWorks === true) return 'tech-works'
		if (wire.status === false) return 'offline'
		return 'online'
	}
}
