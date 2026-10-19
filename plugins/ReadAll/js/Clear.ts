import { findByProps, findByStoreName, toast } from './compat'
import { isDMExcluded, isServerExcluded } from './settings'

export type Mode = 'all' | 'servers' | 'dms'

const getStores = () => ({
	GuildStore: findByStoreName('GuildStore'),
	GuildChannelStore:
		findByStoreName('GuildChannelStore') || findByStoreName('ChannelStore'),
	ChannelStore: findByStoreName('ChannelStore'),
	ReadStateStore: findByStoreName('ReadStateStore'),
	FluxDispatcher: findByProps('dispatch', 'subscribe'),
})

const getDMChannels = (ChannelStore: any, GuildChannelStore: any) => {
	const out: any[] = []
	const store = ChannelStore || GuildChannelStore
	try {
		const priv = store?.getPrivateChannels?.()
		if (priv && typeof priv === 'object') {
			Object.values(priv).forEach((c: any) => c?.id && out.push(c))
		}
	} catch {
		// Silently fail if the store doesn't have this method in the current client version
	}
	return out
}

const getUnreadChannels = (mode: Mode) => {
	const { GuildStore, GuildChannelStore, ChannelStore, ReadStateStore } = getStores()
	if (!ReadStateStore) return []

	const channels: any[] = []
	const push = (id: string) => {
		// Ensure we don't push the same channel twice
		if (channels.some(c => c.channelId === id)) return
		
		channels.push({
			channelId: id,
			messageId: ReadStateStore.lastMessageId?.(id) || null,
			readStateType: 0,
		})
	}

	// 1. Process Servers
	if ((mode === 'all' || mode === 'servers') && GuildStore) {
		try {
			const guilds = GuildStore.getGuilds?.() || {}
			Object.values(guilds).forEach((guild: any) => {
				if (!guild?.id || isServerExcluded(guild.id)) return
				try {
					let list: any[] = []
					const data = (GuildChannelStore || ChannelStore)?.getChannels?.(guild.id)
					
					if (data?.SELECTABLE) list = list.concat(data.SELECTABLE)
					if (data?.VOCAL) list = list.concat(data.VOCAL)
					
					list.forEach((c: any) => {
						const channel = c?.channel || c
						if (channel?.id && ReadStateStore.hasUnread?.(channel.id)) {
							push(channel.id)
						}
					})
				} catch {}
			})
		} catch {}
	}

	// 2. Process DMs
	if (mode === 'all' || mode === 'dms') {
		const dms = getDMChannels(ChannelStore, GuildChannelStore)
		dms.forEach(channel => {
			if (!isDMExcluded(channel.id) && ReadStateStore.hasUnread?.(channel.id)) {
				push(channel.id)
			}
		})
	}

	return channels
}

export function executeClear(mode: Mode) {
	const { FluxDispatcher } = getStores()
	
	if (!FluxDispatcher || typeof FluxDispatcher.dispatch !== 'function') {
		return toast('Failed to find Discord Dispatcher. Try again in a moment.')
	}

	const targets = getUnreadChannels(mode)
	if (targets.length === 0) {
		return toast('No unread notifications!')
	}

	try {
		FluxDispatcher.dispatch({
			type: 'BULK_ACK',
			context: 'APP',
			channels: targets,
		})

		const label =
			mode === 'all'
				? 'notifications'
				: mode === 'servers'
					? 'server channels'
					: 'DMs'
					
		toast(`Cleared ${targets.length} ${label}!`)
	} catch (e) {
		console.error('[ReadAll+] Failed to clear:', e)
		toast('An error occurred while clearing.')
	}
}
