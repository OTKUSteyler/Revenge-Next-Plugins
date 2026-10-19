import React from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { findByProps, findByStoreName, toast } from './compat'

export interface ReadAllData {
	excludedServers: string[]
	excludedDMs: string[]
	pillBottom: number
	pillRight: number
}

const EMPTY: ReadAllData = { 
	excludedServers: [], 
	excludedDMs: [],
	pillBottom: 60,
	pillRight: 16
}

let storage:
	| {
			cache?: Partial<ReadAllData>
			set(value: Partial<ReadAllData>): unknown
	  }
	| undefined

export function bindStorage(s: typeof storage) {
	storage = s
}

export function getData(): ReadAllData {
	const cache = storage?.cache
	return {
		excludedServers: Array.isArray(cache?.excludedServers) ? cache.excludedServers : EMPTY.excludedServers,
		excludedDMs: Array.isArray(cache?.excludedDMs) ? cache.excludedDMs : EMPTY.excludedDMs,
		pillBottom: typeof cache?.pillBottom === 'number' ? cache.pillBottom : EMPTY.pillBottom,
		pillRight: typeof cache?.pillRight === 'number' ? cache.pillRight : EMPTY.pillRight,
	}
}

export const isServerExcluded = (id: string) => getData().excludedServers.includes(id)
export const isDMExcluded = (id: string) => getData().excludedDMs.includes(id)

const serverName = (id: string) => {
	try {
		const guild = findByStoreName('GuildStore')?.getGuild?.(id)
		return guild?.name ? `${guild.name} (${id})` : id
	} catch { return id }
}

const dmName = (id: string) => {
	try {
		const channel = findByStoreName('ChannelStore')?.getChannel?.(id)
		if (channel?.name) return `${channel.name} (${id})`
		const first = channel?.recipients?.[0]
		if (first) {
			const user = findByStoreName('UserStore')?.getUser?.(first)
			return user?.username ? `@${user.username} (${id})` : id
		}
	} catch {}
	return id
}

export default function Settings({ api }: { api: any }) {
	const h = React.createElement
	const { ScrollView } = findByProps('ScrollView')
	const { TableRowGroup, TableRow, Stack, TextInput } = findByProps(
		'TableRowGroup', 'TableRow', 'Stack', 'TextInput',
	)

	const data: ReadAllData = { ...EMPTY, ...(api.jsonStorage.use() ?? getData()) }
	const [serverInput, setServerInput] = React.useState('')
	const [dmInput, setDmInput] = React.useState('')

	const section = (
		kind: 'excludedServers' | 'excludedDMs',
		title: string, listTitle: string, placeholder: string, addLabel: string, addSub: string,
		input: string, setInput: (v: string) => void, nameOf: (id: string) => string,
	) => {
		const add = () => {
			const id = input.trim()
			if (!id) return toast('Please enter an ID')
			if (data[kind].includes(id)) return toast('Already excluded')
			void api.jsonStorage.set({ [kind]: [...data[kind], id] })
			setInput('')
			toast('Exception added')
		}
		const remove = (id: string) => {
			void api.jsonStorage.set({ [kind]: data[kind].filter((x: string) => x !== id) })
			toast('Exception removed')
		}

		return [
			h(TableRowGroup, { key: `${kind}-in`, title },
				h(Stack, { spacing: 4 },
					h(TextInput, { placeholder, value: input, onChange: setInput, isClearable: true, onSubmitEditing: add, returnKeyType: 'done' })
				)
			),
			h(TableRowGroup, { key: `${kind}-add` },
				h(TableRow, { label: addLabel, subLabel: addSub, trailing: h(TableRow.Arrow), onPress: add })
			),
			data[kind].length > 0 && h(TableRowGroup, { key: `${kind}-list`, title: listTitle },
				data[kind].map((id: string) =>
					h(TableRow, {
						key: id, label: nameOf(id),
						trailing: h(TouchableOpacity, { onPress: () => remove(id) },
							h(Text, { style: { color: '#ff4d4d', fontSize: 18 } }, '✕')
						),
					})
				),
			),
		]
	}

	return h(ScrollView, { style: { flex: 1 }, contentContainerStyle: { padding: 10 } },
		h(Stack, { spacing: 8 },
			h(TableRowGroup, { title: 'Read All+ Info' },
				h(TableRow, { label: 'What is this?', subLabel: 'Mark all unread servers and DMs as read with one command, excluding listed IDs' })
			),
			
			// --- NEW: Layout Settings ---
			h(TableRowGroup, { title: 'Floating Pill Position' },
				h(Stack, { spacing: 4 },
					h(TextInput, { 
						placeholder: 'Bottom Offset (e.g. 60)', 
						value: String(data.pillBottom), 
						onChange: (v: string) => void api.jsonStorage.set({ pillBottom: parseInt(v) || 0 }) 
					}),
					h(TextInput, { 
						placeholder: 'Right Offset (e.g. 16)', 
						value: String(data.pillRight), 
						onChange: (v: string) => void api.jsonStorage.set({ pillRight: parseInt(v) || 0 }) 
					})
				)
			),

			...section('excludedServers', 'Exclude Server', 'Excluded Servers', 'Enter Server ID', 'Add Server Exception', 'Prevent this server from being marked as read', serverInput, setServerInput, serverName),
			...section('excludedDMs', 'Exclude DM / Group', 'Excluded DMs', 'Enter Channel ID', 'Add DM Exception', 'Prevent this channel from being marked as read', dmInput, setDmInput, dmName),
		)
	)
}
