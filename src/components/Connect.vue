<template>
  <div
    v-if="connected"
    class="flex justify-between mb-2"
  >
    <div class="flex-1"></div>
    <div class="flex-1 text-center">BD-MP1</div>
    <div class="flex-1 text-right cursor-pointer" @click="disconnect">x</div>
  </div>
  <div v-else>
    <div class="mb-4">
      <p class="mb-4">{{ message }}</p>
      <label for="deviceIp">IPアドレス</label>
      <input
        type="text"
        pattern="\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
        placeholder="000.000.000.000"
        id="deviceIp" v-model="deviceIp"
      />
      <button @click="connect">接続</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const defaultMessage = 'BD-MP1のIPアドレスを入力して接続してください'
const connected = ref(false)
const message = ref(defaultMessage)
const electronAPIAvailable = ref(false)

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

</script>
