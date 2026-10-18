import type { FastifyBaseLogger } from 'fastify'
import { BehaviorSubject, catchError, distinctUntilChanged, switchMap, timer } from 'rxjs'

import { config } from '../config/index.js'
import type { OnlineSnapshot } from '../types/index.js'
import { getSnapshotChecksum } from '../utils/checksum.js'

import { DecodeService } from './decode.service.js'
import { FetchService } from './fetch.service.js'

interface CacheData {
	majesticRP: OnlineSnapshot
	russiaOnline: OnlineSnapshot
	lastUpdatedAt: string
}

export class CacheService {
	private cache!: BehaviorSubject<CacheData>

	constructor(
		private readonly logger: FastifyBaseLogger,
		private readonly fetchService: FetchService,
		private readonly decodeService: DecodeService
	) {
		this.cache = new BehaviorSubject<CacheData>({
			majesticRP: this.decodeService.createEmptySnapshot(),
			russiaOnline: this.decodeService.createEmptySnapshot(),
			lastUpdatedAt: new Date().toISOString()
		})
		this.startRefreshLoop()
	}

	public getValue(): CacheData {
		return this.cache.getValue()
	}

	private startRefreshLoop(): void {
		timer(0, config.refreshInterval)
			.pipe(
				switchMap(async () => {
					this.logger.debug("Fetch online from wiki api's")

					const [rawMajesticRP, rawRussiaOnline] = await Promise.all([
						this.fetchService.fetchMajesticApi(config.api.majesticRP),
						this.fetchService.fetchMajesticApi(config.api.russiaOnline)
					])

					const majesticRP = this.decodeService.decodeSnapshot(rawMajesticRP, 'majestic')
					const russiaOnline = this.decodeService.decodeSnapshot(rawRussiaOnline, 'russiaonline')

					return {
						majesticRP,
						russiaOnline,
						checksums: {
							majestic: getSnapshotChecksum(majesticRP),
							russia: getSnapshotChecksum(russiaOnline)
						}
					}
				}),
				distinctUntilChanged((prev, curr) => {
					if (curr.majesticRP.servers.length === 0 && curr.russiaOnline.servers.length === 0) {
						return true
					}

					return prev.checksums.majestic === curr.checksums.majestic && prev.checksums.russia === curr.checksums.russia
				}),
				catchError((_err, caught) => caught)
			)
			.subscribe(({ majesticRP, russiaOnline }) => {
				const current = this.cache.getValue()

				this.cache.next({
					majesticRP: majesticRP || current.majesticRP,
					russiaOnline: russiaOnline || current.russiaOnline,
					lastUpdatedAt: new Date().toISOString()
				})

				this.logger.debug('Online cache updated successfully')
			})
	}
}
