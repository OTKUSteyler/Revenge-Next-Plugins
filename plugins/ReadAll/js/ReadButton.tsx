import React from 'react'
import { Pressable, Text, View, StyleSheet, Alert } from 'react-native'
import { executeClearAll } from './ClearAll'
import { getData } from './settings'

export default function ReadButton() {
  const [busy, setBusy] = React.useState(false)

  const run = React.useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await executeClearAll()
      // toast is optional; import from './compat' if you want it
      // toast(`Cleared ${res.dms} DMs, ${res.channels} channels`)
    } finally {
      setBusy(false)
    }
  }, [busy])

  const onLongPress = React.useCallback(() => {
    const { excludedServers, excludedDMs } = getData()
    Alert.alert(
      'Read All+',
      `Excluded servers: ${excludedServers.length}\nExcluded DMs: ${excludedDMs.length}\n\nTap the pill to mark everything else as read.`,
      [{ text: 'OK' }],
    )
  }, [])

  return (
    <Pressable
      onPress={run}
      onLongPress={onLongPress}
      disabled={busy}
      hitSlop={10}
      style={({ pressed }) => [
        styles.pill,
        pressed && styles.pressed,
        busy && styles.busy,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Mark all servers and DMs as read"
    >
      <Text style={styles.label}>{busy ? 'Clearing…' : '✓ Read All'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999, // pill
    backgroundColor: 'rgba(88,101,242,0.95)', // blurple
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  busy: { opacity: 0.6 },
  label: { color: '#fff', fontWeight: '600', fontSize: 13 },
})
