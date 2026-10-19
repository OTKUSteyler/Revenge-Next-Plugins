import { Pressable, StyleSheet, Text, View } from 'react-native'
import { lookupModule } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { executeClear } from './Clear'

// Looked up lazily on first press and cached.
let haptic: any
function getHaptic() {
	if (haptic) return haptic
	// Handles both a plain exports return and an [exports, id] tuple return.
	const result: any = lookupModule(withProps('triggerHapticFeedback', 'HapticFeedbackTypes'))
	haptic = Array.isArray(result) ? result[0] : result
	return haptic
}

// Kept so any other file importing these still works.
// TILE is now the pill height.
export const TILE = 44
export const MARGIN = 4

// Tweak these to match your theme.
const PILL_BG = '#1B2625'
const PILL_BORDER = '#2F3D3B'
const ICON_COLOR = '#6FD3CB'
const TEXT_COLOR = '#E8EAEA'

const st = StyleSheet.create({
	row: {
		alignSelf: 'flex-start',
		paddingVertical: MARGIN,
		paddingHorizontal: 12,
	},
	pill: {
		height: TILE,
		minWidth: 110,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		borderRadius: TILE / 2,
		borderWidth: 1,
		borderColor: PILL_BORDER,
		backgroundColor: PILL_BG,
	},
	pillPressed: {
		opacity: 0.7,
	},
	icon: {
		color: ICON_COLOR,
		fontSize: 18,
		fontWeight: '700',
		marginRight: 8,
	},
	label: {
		color: TEXT_COLOR,
		fontSize: 16,
		fontWeight: '700',
	},
})

export default function ReadButton() {
	const onPress = () => {
		const Haptic = getHaptic()
		Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes?.SOFT)

		// Marks servers and DMs as read, skipping anything in the excluded lists from Settings.
		executeClear('all')
	}

	return (
		<View style={st.row}>
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel="Read All"
				style={({ pressed }) => [st.pill, pressed && st.pillPressed]}
			>
				<Text style={st.icon}>✓</Text>
				<Text style={st.label}>Read All</Text>
			</Pressable>
		</View>
	)
}
