import { findByProps, findByStoreName } from './compat'
import { getData } from './settings'

export interface ClearAllResult {
	dms: number
	channels: number
	skipped: number
}

/** Stores often return `{ [id]: value }` maps instead of arrays. Accept both. */
function toArray<T = any>(value: unknown): T[] {
	if (!value) return []
	return Array.isArray(value) ? value : (Object.values(value) as T[])
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

	// 1. Locate the ReadStateStore + the acknowledgment function
	const ReadStateStore = findByStoreName('ReadStateStore')
	const ack =
		ReadStateStore?.ack ??
		ReadStateStore?.ackChannel ??
		findByProps('ack')?.ack

	if (typeof ack !== 'function') {
		console.error('[ReadAll] ack function not found in this build')
		return result
	}

	// Only touch channels that are actually unread (when the store can tell us).
	const isUnread = (id: string): boolean =>
		typeof ReadStateStore?.hasUnread === 'function'
			? Boolean(ReadStateStore.hasUnread(id))
			: true

	const markRead = async (id: string): Promise<boolean> => {
		try {
			await ack.call(ReadStateStore, id)
			return true
		} catch {
			result.skipped++
			return false
		}
	}

	// 2. DMs & Group DMs
	// getPrivateChannels() returns an id -> channel map, NOT an array, so it
	// must be converted before iterating (iterating the map directly throws).
	const PrivateChannelStore = findByStoreName('PrivateChannelStore')
	const privateChannels = toArray<any>(PrivateChannelStore?.getPrivateChannels?.())

	for (const ch of privateChannels) {
		const id: string | undefined = ch?.channelId ?? ch?.id
		if (!id) continue

		if (excludedD.has(id)) {
			result.skipped++
			continue
		}
		if (!isUnread(id)) continue

		if (await markRead(id)) result.dms++
	}

	// 3. Server channels
	// GuildStore guild objects don't carry their channels; ask GuildChannelStore.
	const GuildStore = findByStoreName('GuildStore')
	const GuildChannelStore = findByStoreName('GuildChannelStore')
	const guilds = toArray<any>(GuildStore?.getGuilds?.())

	const getGuildChannelIds = (guild: any): string[] => {
		const grouped = GuildChannelStore?.getChannels?.(guild.id)
		if (grouped) {
			const ids: string[] = []
			for (const key of ['SELECTABLE', 'VOCAL']) {
				for (const entry of toArray<any>(grouped[key])) {
					const id = entry?.channel?.id ?? entry?.id
					if (id) ids.push(id)
				}
			}
			return ids
		}
		return Object.keys(guild?.channels ?? {})
	}

	for (const guild of guilds) {
		const guildId: string | undefined = guild?.id
		if (!guildId) continue

		if (excludedS.has(guildId)) {
			result.skipped++
			continue
		}

		for (const chId of getGuildChannelIds(guild)) {
			if (!isUnread(chId)) continue
			if (await markRead(chId)) result.channels++
		}
	}

	console.log(
		`[ReadAll] Finished! Cleared ${result.dms} DMs, ${result.channels} channels. Skipped ${result.skipped}.`,
	)
	return result
}

/**
 * ReadButton.tsx imports `executeClear` from this file, but only
 * `executeClearAll` was exported, which is what broke the build
 * ([MISSING_EXPORT] "executeClear" is not exported by Clear.ts).
 */
export const executeClear = executeClearAll
