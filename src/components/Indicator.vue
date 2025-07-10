<template>
  <div>
    <div class="info-box">
      <div class="flex justify-between">
        <div
          class="text-left flex-1"
          @click="getTrackStatus"
        >
          <p>チャプター</p>
          <span class="text-4xl">{{ trackNumber }} / {{ totalTrackNumber }}</span>
        </div>
        <div
          class="text-center flex-1"
          @click="getStatus"
        >
          <p>{{ discStatus }}</p>
          <span class="text-4xl">{{ currentStatus }}</span>
        </div>
      </div>
    </div>
    <div class="info-box">
      <div class="flex justify-between">
        <div class="text-left flex-1">
          <p>経過</p>
          <span class="text-4xl">{{ elapseTimeStr }}</span>
        </div>
        <div class="text-left flex-1">
          <p>残り</p>
          <span class="text-4xl">{{ remainTimeStr }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import sendCommand from '../utils/sendCommand'

const props = defineProps({
  connected: {
    type: Boolean,
    required: true
  },
  stopped: {
    type: Boolean,
    required: true
  },
  currentStatus: {
    type: String,
    default: ''
  },
  discStatus: {
    type: String,
    default: ''
  },
  totalTrackNumber: {
    type: Number,
    default: null
  },
  trackNumber: {
    type: Number,
    default: null
  },
  elapseTime: {
    type: Number,
    default: null
  },
  remainTime: {
    type: Number,
    default: null
  }
})

const elapseTimeStr = ref('')
const remainTimeStr = ref('')
let updateInterval = null

const update = () => {
  elapseTimeStr.value = timeToStr(props.elapseTime)
  remainTimeStr.value = timeToStr(props.remainTime)
}

onMounted(() => {
  updateInterval = setInterval(update, 1000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

const timeToStr = (hhmmss) => {
  if (!hhmmss) {
    return '--:--:--'
  }

  const timeStr = hhmmss.toString().padStart(6, '0')
  const hours = timeStr.substring(0, 2)
  const minutes = timeStr.substring(2, 4)
  const seconds = timeStr.substring(4, 6)

  return `${hours}:${minutes}:${seconds}`
}

const getTrackStatus = () => {
  sendCommand('?SET')  // 8 Elapse Time
  sendCommand('?SRT')  // 9 Remain Time
}

const getStatus = () => {
  sendCommand('?MST')  // 2 Disc Status
  sendCommand('?STT')  // 4 Total Track Number
}
</script>

<style scoped>
@reference "tailwindcss";

.info-box {
  @apply w-[400px] bg-gray-700 rounded-lg p-4 mb-2 text-white;
}
</style>
