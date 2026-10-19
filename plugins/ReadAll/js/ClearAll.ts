import { findByStoreName, findByProps } from './compat'
import { getData } from './settings'

export interface ClearAllResult {
	dms: number
	channels: number
	skipped: number
}

/**
 * Marks every unread DM and every unread channel in non-excluded servers as read.
 * Respects the excludedServers and excludedDMs from the Settings menu.
 */
export async function executeClearAll(): Promise<ClearAllResult> {
	const { excludedServers, excludedDMs } = getData()
	const excludedS = new Set(excludedServers)
	const excludedD = new Set(excludedDMs)

	const result: ClearAllResult = { dms: 0, channels: 0, skipped: 0 }

	// 1. Locate the ReadStateStore
	const ReadStateStore = findByStoreName('ReadStateStore')
	
	// Find the acknowledgment function (varies slightly by Discord version)
	const ack =
		ReadStateStore?.ack ??
		ReadStateStore?.ackChannel ??
		findByProps('ack')?.ack

	if (typeof ack !== 'function') {
		console.error('[ReadAll] ReadStateStore.ack not found in this build')
		return result
	}

	// 2. Clear DMs & Group DMs
	const PrivateChannelStore = findByStoreName('PrivateChannelStore')
	const privateChannels: any[] =
		PrivateChannelStore?.getPrivateChannels?.() ??
		Object.values(PrivateChannelStore?.getPrivateChannels?.() ?? {})

	for (const ch of privateChannels) {
		const id = ch?.channelId ?? ch?.id
		if (!id) continue
		
		if (excludedD.has(id)) {
			result.skipped++
			continue
		}
		
		try {
			// Call Discord's internal mark-as-read function
			await ack.call(ReadStateStore, id)
			result.dms++
		} catch {
			result.skipped++
		}
	}

	// 3. Clear Server Channels
	const GuildStore = findByStoreName('GuildStore')
	const guilds: Record<string, any> = GuildStore?.getGuilds?.() ?? {}

	for (const guild of Object.values(guilds)) {
		const guildId = guild?.id
		if (!guildId) continue
		
		// Skip entire server if it's in the excluded list
		if (excludedS.has(guildId)) {
			result.skipped++
			continue
		}

		const channels = guild?.channels ?? {}
		for (const chId of Object.keys(channels)) {
			try {
				await ack.call(ReadStateStore, chId)
				result.channels++
			} catch {
				result.skipped++
			}
		}
	}

	console.log(`[ReadAll] Finished! Cleared ${result.dms} DMs, ${result.channels} channels. Skipped ${result.skipped}.`)
	return result
}
