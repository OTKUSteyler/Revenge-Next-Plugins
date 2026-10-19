import { Pressable, StyleSheet, Text, View } from 'react-native'
import { executeClear } from './Clear'
import { choose, findByProps } from './compat'

export const TILE = 48
export const MARGIN = 4

export default function ReadButton() {
	const Haptic = findByProps('triggerHapticFeedback', 'HapticFeedbackTypes')

	const onPress = () => {
		Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.SOFT)
		choose('👁️ Read All Options', 'Choose what you want to mark as read:', [
			{ text: 'Mark All Read', onPress: () => executeClear('all') },
			{ text: 'Servers Only', onPress: () => executeClear('servers') },
			{ text: 'DMs Only', onPress: () => executeClear('dms') },
			{ text: 'Cancel', style: 'cancel' },
		])
	}

	const st = StyleSheet.create({
		row: {
			alignSelf: 'stretch',
			alignItems: 'center',
			paddingTop: MARGIN,
			paddingBottom: MARGIN,
		},
		tile: {
			width: TILE,
			height: TILE,
			borderRadius: 16,
			backgroundColor: '#111214',
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		circle: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: '#2B2D31',
			alignItems: 'center',
			justifyContent: 'center',
		},
	})

	return (
		<View style={st.row}>
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel="Read All Options"
			>
				<View style={st.tile}>
					<View style={st.circle}>
						<Text style={{ fontSize: 18 }}>👁</Text>
					</View>
				</View>
			</Pressable>
		</View>
	)
}
