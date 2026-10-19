import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { executeClear } from './Clear'
import Settings, { bindStorage } from './settings'
import type { Mode } from './Clear'

interface CommandOptionChoice {
	name: string
	displayName: string
	value: string
}

interface CommandOption {
	name: string
	displayName: string
	description: string
	displayDescription: string
	type: number
	required?: boolean
	choices?: CommandOptionChoice[]
}

interface Command {
	id?: string
	name: string
	displayName: string
	untranslatedName: string
	description: string
	displayDescription: string
	untranslatedDescription: string
	applicationId: string
	type: number
	inputType: number
	options: CommandOption[]
	execute(args: any[], ctx: any): unknown
}

const DESCRIPTION =
	'Mark unread servers and DMs as read (respects your exclusion lists)'

function buildCommand(): Command {
	return {
		name: 'readall',
		displayName: 'readall',
		untranslatedName: 'readall',
		description: DESCRIPTION,
		displayDescription: DESCRIPTION,
		untranslatedDescription: DESCRIPTION,
		applicationId: '-1',
		type: 1,
		inputType: 1,
		options: [
			{
				name: 'scope',
				displayName: 'scope',
				description: 'What to mark as read (default: everything)',
				displayDescription: 'What to mark as read (default: everything)',
				type: 3,
				required: false,
				choices: [
					{ name: 'all', displayName: 'Everything', value: 'all' },
					{ name: 'servers', displayName: 'Servers only', value: 'servers' },
					{ name: 'dms', displayName: 'DMs only', value: 'dms' },
				],
			},
		],
		execute: args => {
			const value = args?.find((a: any) => a.name === 'scope')?.value
			const mode: Mode = value === 'servers' || value === 'dms' ? value : 'all'
			executeClear(mode)
		},
	}
}

function nextCommandId(commands: { id?: string }[]): string {
	const last = commands[commands.length - 1]
	const parsed = Number.parseInt(last?.id ?? '', 10)
	return Number.isNaN(parsed) ? '-1000' : String(parsed - 1)
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
	},
	SettingsComponent: Settings,
})
