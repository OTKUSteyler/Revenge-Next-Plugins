import { lookupModule } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { instead } from '@revenge-mod/patcher'
// TODO(verify): '@revenge-mod/storage' does not exist. '@revenge-mod/json-storage' does,
// but check what it actually exports and how ReadAll+ / GifRoulette read their settings.
import { storage } from '@revenge-mod/json-storage'
import Settings from './Settings'

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

type ConfirmType = keyof typeof KEYS

// lookupModule returns [exports, id], or [] when nothing matches.
const find = <T = any>(...props: string[]): T | undefined =>
    (lookupModule(withProps<any>(...props)) as any[])[0]

// Resolved lazily in onLoad (not at import time), so a missing module can't crash the bundle load.
function getConfirmStrings(): Record<ConfirmType, string | undefined> | null {
    const mod = find<any>('intl')
    if (!mod?.intl || !mod?.t) return null

    const { intl, t: intlMap } = mod
    return {
        embed: intl.string(intlMap[KEYS.embed.hash]),
        message: intl.string(intlMap[KEYS.message.hash]),
    }
}

let unpatch: (() => void) | undefined

export default {
    onLoad: () => {
        for (const { storage: key, default: value } of Object.values(KEYS)) {
            ;(storage as any)[key] ??= value
        }

        const strings = getConfirmStrings()
        if (!strings) return

        const Popup = find<any>('show', 'openLazy')
        if (!Popup) return

        unpatch = instead('show', Popup, (args: any[], fn: (...a: any[]) => any) => {
            const popup = args?.[0]
            const title = popup?.children?.props?.title
            const body = popup?.body

            if (
                typeof popup?.onConfirm !== 'function' ||
                (typeof title !== 'string' && typeof body !== 'string')
            ) {
                return fn(...args)
            }

            const matches = (type: ConfirmType) => {
                const matcher = strings[type]
                if (!matcher || !(storage as any)[KEYS[type].storage]) return false

                return (
                    (typeof title === 'string' && title.includes(matcher)) ||
                    (typeof body === 'string' && body.includes(matcher))
                )
            }

            return matches('message') || matches('embed') ? popup.onConfirm() : fn(...args)
        })
    },

    onUnload: () => unpatch?.(),
    settings: Settings,
}
