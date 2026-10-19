import { lookupModule } from '@revenge-mod/modules/finders'
import { withName, withProps } from '@revenge-mod/modules/finders/filters'
import { Alert } from 'react-native'

export const TAG = '[ReadAll+]'

export const findByProps = (prop: string, ...props: string[]): any =>
	lookupModule(withProps(prop, ...props))?.[0]

export const findByStoreName = (name: string): any =>
	lookupModule(withName(name))?.[0]

export function toast(message: string) {
	try {
		const t = findByProps('showToast')
		if (t?.showToast) return void t.showToast({ content: message })
	} catch {}
	console.log(TAG, message)
}

export function choose(
	title: string,
	message: string,
	options: {
		text: string
		style?: 'default' | 'cancel' | 'destructive'
		onPress?: () => void
	}[],
) {
	Alert.alert(title, message, options)
}
