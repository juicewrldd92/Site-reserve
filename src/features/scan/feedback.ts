/**
 * Retour de scan réussi.
 *
 * En cuisine on ne regarde pas l'écran en permanence : il faut sentir ou
 * entendre que ça a mordu. Vibration quand le navigateur veut bien (Android),
 * bip court sinon — iOS ignore `navigator.vibrate`.
 */

let audioContext: AudioContext | null = null

export function scanFeedback(): void {
  if ('vibrate' in navigator) navigator.vibrate(35)
  beep()
}

function beep(): void {
  try {
    // L'AudioContext ne peut naître que d'un geste utilisateur : l'ouverture
    // du scanner en est un, on le crée à ce moment-là puis on le réutilise.
    audioContext ??= new AudioContext()
    if (audioContext.state === 'suspended') void audioContext.resume()

    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.13)
  } catch {
    // Pas de son disponible : la vibration et le visuel suffisent.
  }
}
