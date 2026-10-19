import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'

// Set to false once it works. While true, popups that have an onConfirm but don't match
// are logged, so we can see exactly what Discord passes in.
const DEBUG = true

// Same translation hashes as the original script. They are resolved through Discord's own
// intl at popup time, so the matched text is always in the user's current app language.
const KEYS = {
	message: { hash: 'AMvpS4' },
	embed: { hash: 'vXZ+Fo' },
} as const

interface IntlModule {
	intl: { string(value: unknown): string }
	t: Record<string, unknown>
}

interface PopupModule {
	show(popup: any, ...rest: unknown[]): unknown
	openLazy: unknown
}

// Pull every string out of a value: plain strings, arrays, and React elements
// (props.title / body / children). Popup text is often not a plain string.
function collectText(value: any, depth = 0, out: string[] = []): string[] {
	if (value == null || depth > 5) return out
	if (typeof value === 'string') {
		out.push(value)
	} else if (Array.isArray(value)) {
		for (const v of value) collectText(v, depth + 1, out)
	} else if (typeof value === 'object') {
		const props = value.props
		if (props) {
			collectText(props.title, depth + 1, out)
			collectText(props.body, depth + 1, out)
			collectText(props.children, depth + 1, out)
		}
	}
	return out
}

export default plugin({
	start({ cleanup }) {
		let intlModule: IntlModule | undefined

		function getMatchers(): string[] {
			if (!intlModule) return []

			const { intl, t } = intlModule
			const matchers: string[] = []

			for (const { hash } of Object.values(KEYS)) {
				try {
					const text = intl.string(t[hash])
					if (typeof text === 'string' && text) matchers.push(text)
				} catch {
					// Hash missing in this Discord build, skip it.
				}
			}

			return matchers
		}

		cleanup(
			getModules(withProps<IntlModule>('intl'), mod => {
				intlModule = mod
			}),

			getModules(withProps<PopupModule>('show', 'openLazy'), Popup => {
				cleanup(
					instead(
						Popup as any,
						'show',
						(args: any[], original: (...a: any[]) => any) => {
							const popup = args?.[0]

							if (typeof popup?.onConfirm !== 'function') {
								return original.apply(Popup, args)
							}

							const texts = [
								...collectText(popup.title),
								...collectText(popup.body),
								...collectText(popup.content),
								...collectText(popup.children),
							]

							const matchers = getMatchers()
							const matched = matchers.some(m => texts.some(t => t.includes(m)))

							if (matched) return popup.onConfirm()

							if (DEBUG) {
								console.log('[QuickDelete] unmatched popup', {
									keys: Object.keys(popup),
									texts,
									matchers,
								})
							}

							return original.apply(Popup, args)
						},
					),
				)
			}),
		)
	},
})
