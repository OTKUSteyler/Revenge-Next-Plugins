import { findByProps } from '@revenge-mod/metro'
import { instead } from '@revenge-mod/patcher'
import { storage } from '@revenge-mod/storage'
import Settings from './Settings'

const { intl, t: intlMap } = findByProps('intl')

const KEYS = {
    message: {
        hash: 'AMvpS4',
        storage: 'autoConfirmMessage',
        default: true,
    },
    embed: {
        hash: 'vXZ+Fo',
        storage: 'autoConfirmEmbed',
        default: true,
    },
} as const

const autoConfirmMessages = {
    embed: intl.string(intlMap[KEYS.embed.hash]),
    message: intl.string(intlMap[KEYS.message.hash]),
}

let unpatch: (() => void) | undefined

export default {
    onLoad: () => {
        for (const { storage: key, default: value } of Object.values(KEYS)) {
            storage[key] ??= value
        }

        const Popup = findByProps('show', 'openLazy')
        if (!Popup) return

        unpatch = instead('show', Popup, (args: any[], fn: (...a: any[]) => any) => {
            const popup = args?.[0]
            const title = popup?.children?.props?.title
            const body = popup?.body

            if (
                !popup?.onConfirm ||
                typeof popup.onConfirm !== 'function' ||
                (typeof title !== 'string' && typeof body !== 'string')
            ) {
                return fn(...args)
            }

            const shouldConfirm = (type: 'message' | 'embed') => {
                const matcher = autoConfirmMessages[type]
                if (!matcher) return false

                return storage[KEYS[type].storage] && (title?.includes(matcher) || body?.includes(matcher))
            }

            return shouldConfirm('message') || shouldConfirm('embed') ? popup.onConfirm() : fn(...args)
        })
    },

    onUnload: () => unpatch?.(),
    settings: Settings,
}
