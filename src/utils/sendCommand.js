export default function sendCommand(command) {
  if (!window.electronAPI) {
    return false
  }

  return window.electronAPI.sendCommand(`!7${command}\r`)
}
