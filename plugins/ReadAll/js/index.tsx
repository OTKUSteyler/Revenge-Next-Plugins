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

// ... (Keep Command interfaces and buildCommand here) ...

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

		// 1. Slash Command
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

		// 2. Char Counter Hijack
		console.log('[ReadAll] Looking for CharCounter to hijack...')
		
		cleanup(
			getModules(withProps('CharCounter'), CharCounter => {
				cleanup(
					after(CharCounter, 'default', (args: any[], res: any) => {
						// Replace the counter entirely with our floating button.
						// It will render inside the Mentions/CharCounter row,
						// but because we gave ReadButton `position: absolute`,
						// it will float exactly where the user specified in settings.
						return React.createElement(ReadButton)
					})
				)
			})
		)

		// Fallback just in case the name is different in this build
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
