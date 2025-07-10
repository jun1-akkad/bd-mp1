<template>
  <div
    v-if="connected"
    class="flex justify-between mb-1"
  >
    <div class="flex-1"></div>
    <div class="flex-1 text-center">BD-MP1</div>
    <div class="flex-1 text-right cursor-pointer" @click="disconnect">...</div>
  </div>
  <div v-else>
    <div class="mb-4">
      <p class="mb-4">{{ message }}</p>

      <div class="mb-4">
        <label for="deviceIp">IPアドレス</label>
        <input
          type="text"
          pattern="\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
          placeholder="000.000.000.000"
          id="deviceIp" v-model="deviceIp"
          class="w-full p-2 border rounded"
        />
        <button @click="connect" class="mt-2 px-4 py-2 bg-green-500 text-white rounded">接続</button>
      </div>

      <div class="mb-4">
        <button
          @click="scanNetwork"
          :disabled="isScanning"
          class="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {{ isScanning ? 'スキャン中...' : 'ネットワークスキャン' }}
        </button>
      </div>

      <div v-if="networkDevices.length > 0" class="mb-4">
        <h3 class="text-lg font-semibold mb-2">検出されたデバイス</h3>
        <div class="max-h-40 overflow-y-auto border rounded">
          <div
            v-for="device in networkDevices"
            :key="device.ip"
            @click="selectDevice(device)"
            class="p-2 border-b cursor-pointer hover:bg-gray-100 last:border-b-0"
          >
            <div class="font-medium">{{ device.ip }}</div>
            <div class="text-sm text-gray-600">{{ device.mac }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const defaultMessage = 'BD-MP1のIPアドレスを入力して接続してください'
const connected = ref(false)
const message = ref(defaultMessage)
const electronAPIAvailable = ref(false)
const networkDevices = ref([])
const isScanning = ref(false)

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// BD-MP1 のIPアドレスとポート番号
const deviceIp = ref('192.168.1.')
// const deviceIp = ref('127.0.0.1')
const devicePort = 9030  // ポート番号は固定

const connect = async () => {
  message.value = '...'

  if (window.electronAPI) {
    message.value = 'Electron APIが利用可能です。接続を試行中...'

    try {
      await window.electronAPI.connectToServer(deviceIp.value, devicePort)
      connected.value = true
      emit('update:modelValue', true)
    } catch (error) {
      message.value = `接続エラー: ${error.message}`
    }
  } else {
    message.value = 'Electron APIが利用できません'
  }
}

const disconnect = () => {
  if (window.electronAPI && confirm('接続を切断しますか？')) {
    window.electronAPI.disconnect()
    connected.value = false
    emit('update:modelValue', false)

    message.value = defaultMessage
  } else {
    message.value = 'Electron APIが利用できません'
  }
}

const scanNetwork = async () => {
  if (!window.electronAPI) {
    message.value = 'Electron APIが利用できません'
    return
  }

  isScanning.value = true
  message.value = 'ネットワークをスキャン中...'

  try {
    const devices = await window.electronAPI.scanNetworkDevices()
    networkDevices.value = devices
    message.value = `${devices.length}個のデバイスを検出しました`
  } catch (error) {
    message.value = `スキャンエラー: ${error.message}`
    networkDevices.value = []
  } finally {
    isScanning.value = false
  }
}

const selectDevice = (device) => {
  deviceIp.value = device.ip
}

</script>
