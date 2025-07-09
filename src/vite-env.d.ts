/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    connectToServer: (host: string, port: number) => Promise<void>
    sendCommand: (command: string) => boolean
    disconnect: () => void
    writeFile: (filePath: string, data: string) => Promise<void>
    readFile: (filePath: string) => Promise<string>
  }
}
