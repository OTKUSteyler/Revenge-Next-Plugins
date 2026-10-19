import React from 'react'
import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { executeClearAll } from './ClearAll'
import Settings, { bindStorage } from './settings'
import ReadButton from './ReadButton'

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
		description: 'Mark all servers and DMs as read',
		options: [
			{
				name: 'mode',
				description: 'What to clear',
				type: 3,
				required: false,
				choices: [
					{ name: 'Everything', value: 'all' },
				],
			},
		],
		async execute(args) {
			// For now, just run the clear all function
			await executeClearAll()
		},
	}
}

// ─────────────────────────────────────────────────────────────
// Plugin
// ─────────────────────────────────────────────────────────────

export default plugin({
	jsonStorage: {
		default: { excludedServers: [], excludedDMs: [], pillBottom: 60, pillRight: 16 },
		load: true,
	},

	init({ jsonStorage }) {
		bindStorage(jsonStorage)
	},

	start({ cleanup }) {
		let command: Command | undefined

		// 1. Slash Command Patch
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

		// 2. Char Counter Hijack (Injects the floating pill)
		console.log('[ReadAll] Injecting into CharCounter...')
		
		cleanup(
			getModules(withProps('CharCounter'), CharCounter => {
				cleanup(
					after(CharCounter, 'default', (args: any[], res: any) => {
						return React.createElement(ReadButton)
					})
				)
			})
		)

		// Fallback name just in case Discord renamed the component
		cleanup(
			getModules(withProps('CharacterCounter'), CharCounter => {
				cleanup(
					after(CharCounter, 'default', (args: any[], res: any) => {
						return React.createElement(ReadButton)
					})
				)
			})
		)
	},

	SettingsComponent: Settings,
})
