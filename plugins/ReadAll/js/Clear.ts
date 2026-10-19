import { findByStoreName, findByProps } from './compat'
import { getData } from './settings'

export interface ClearAllResult {
  dms: number
  channels: number
  skipped: number
}

/**
 * Mark every unread DM and every unread channel in non-excluded servers as read.
 * Reuses the same store-level ACK that `executeClear` uses.
 */
export async function executeClearAll(): Promise<ClearAllResult> {
  const { excludedServers, excludedDMs } = getData()
  const excludedS = new Set(excludedServers)
  const excludedD = new Set(excludedDMs)

  const result: ClearAllResult = { dms: 0, channels: 0, skipped: 0 }

  // --- find the ACK function used by Discord's read state ---
  // Try a few common names across builds.
  const ReadStateStore =
    findByStoreName('ReadStateStore') ??
    findByStoreName('ReadStateStore') // same name; fallback below
  const ack =
    ReadStateStore?.ack ??
    ReadStateStore?.ackChannel ??
    findByProps('ack')?.ack

  if (typeof ack !== 'function') {
    throw new Error('ReadStateStore.ack not found in this build')
  }

  // ---------- DMs / group DMs ----------
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
      await ack.call(ReadStateStore, id)
      result.dms++
    } catch {
      result.skipped++
    }
  }

  // ---------- Guilds ----------
  const GuildStore = findByStoreName('GuildStore')
  const guilds: Record<string, any> = GuildStore?.getGuilds?.() ?? {}

  for (const guild of Object.values(guilds)) {
    const guildId = guild?.id
    if (!guildId) continue
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

  return result
}
