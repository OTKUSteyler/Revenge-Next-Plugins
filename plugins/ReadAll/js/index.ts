import React from 'react'
import { View } from 'react-native'
import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { executeClear } from './Clear'
import Settings, { bindStorage } from './settings'
import ReadButton from './ReadButton' // <-- Import your component
import type { Mode } from './Clear'

// ... (Keep your Command interfaces and buildCommand function here) ...

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

		// 1. Slash Command Patch (Keep as is)
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

		// 2. UI Patch: Inject ReadButton
		// We look for 'ChannelTextArea' or 'ChatInput' depending on the Discord version.
		// 'ChannelTextArea' is usually the container that holds the mentions row and the input.
		cleanup(
			getModules(withProps('ChannelTextArea'), ChannelTextArea => {
				cleanup(
					after(ChannelTextArea, 'default', (args: any[], res: any) => {
						if (!React.isValidElement(res)) return res

						// Wrap the original input area in a View so we can position our button
						return React.createElement(
							View,
							{ style: { flex: 1 } },
							res,
							// Our button will float right above the text box, on the right side
							// Adjust `bottom` to place it exactly next to the Mentions pill
							React.createElement(
								View,
								{
									style: {
										position: 'absolute',
										bottom: 58, // <--- Tweak this value if it overlaps the text box
										right: 16,
										zIndex: 999,
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
