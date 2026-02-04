<template>
    <div class="flex w-full min-h-screen items-center justify-center">
        <div class="flex flex-col p-[16px] items-center bg-gray-100 rounded-xl min-h-[200px] min-w-[350px] items-center">
            <p class="flex-1">Use Room's ID to Join</p>
            
            <input type="text" class="text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#3b62f0] text-center h-[30px]" placeholder="input the id" v-model="roomID">
            <div class="flex w-full flex-1 items-end w-full">
                <NuxtLink :to="`/participant/${roomID}/room`" class="w-full">
                    <button class="flex items-center justify-center class text-sm bg-[#3b62f0] text-white rounded-lg px-2 py-1 hover:bg-[#244fec] focus:outline-none gap-4 w-full">
                        Join
                    </button>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const roomID = ref('')
</script>
