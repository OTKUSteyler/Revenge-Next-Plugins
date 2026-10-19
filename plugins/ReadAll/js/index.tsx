import React from 'react'
import { View } from 'react-native'
import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { executeClear } from './Clear'
import { executeClearAll } from './ClearAll'
import Settings, { bindStorage } from './settings'
import ReadButton from './ReadButton'
import type { Mode } from './Clear'

// ─────────────────────────────────────────────────────────────
// Slash command definitions
// ─────────────────────────────────────────────────────────────

interface CommandOption {
	name: string
	description: string
	type: number
	required?: boolean
	choices?: { name: string; value: string }[]
}

interface Command {
	id?: string
	name: string
	description: string
	options?: CommandOption[]
	execute: (args: any[], ctx: any) => void | Promise<void>
}

function nextCommandId(res: any[]): string {
	const used = new Set(res.map((c: any) => c?.id).filter(Boolean))
	let n = 1
	while (used.has(String(n))) n++
	return String(n)
}

function buildCommand(): Command {
	return {
		name: 'readall',
		description: 'Mark all servers and DMs as read (respects exclusions)',
		options: [
			{
				name: 'mode',
				description: 'What to clear',
				type: 3, // STRING
				required: false,
				choices: [
					{ name: 'Everything', value: 'all' },
					{ name: 'Servers only', value: 'servers' },
					{ name: 'DMs only', value: 'dms' },
				],
			},
		],
		async execute(args) {
			console.log('[ReadAll] Slash command executed with args:', args)
			const mode = (args?.[0]?.value ?? 'all') as Mode | 'all'
			if (mode === 'all') {
				await executeClearAll()
			} else {
				await executeClear(mode as Mode)
			}
		},
	}
}

// ─────────────────────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────────────────────

export default plugin({
	jsonStorage: {
		default: { excludedServers: [] as string[], excludedDMs: [] as string[] },
		load: true,
	},

	init({ jsonStorage }) {
		console.log('[ReadAll] init() called')
		bindStorage(jsonStorage)
	},

	start({ cleanup }) {
		console.log('[ReadAll] start() called - Beginning UI injection')

		let command: Command | undefined

		// ── 1. Slash command patch ──────────────────────────────
		console.log('[ReadAll] Patching slash commands...')
		cleanup(
			getModules(withProps('getBuiltInCommands'), store => {
				console.log('[ReadAll] Found getBuiltInCommands store:', typeof store)
				cleanup(
					after(store as any, 'getBuiltInCommands', (res: any) => {
						if (!Array.isArray(res)) return res
						const cmd = (command ??= buildCommand())
						cmd.id ??= nextCommandId(res)
						if (res.some((c: any) => c?.id === cmd.id)) return res
						return [...res, cmd]
					}),
				)
			}),
		)

		// ── 2. Floating pill injection (Chat Input Patch) ───────
		console.log('[ReadAll] Looking for ChannelTextArea...')
		
		const modules = getModules(withProps('ChannelTextArea'))
		console.log(`[ReadAll] Found ${modules.length} modules matching "ChannelTextArea"`)

		if (modules.length === 0) {
			console.warn('[ReadAll] CRITICAL: Could not find ChannelTextArea module. Discord likely updated the component names.')
		}

		cleanup(
			modules.forEach((ChannelTextArea, index) => {
				console.log(`[ReadAll] Patching module #${index}:`, Object.keys(ChannelTextArea).join(', '))
				
				cleanup(
					after(ChannelTextArea, 'default', (args: any[], res: any) => {
						if (!React.isValidElement(res)) {
							console.log('[ReadAll] Intercepted render, but result is not a valid React element. Skipping.')
							return res
						}

						console.log('[ReadAll] Successfully intercepted ChannelTextArea render! Injecting pill...')

						return React.createElement(
							View,
							{ style: { flex: 1 } },
							res,
							React.createElement(
								View,
								{
									pointerEvents: 'box-none',
									style: {
										position: 'absolute',
										bottom: 60, 
										right: 16,
										zIndex: 9999,
									},
								},
								React.createElement(ReadButton)
							)
						)
					})
				)
			})
		)
	},

	SettingsComponent: Settings,
})
