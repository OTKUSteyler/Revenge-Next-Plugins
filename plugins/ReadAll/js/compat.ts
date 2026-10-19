import { lookupModule } from '@revenge-mod/modules/finders'
import { withName, withProps } from '@revenge-mod/modules/finders/filters'
import { Alert } from 'react-native'

export const TAG = '[ReadAll+]'

/**
 * Finds a module by checking if it has the specified properties.
 * Returns the first match, or undefined if not found.
 */
export const findByProps = (prop: string, ...props: string[]): any => {
	try {
		const modules = lookupModule(withProps(prop, ...props))
		return modules?.[0]
	} catch {
		return undefined
	}
}

/**
 * Finds a module by its internal Discord store name (e.g., 'UserStore').
 * Returns the first match, or undefined if not found.
 */
export const findByStoreName = (name: string): any => {
	try {
		const modules = lookupModule(withName(name))
		return modules?.[0]
	} catch {
		return undefined
	}
}

/**
 * Shows a native Discord toast notification.
 * Falls back to console.log if the Toast module cannot be found.
 */
export function toast(message: string) {
	try {
		const t = findByProps('showToast')
		if (t?.showToast) {
			return void t.showToast({ content: message })
		}
	} catch {}
	console.log(TAG, message)
}

/**
 * Wrapper for React Native's Alert.alert to show a choice dialog.
 */
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
