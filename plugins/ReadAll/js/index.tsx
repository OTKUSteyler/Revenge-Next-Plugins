import React from 'react'
import { Text, View } from 'react-native'
import { getModules } from '@revenge-mod/modules/finders'
import { executeClearAll } from '@revenge-mod/.../ClearAll' // 指向你的 executeClearAll 实现


export function DrawerReadAllButton() {
    return React.createElement(
        View,
        {
            style: {
                marginHorizontal: 12,
                marginVertical: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.08)',
            },
            onStartShouldSetResponder: () => true,
            onResponderRelease: () => { void executeClearAll() },
        },
        React.createElement(
            Text,
            { style: { color: '#fff', fontWeight: '600', textAlign: 'center' } },
            'Read All',
        ),
    )
}

export function patchReadAllInDrawer(
    cleanups: (() => void)[],
    isDrawerContainer: (type: any, props: any) => boolean,
): boolean {
    const mods = getModules((m: any) => typeof m?.createElement === 'function')
    const target = mods?.[0]
    if (!target) return false

    const orig = target.createElement
    target.createElement = function (type: any, props: any, ...rest: any[]) {
        const el = orig.call(this, type, props, ...rest)
        if (!isDrawerContainer(type, props) || !React.isValidElement(el)) return el
        const kids = (el.props as any)?.children
        const arr = Array.isArray(kids) ? kids : kids ? [kids] : []
        return React.cloneElement(el as any, {
            children: [...arr, React.createElement(DrawerReadAllButton, { key: 'readall-drawer' })],
        })
    }
    cleanups.push(() => { target.createElement = orig })
    return true
}
