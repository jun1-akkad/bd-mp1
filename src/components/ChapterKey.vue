<template>
  <div class="chapter-key-box">
    <div
      v-if="false"
      class="flex justify-between mb-4"
      >
      <button
        @click="mode = 'chapter'"
      >Chapter</button>
      <button
        @click="mode = 'cursor'"
      >Cursor</button>
    </div>
    <div
      v-if="mode === 'chapter'"
      class="grid grid-cols-4 gap-2 mb-4"
    >
      <div
        class="w-full"
        v-for="i in 16"
        :key="startChapter + i"
      >
        <button
          v-if="(startChapter + i) <= totalTrackNumber"
          class="w-full h-12 text-2xl rounded"
          @click="jumpTo(startChapter + i)"
        >{{ startChapter + i }}</button>
        <button
          :disabled="true"
          class="w-full h-12 text-2xl rounded"
          v-else></button>
      </div>
    </div>
    <div
      v-if="mode === 'chapter'"
      class="flex justify-between"
    >
      <button
        :disabled="startChapter === 0"
        @click="startChapter -= 16"
      >＜＜</button>
      <button
        :disabled="startChapter + 16 >= totalTrackNumber"
        @click="startChapter += 16"
      >＞＞</button>
    </div>
    <div
      v-if="mode === 'cursor'"
      class="grid grid-cols-3 gap-2"
    >
      <div></div>
      <button @click="sendCommand('OSD3')">Up</button>
      <div></div>

      <button @click="sendCommand('OSD1')">Left</button>
      <button @click="sendCommand('ENT')">Enter</button>
      <button @click="sendCommand('OSD2')">Right</button>

      <div></div>
      <button @click="sendCommand('OSD4')">Down</button>
      <div></div>

      <div></div>
      <div></div>
      <div></div>

      <button @click="home">Home</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import sendCommand from '../utils/sendCommand'

const props = defineProps({
  totalTrackNumber: {
    type: Number,
    default: 256
  },
})

const emit = defineEmits(['stop', 'play'])

const mode = ref('chapter')
const startChapter = ref(0)

const jumpTo = (chapter) => {
  const chapterStr = chapter.toString().padStart(4, '0')
  sendCommand(`SKP${chapterStr}`)
  emit('play')
}

const home = () => {
  sendCommand('HOM')
  emit('stop')
}
</script>

<style scoped>
@reference "tailwindcss";

.chapter-key-box {
  @apply w-[400px] bg-gray-700 rounded-lg p-2 mb-2 text-white;
}

</style>
