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

		// ── 2. Floating pill injection (Header Patch) ───────────
		// We patch the chat header to avoid breaking the text input.
		cleanup(
			getModules(withProps('ChatHeader'), Header => {
				cleanup(
					after(Header, 'default', (args: any[], res: any) => {
						if (!React.isValidElement(res)) return res

						return React.createElement(
							View,
							{ style: { flex: 1 } },
							res,
							// The floating pill positioned in the top right
							React.createElement(
								View,
								{
									pointerEvents: 'box-none',
									style: {
										position: 'absolute',
										top: 15, // Adjust this to line up with the title
										right: 50, // Keeps it away from the search icon
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
