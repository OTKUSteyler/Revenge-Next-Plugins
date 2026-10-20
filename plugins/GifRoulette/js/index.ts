import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'

const ApplicationCommandType = {
	CHAT: 1,
	USER: 2,
	MESSAGE: 3,
} as const

const ApplicationCommandInputType = {
	BUILT_IN: 0,
	BUILT_IN_TEXT: 1,
	BUILT_IN_INTEGRATION: 2,
	BOT: 3,
	PLACEHOLDER: 4,
} as const

interface CommandContext {
	channel: { id: string }
}

interface ApplicationCommandOption {
	name: string
	description: string
	displayName?: string
	displayDescription?: string
	type: number
	required?: boolean
}

interface ApplicationCommand {
	id?: string
	name: string
	displayName?: string
	untranslatedName?: string
	description: string
	displayDescription?: string
	untranslatedDescription?: string
	options: ApplicationCommandOption[]
	execute(args: unknown[], ctx: CommandContext): unknown
	applicationId?: string
	inputType?: number
	type?: number
}

type GetBuiltInCommands = (
	type: number | number[],
	...rest: unknown[]
) => ApplicationCommand[]

interface CommandsModule {
	getBuiltInCommands: GetBuiltInCommands
}

interface MessageUtil {
	sendMessage(
		channelId: string,
		message: { content: string },
		invalidEmojis?: undefined,
		options?: { nonce?: string },
	): unknown
	editMessage(...args: unknown[]): unknown
}

interface FrecencySettingsModule {
	FrecencyUserSettingsActionCreators?: {
		getCurrentValue?: () => {
			favoriteGifs?: { gifs?: Record<string, unknown> }
		}
	}
}

let commands: ApplicationCommand[] = []

const NoFavorites =
	"❌ You don't have any favorite GIFs! Add some by favoriting GIFs in Discord first."

export default plugin({
	start({ cleanup }) {
		let messageUtil: MessageUtil | undefined
		let frecency: FrecencySettingsModule | undefined

		function getMessage(): string {
			const store =
				frecency?.FrecencyUserSettingsActionCreators?.getCurrentValue?.()
			const gifs = store?.favoriteGifs?.gifs
			if (!gifs) return NoFavorites

			const urls = Object.keys(gifs)
			if (urls.length === 0) return NoFavorites

			return urls[Math.floor(Math.random() * urls.length)]!
		}

		// FIX 1: `readBuiltIns` is a reference to getBuiltInCommands captured
		// BEFORE we patch it, and registerCommand runs BEFORE the patch is
		// installed. Previously this called the already-patched function, which
		// re-entered our own patch (and any other plugin's patch, e.g. petpet).
		function registerCommand(
			readBuiltIns: GetBuiltInCommands,
			command: ApplicationCommand,
		): () => void {
			let builtInCommands: ApplicationCommand[]
			try {
				builtInCommands = readBuiltIns(
					ApplicationCommandType.CHAT,
					true,
					false,
				)
			} catch {
				builtInCommands = readBuiltIns(
					Object.values(ApplicationCommandType),
					true,
					false,
				)
			}

			// FIX 2: sort a copy. Sorting in place reordered Discord's own
			// cached built-in command array.
			const sorted = [...(builtInCommands ?? [])].sort(
				(a, b) => parseInt(b.id ?? '0', 10) - parseInt(a.id ?? '0', 10),
			)

			const lastCommand = sorted[sorted.length - 1]
			if (lastCommand?.id)
				command.id = (parseInt(lastCommand.id, 10) - 1).toString()

			command.applicationId ??= '-1'
			command.type ??= ApplicationCommandType.CHAT
			command.inputType = ApplicationCommandInputType.BUILT_IN_TEXT
			command.displayName ??= command.name
			command.untranslatedName ??= command.name
			command.displayDescription ??= command.description
			command.untranslatedDescription ??= command.description

			commands.push(command)

			return () => {
				commands = commands.filter(c => c !== command)
			}
		}

		function patchBuiltInCommands(commandsModule: CommandsModule): () => void {
			// FIX 3: re-entrancy guard. If another plugin's patch on the same
			// function ends up calling back into this one, return the last
			// result instead of calling `original` again. That is what breaks
			// the gifroulette <-> petpet infinite recursion.
			let depth = 0
			let lastResult: ApplicationCommand[] = []

			return instead(
				commandsModule as any,
				'getBuiltInCommands',
				(args: any[], original: (...a: any[]) => any) => {
					if (depth > 0) return lastResult

					depth++
					try {
						const result: ApplicationCommand[] =
							original.apply(commandsModule, args) ?? []

						const type = args[0]
						const wanted: number[] = Array.isArray(type) ? type : [type]

						const merged = [
							...result,
							...commands.filter(
								c =>
									wanted.includes(c.type ?? ApplicationCommandType.CHAT) &&
									!result.includes(c),
							),
						]
						lastResult = merged
						return merged
					} finally {
						depth--
					}
				},
			)
		}

		cleanup(
			getModules(
				withProps<MessageUtil>('sendMessage', 'editMessage'),
				mod => {
					messageUtil = mod
				},
			),
			getModules(
				withProps<FrecencySettingsModule>('FrecencyUserSettingsActionCreators'),
				mod => {
					frecency = mod
				},
			),
			getModules(withProps<CommandsModule>('getBuiltInCommands'), Commands => {
				// Capture the unpatched function first, register, THEN patch.
				const readBuiltIns = Commands.getBuiltInCommands.bind(Commands)

				cleanup(
					registerCommand(readBuiltIns, {
						name: 'gifroulette',
						displayName: 'GIF Roulette',
						description: 'Sends a random GIF from your favorites',
						options: [],
						execute: (_args, ctx) => {
							messageUtil?.sendMessage(
								ctx.channel.id,
								{ content: getMessage() },
								void 0,
								{ nonce: Date.now().toString() },
							)
						},
					}),
				)
				cleanup(patchBuiltInCommands(Commands))
			}),
			() => {
				commands = []
			},
		)
	},
})
