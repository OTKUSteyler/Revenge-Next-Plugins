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
		bindStorage(jsonStorage)
	},

	start({ cleanup }) {
		let command: Command | undefined

		// ── 1. Slash command patch ──────────────────────────────
		cleanup(
			getModules(withProps('getBuiltInCommands'), store => {
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

		// ── 2. Floating pill injection ──────────────────────────
		// Pick the first persistent host that exists in this build.
		// These all render across the whole logged-in app.
		const HOST_NAMES = [
			'BottomTabBar',
			'TabBar',
			'MainView',
			'RootNavigation',
			'App',
		] as const

		let host: any
		for (const name of HOST_NAMES) {
			const mods = getModules(withProps(name))
			host = mods.find((m: any) => typeof m?.default === 'function')
			if (host) break
		}

		if (!host) {
			console.warn(
				'[ReadAll] No persistent host found — floating pill disabled. ' +
					'Checked: ' +
					HOST_NAMES.join(', '),
			)
		} else {
			cleanup(
				after(host, 'default', (args: any[], res: any) => {
					if (!React.isValidElement(res)) return res

					return React.createElement(
						View,
						{ style: { flex: 1 } },
						res,
						React.createElement(
							View,
							{
								// Critical: only the pill itself is tappable,
								// the wrapper lets touches pass through to the app.
								pointerEvents: 'box-none',
								style: {
									position: 'absolute',
									right: 16,
									bottom: 96, // sits above the tab bar; tweak if needed
									zIndex: 9999,
								},
							},
							React.createElement(ReadButton),
						),
					)
				}),
			)
		}
	},

	SettingsComponent: Settings,
})
