import React from 'react'
import { View } from 'react-native'
import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'
import { executeClearAll } from './ClearAll'

// 一个适配抽屉布局的行按钮（非绝对定位）
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
            require('react-native').Text,
            { style: { color: '#fff', fontWeight: '600', textAlign: 'center' } },
            'Read All',
        ),
    )
}

/**
 * 在抽屉容器 children 末尾追加 Read All 按钮。
 * 依赖调用方已有的抽屉容器判据 isDrawerContainer。
 */
export function patchReadAllInDrawer(
    cleanups: (() => void)[],
    isDrawerContainer: (type: any, props: any) => boolean,
) {
    const target = getModules(withProps('createElement'))[0]
    if (!target) return false

    const orig = target.createElement
    target.createElement = function (type: any, props: any, ...rest: any[]) {
        const el = orig.call(this, type, props, ...rest)
        if (!isDrawerContainer(type, props)) return el
        if (!React.isValidElement(el)) return el

        const kids = el.props?.children
        const arr = Array.isArray(kids) ? kids : kids ? [kids] : []
        return React.cloneElement(el, {
            children: [...arr, React.createElement(DrawerReadAllButton, { key: 'readall-drawer' })],
        })
    }
    cleanups.push(() => { target.createElement = orig })
    return true
}
