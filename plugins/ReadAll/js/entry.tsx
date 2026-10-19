import React from 'react'
import { View } from 'react-native'
import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { executeClearAll } from './ClearAll'
import Settings, { bindStorage } from './settings'
import ReadButton from './ReadButton'

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
		description: 'Mark all servers and DMs as read',
		async execute() {
			await executeClearAll()
		},
	}
}

// Set in init(), read at render time so Settings changes apply on the next render.
let storage: any

function FloatingPill() {
	const bottom = Number(storage?.pillBottom ?? 60)
	const right = Number(storage?.pillRight ?? 16)

	return React.createElement(
		View,
		{
			// Real size (no height: 0), otherwise Android ignores touches outside the parent bounds.
			// box-none lets taps pass through everywhere except on the pill itself.
			pointerEvents: 'box-none',
			style: {
				position: 'absolute',
				bottom,
				right,
				zIndex: 9999,
				elevation: 10,
			},
		},
		React.createElement(ReadButton),
	)
}

export default plugin({
	jsonStorage: {
		default: { excludedServers: [], excludedDMs: [], pillBottom: 60, pillRight: 16 },
		load: true,
	},

	init({ jsonStorage }) {
		storage = jsonStorage
		bindStorage(jsonStorage)
	},

	start({ cleanup }) {
		let command: Command | undefined

		// 1. Slash command patch
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

		// 2. Floating pill, mounted next to the chat input
		cleanup(
			getModules(withProps('ChannelTextArea'), ChannelTextArea => {
				cleanup(
					after(ChannelTextArea, 'default', (args: any[], res: any) => {
						if (!React.isValidElement(res)) return res

						return React.createElement(
							React.Fragment,
							null,
							res,
							React.createElement(FloatingPill),
						)
					}),
				)
			}),
		)
	},

	SettingsComponent: Settings,
})
