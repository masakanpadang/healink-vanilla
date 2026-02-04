<template>
    <div class="flex w-full min-h-screen items-center justify-center">
        <div class="flex flex-col p-[16px] items-center bg-gray-100 rounded-xl min-h-[300px] min-w-[350px] items-center justify-center">
            <p>Generate Room's ID</p>
            <div class="flex flex-1 items-center text-[#3b62f0] font-bold text-2xl">
                <p v-if="roomID"> {{ roomID }} </p>
                <p v-else>-</p>
            </div>
            <NuxtLink v-if="roomID" :to="`/host/${roomID}/room`" class="w-full">
                <button class="flex items-center justify-center class mt-4 text-sm mt-4 bg-[#3b62f0] text-white rounded-lg px-2 py-1 hover:bg-[#244fec] focus:outline-none gap-4 w-full" @click="generateRoomID">
                    Join
                </button>
            </NuxtLink>
            <button v-else class="flex items-center justify-center class mt-4 text-sm mt-4 bg-[#3b62f0] text-white rounded-lg px-2 py-1 hover:bg-[#244fec] focus:outline-none gap-4 w-full" @click="generateRoomID">
                Generate
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
const roomID = ref('')

const generateRoomID = () => {
    if (roomID.value) return

    const generatedID = Math.random().toString(36).substring(2, 7).toUpperCase()
    const prefixID = 'RS'

    roomID.value = `${prefixID}-${generatedID}`
}
</script>
