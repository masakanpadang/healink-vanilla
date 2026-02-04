<template>
    <div class="flex flex-col w-full h-[100vh] bg-[#f6f6f6]">
        <div class="text-base font-bold text-white bg-[#3b62f0] p-[16px] flex items-center gap-2 shadow-xl">
            <img src="/assets/image/healink.png" class="w-[32px] h-[32px]"/> Healink
        </div>
        <div class="flex flex-1 p-[16px] items-center justify-center">
            <div class="flex flex-col bg-white w-[50vw] p-[32px] shadow-lg rounded-xl items-center">
                <p class="text-[#3b62f0] font-bold">Join As:</p>

                <img src="/assets/image/connect.png" class="w-[180px]"/>

                <NuxtLink to="/host" class="w-full">
                    <button class="flex items-center justify-center class mt-4 text-[10px] md:text-sm mt-4 bg-[#3b62f0] text-white rounded-lg px-2 py-1 hover:bg-[#244fec] focus:outline-none focus:ring-2 focus:ring-[#244fec] gap-4 w-full">
                        Host
                    </button>
                </NuxtLink>

                <NuxtLink to="/participant" class="w-full">
                    <button class="flex items-center justify-center class mt-4 text-[10px] md:text-sm mt-4 bg-[#fe5b19] text-white rounded-lg px-2 py-1 hover:bg-[#e55217] focus:outline-none focus:ring-2 focus:ring-[#e55217] gap-4 w-full">
                        Participant
                    </button>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
