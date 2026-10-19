import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'

export default plugin({
	start({ cleanup }) {
		cleanup(
			getModules(withProps('getTypingUsers'), TypingStore => {
				cleanup(
					instead(TypingStore as any, 'getTypingUsers', () => ({})),
				)
			}),
		)
	},
})
