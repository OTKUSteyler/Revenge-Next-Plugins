import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'

// Translation hashes of the "delete message" / "delete embed" confirmation strings.
const HASHES = {
	message: 'AMvpS4',
	embed: 'vXZ+Fo',
} as const

interface IntlModule {
	intl: { string(value: unknown): string }
	t: Record<string, unknown>
}

interface PopupModule {
	show(popup: any, ...rest: unknown[]): unknown
	openLazy: unknown
}

export default plugin({
	start({ cleanup }) {
		let intlModule: IntlModule | undefined

		// Resolved lazily so we always use the current locale and never crash if intl isn't ready.
		function getMatchers(): string[] {
			if (!intlModule) return []

			const { intl, t } = intlModule
			const matchers: string[] = []

			for (const hash of Object.values(HASHES)) {
				try {
					const text = intl.string(t[hash])
					if (typeof text === 'string' && text) matchers.push(text)
				} catch {
					// Missing hash for this Discord build, skip it.
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
							const title = popup?.children?.props?.title
							const body = popup?.body

							if (
								typeof popup?.onConfirm !== 'function' ||
								(typeof title !== 'string' && typeof body !== 'string')
							) {
								return original.apply(Popup, args)
							}

							const isDeleteConfirm = getMatchers().some(
								matcher =>
									(typeof title === 'string' && title.includes(matcher)) ||
									(typeof body === 'string' && body.includes(matcher)),
							)

							return isDeleteConfirm
								? popup.onConfirm()
								: original.apply(Popup, args)
						},
					),
				)
			}),
		)
	},
})
