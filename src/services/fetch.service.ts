import axios from 'axios'
import type { FastifyBaseLogger } from 'fastify'

import { config } from '../config/index.js'
import type { WikiApiResponseDto } from '../types/index.js'
import { isWikiApiResponseSuccess } from '../types/index.js'

export class FetchService {
	constructor(private readonly logger: FastifyBaseLogger) {}

	public async fetchMajesticApi(url: string): Promise<unknown | null> {
		try {
			const { data } = await axios.get<WikiApiResponseDto<unknown>>(url, {
				headers: {
					'Accepted-Language': 'ru',
					'Cache-control': 'no-cache'
				},
				maxRedirects: config.http.maxRedirects,
				timeout: config.http.timeout
			})

			if (isWikiApiResponseSuccess(data)) {
				return data.data
			}

			return null
		} catch (err: unknown) {
			this.logger.error(`Failed to fetch url: ${url}, err: ${err}`)
			return null
		}
	}
}
