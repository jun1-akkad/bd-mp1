<template>
  <div class="controller-box">
    <div class="flex justify-between">
      <button
        class="btn-m"
        @click="stop"
      >⏹</button>
      <button
        class="btn-l"
        :class="{ 'text-green-300': props.currentStatus === 'play' }"
        @click="play"
      >▶</button>
      <button
        class="btn-m"
        :class="{
          'text-green-300': props.currentStatus === 'pause' && isBlinking,
          'text-red-200': props.currentStatus === 'pause' && !isBlinking
        }"
        @click="sendCommand('PAS')"
      >⏸</button>
    </div>
    <div class="flex justify-between mt-2">
       <button
         class="btn-s"
         @click="sendCommand('SKPPV')"
       >⏮</button>
       <button
         class="btn-s"
         @click="sendCommand('SKPNX')"
       >⏭</button>
     </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import sendCommand from '../utils/sendCommand'

const props = defineProps({
  currentStatus: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['stop', 'play'])

// 点滅状態を管理する変数
const isBlinking = ref(false)
let blinkInterval = null

const play = () => {
  sendCommand('PLY')
  emit('play')
}

const stop = () => {
  sendCommand('STP')
  emit('stop')
}

// pause状態の監視
watch(() => props.currentStatus, (newStatus) => {
  if (newStatus === 'pause') {
    // pause状態になったら点滅を開始
    startBlinking()
  } else {
    // 他の状態になったら点滅を停止
    stopBlinking()
  }
})

// 点滅開始
const startBlinking = () => {
  if (blinkInterval) {
    return
  }

  blinkInterval = setInterval(() => {
    isBlinking.value = !isBlinking.value
  }, 500) // 500ms間隔で点滅
}

// 点滅停止
const stopBlinking = () => {
  if (blinkInterval) {
    clearInterval(blinkInterval)
    blinkInterval = null
  }
  isBlinking.value = false
}

// コンポーネントのマウント時
onMounted(() => {
  // 初期状態でpauseの場合は点滅を開始
  if (props.currentStatus === 'pause') {
    startBlinking()
  }
})

// コンポーネントのアンマウント時
onUnmounted(() => {
  stopBlinking()
})
</script>

<style scoped>
@reference "tailwindcss";

.controller-box {
  @apply w-[400px] bg-gray-700 rounded-lg p-2 mb-2 text-white;
}

.btn-l {
  @apply w-[180px] h-[80px] rounded-lg px-4 text-3xl;
}

.btn-m {
  @apply w-[80px] h-[80px] rounded-lg px-4 text-3xl;
}

.btn-s {
  @apply w-[80px] h-[60px] rounded-lg px-4 text-2xl;
}
</style>
