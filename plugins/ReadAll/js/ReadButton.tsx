import React from 'react'
import { Pressable, Text, StyleSheet, Alert } from 'react-native'
import { executeClearAll } from './ClearAll'
import { getData } from './settings'

export default function ReadButton() {
  const [busy, setBusy] = React.useState(false)
  const { pillBottom, pillRight } = getData()

  const run = React.useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      await executeClearAll()
    } finally {
      setBusy(false)
    }
  }, [busy])

  const onLongPress = React.useCallback(() => {
    const { excludedServers, excludedDMs } = getData()
    Alert.alert(
      'Read All+',
      `Excluded servers: ${excludedServers.length}\nExcluded DMs: ${excludedDMs.length}\n\nTap to mark everything else as read.`,
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
        { position: 'absolute', bottom: pillBottom, right: pillRight }, // <-- POSITIONING APPLIED
        pressed && styles.pressed,
        busy && styles.busy,
      ]}
    >
      <Text style={styles.label}>{busy ? 'Clearing...' : '✓ Read All'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(88,101,242,0.95)', // Discord Blurple
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 99999,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  busy: { opacity: 0.6 },
  label: { color: '#fff', fontWeight: '600', fontSize: 12 },
})
