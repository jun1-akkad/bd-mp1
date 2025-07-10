<template>
  <div>
    <Connect v-model="connected" />
    <Indicator
      v-if="connected"
      :connected="connected"
      :stopped="stopped"
      :current-status="currentStatus"
      :disc-status="discStatus"
      :total-track-number="totalTrackNumber"
      :track-number="trackNumber"
      :elapse-time="elapseTime"
      :remain-time="remainTime"
    />
    <Controller
      v-if="connected"
      :current-status="currentStatus"
      @play="stopped = false"
      @stop="stopped = true"
    />
    <ChapterKey
      v-if="connected"
      :total-track-number="totalTrackNumber"
      @play="stopped = false"
      @stop="stopped = true"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import sendCommand from './utils/sendCommand'
import Indicator from './components/Indicator.vue'
import Connect from './components/Connect.vue'
import Controller from './components/Controller.vue'
import ChapterKey from './components/ChapterKey.vue'

const connected = ref(false)
const stopped = ref(false)

// インターバルIDを保持するためのref
const interval = 500
const statusInterval = ref(null)

const currentStatus = ref('')
const discStatus = ref('')

const totalTrackNumber = ref()
const trackNumber = ref()
const totalGroupNumber = ref()
const groupNumber = ref()

const elapseTime = ref()
const remainTime = ref()

const getStatus = () => {
  sendCommand('?SST')  // 3 Status
  sendCommand('?MST')  // 2 Disc Status

  sendCommand('?STT')  // 4 Total Track Number
  sendCommand('?STC')  // 5 Track Number
  // sendCommand('?STG')  // 6 Total Group Number
  // sendCommand('?SGN')  // 7 Group Number

  if (!stopped.value && currentStatus.value === 'play') {
    sendCommand('?SET')  // 8 Elapse Time
    sendCommand('?SRT')  // 9 Remain Time
  }
}

// stoppedの値が変更された場合の処理
watch(() => stopped.value, (newStopped, oldStopped) => {
  if (newStopped) {
    // 停止状態になった場合の処理
    elapseTime.value = null
    remainTime.value = null
    currentStatus.value = 'stop'
  }
})

// sendCommand関数を定義（ControllerTest.vueから参考）
onMounted(() => {
  if (window.electronAPI) {
    window.electronAPI.onSocketData((data) => {
      onReceiveData(data)
    })
  }

  statusInterval.value = setInterval(() => {
    getStatus()
  }, interval)
})

onUnmounted(() => {
  // コンポーネントがアンマウントされる際にインターバルをクリア
  if (statusInterval.value) {
    clearInterval(statusInterval.value)
    statusInterval.value = null
  }
})

const onReceiveData = (data) => {
  // データが空の場合は何もしない
  if (!data || data.length === 0) {
    return
  }

  // nackで始まる場合はエラーとして扱う
  if (data.startsWith('nack')) {
    console.error('エラーを受信しました:', data)
    return
  }

  // ackのみの場合は何もしない
  if (data === 'ack') {
    return
  }

  // ack+!7で始まる場合
  let responseData = null
  if (data.startsWith('ack+!7')) {
    // ack+!7を除去した文字列を取得
    responseData = data.substring(6) // 'ack+!7'の長さは6文字
  } else if (data.startsWith('!7')) {
    responseData = data.substring(2) // '!7'の長さは2文字
  }

  if (responseData) {
    // 以降の処理を分岐
    handleResponseData(responseData)
    return
  }
}

const handleResponseData = (r) => {

  // ディスク状態
  if (r.startsWith('MST')) {
    if (r === 'MSTNC') {
      discStatus.value = 'no disc'
    } else if (r === 'MSTCI') {
      discStatus.value = 'disc OK'
    } else if (r === 'MSTUF') {
      discStatus.value = 'disc error'
    } else if (r === 'MSTTO') {
      discStatus.value = 'open'
    } else if (r === 'MSTTC') {
      discStatus.value = 'closed'
    } else if (r === 'MSTTE') {
      discStatus.value = 'error'
    }
    return
  }

  // 現在の状態
  if (r.startsWith('SST')) {
    if (!stopped.value && r === 'SSTPL') {
      currentStatus.value = 'play'
    } else if (r === 'SSTPP') {
      currentStatus.value = 'pause'
    } else if (r.startsWith('SSTDVS')) {
      currentStatus.value = 'show play'
    } else if (r === 'SSTDVSU') {
      currentStatus.value = 'setup mode'
    } else if (r === 'SSTDVTR') {
      currentStatus.value = 'track menu'
    } else if (r === 'SSTDVHM') {
      currentStatus.value = 'home'
      stopped.value = false
      trackNumber.value = ''
      groupNumber.value = ''
    }
    return
  }

  // トラック番号関連
  if (r.startsWith('TT')) {
    // TTN0001 or TT0001: 4桁まで行くことはないと見越して手抜き
    totalTrackNumber.value = parseInt(r.substring(3))
  } else if (r.startsWith('TN')) {
    // TNM0001 or TN0001: 4桁まで行くことはないと見越して手抜き
    trackNumber.value = parseInt(r.substring(3))
  } else if (r.startsWith('TG')) {
    totalGroupNumber.value = parseInt(r.substring(3))
  } else if (r.startsWith('GN')) {
    groupNumber.value = parseInt(r.substring(3))
  } else if (r.startsWith('SET')) {
    elapseTime.value = parseInt(r.substring(3))
  } else if (r.startsWith('SRT')) {
    const newValue = parseInt(r.substring(3))
    if (newValue != remainTime.value) {
      remainTime.value = newValue
      stopped.value = false
    }
  }
  return
}
</script>
