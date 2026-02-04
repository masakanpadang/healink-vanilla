<template>
    <div class="flex w-full min-h-screen">

    <div v-if="roomDoesntExist" class="flex p-4 bg-gray-100 w-screen justify-center">
        <p>Sorry the room doesnt exist. Contact the host to create new room</p>
    </div>
    <div v-else id="flex flex-col w-full h-screen items-center">
        <div class="flex w-full bg-[#3b62f0] p-4 text-white w-full items-center">
            <div class="flex flex-col flex-1">
                <p class="text-xs">Room's ID</p>
                <p class="font-bold text-xl">{{ roomID }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button v-if="showEraserLine" class="h-[25px] flex items-center justify-center class text-sm bg-orange-400 text-white rounded-lg px-2 py-1 hover:bg-orange-500 focus:outline-none" @click="clearAnnotation(false)">
                    Clear Annotation
                </button>
                <button v-if="onCall" class="h-[25px] flex items-center justify-center class text-sm bg-red-400 text-white rounded-lg px-2 py-1 hover:bg-red-500 focus:outline-none" @click="endCall">
                    End call
                </button>
            </div>
        </div>

        <div v-if="totalDurationTime" class="flex p-4 bg-gray-100 w-screen justify-center">
            <p>The call has <span class="text-red-400 font-bold">ended</span>. Total duration <span class="text-red-400 font-bold">{{ totalDurationTime }}</span></p>
        </div>
        
        <div v-else class="flex flex-col w-screen">
            <div class="relative w-screen h-full flex justify-center items-center p-4">
                <div ref="remoteStream" id="remote-stream" class="w-full h-[50vw] bg-gray-300 object-contain rounded-xl overflow-hidden transform scale-x-[-1]"/>

                <canvas
                    ref="canvas"
                    class="absolute"
                    @mousedown="startDraw"
                    @mousemove="draw"
                    @mouseup="stopDraw"
                    @touchstart="startDrawTouch"
                    @touchmove="drawTouch"
                    @touchend="stopDraw"
                />
            </div>
        
            <div class="absolute bottom-0 left-0 flex p-4">
                <div id="local-stream" class="w-[120px] h-[120px] mt-4 rounded-xl overflow-hidden transform scale-x-[-1]"></div>
            </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { addDoc, collection, deleteDoc, doc, Firestore, getDocs, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useAgora } from '~/composable/agora';
import { getCoordinates } from '~/utils/canvasUtils';

const route = useRoute()
const config = useRuntimeConfig()
const appID = ref(config.public.APP_ID)
const roomID = ref(route.params.id as string ?? '')
const remoteStream = ref<HTMLVideoElement | null>(null)
// TODO: still hardcoded, need to be get from the user data once we have backend to maintain user.
const userUUID = ref('proctor')
const canvas = ref<HTMLCanvasElement | null>(null)
const ctxCanvas = ref<CanvasRenderingContext2D | null>(null)
const startTime = ref()
const totalDurationTime = ref<string | null>(null)
const onCall = ref(false)
const isDrawing = ref(false)
const showEraserLine = ref(false)
const lastX = ref<number | null>(null)
const lastY = ref<number | null>(null)
const lines: Ref<LineData[]> = ref([])
const roomDoesntExist = ref(false)

const { $firestore } = useNuxtApp()
const { client, joinChannel, localVideoTrack, localAudioTrack, leaveChannel} = useAgora(appID.value, roomID.value, userUUID.value)

interface LineData {
    startX: number; startY: number; endX: number; endY: number; role: number; timestamp: Timestamp
}

onMounted(async() => {
    await checkRoom()
    if (roomDoesntExist.value) return

    setCanvasSize()
    join()
    monitorRoom()
    listenUserPublish()
    listenToDrawingUpdates()
    document.body.classList.add('overflow-hidden')
    window.addEventListener('resize', () => {
        setCanvasSize()
        drawLineOnCanvas()
    })
})

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":")
};

onBeforeUnmount(() => {
    clearSession()
})

const endCall = () => {
    clearSession()

    const endTime = Date.now()
    const durationInSeconds = Math.floor((endTime - startTime.value) / 1000)
    totalDurationTime.value = formatTime(durationInSeconds)
    onCall.value = false
}

const clearSession = () => {
    if (localAudioTrack.value) {
        localAudioTrack.value.stop()
        localAudioTrack.value.close()
    }

    if (localVideoTrack.value) {
        localVideoTrack.value.stop()
        localVideoTrack.value.close()
    }

    clearAnnotation(true)
    leaveChannel()
}

// check if the room exists. if not, set roomDoesntExist to true
// to prevent the participant joining unavailable room.
const checkRoom = async() => {
    try {
        const roomDoc = collection(firestore.value, roomID.value)
        const res = await getDocs(roomDoc)
        roomDoesntExist.value = res.empty
    } catch (err) {
        console.error('Error monitoring room', err)
    }
}

// will end the call when the room is deleted or ended by host.
const monitorRoom = () => {
    try {
        const roomDoc = collection(firestore.value, roomID.value)
        onSnapshot(roomDoc, (col) => {
            if (col.empty) {
                endCall()
            }
        }, (error) => {
            console.error('Error monitoring room deletion', error)
        })
    } catch (err) {
        console.error('Error monitoring room', err)
    }
}

// clear all the lines in the canvas and delete all the lines in Firestore.
const clearAnnotation = async (endCall: boolean) => {
    try {
        const linesCollection = collection(firestore.value, roomID.value)
        const q = query(linesCollection)
        const snapshot = await getDocs(q)

        if (endCall) {
            snapshot.docs.forEach((doc) => {
                deleteDoc(doc.ref)
            })
        } else {
            snapshot.docs.forEach((doc) => {
                const lineData = doc.data() as LineData
                if (lineData.startX != null && lineData.startY != null && lineData.endX != null && lineData.endY != null) {
                    deleteDoc(doc.ref)
                }
            })
        }
        
        // clear canvas locally once successfully cleared in Firestore
        if (ctxCanvas.value && canvas.value) {
            ctxCanvas.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
        }
    } catch (err) {
        console.error('Error clearing annotation', err)
    }
}

const firestore = computed(() => {
    return $firestore as Firestore
})

const join = async () => {
    startTime.value = Date.now()
    onCall.value = true

    const res = await joinChannel()
    const localElement = document.getElementById('local-stream')
    if (localElement) {
        res?.localVideoTrack.value?.play(localElement)
    }
}

const listenToDrawingUpdates = async () => {
    const linesCollection = collection(firestore.value, roomID.value)
    const q = query(linesCollection, orderBy('timestamp'))
    
    onSnapshot(q, (snapshot) => {
        showEraserLine.value = snapshot.size > 0
        lines.value = snapshot.docs.map(doc => doc.data() as LineData)
        drawLineOnCanvas()
    })
}

const setCanvasSize = () => {
    if (!canvas.value) return

    ctxCanvas.value = canvas.value.getContext('2d')
    if (ctxCanvas.value) {
        const video = remoteStream.value
        const displayedWidth = video?.clientWidth || 0
        const displayedHeight = video?.clientHeight || 0
        canvas.value.width = displayedWidth
        canvas.value.height = displayedHeight
        ctxCanvas.value.lineWidth = 2
    }
}

const drawLineOnCanvas = () => {
    if (ctxCanvas.value && canvas.value) {
        ctxCanvas.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
    }

    lines.value.forEach(lineData => {
        if (ctxCanvas.value) {
            const width = canvas.value?.width ?? 1
            const height = canvas.value?.height ?? 1
            // set the color based on the role. role 1 is for the host and role 2 is for the participant.
            ctxCanvas.value.strokeStyle = lineData.role === 1 ? 'blue' : 'red'
            ctxCanvas.value.beginPath()
            ctxCanvas.value.moveTo(lineData.startX * width, lineData.startY * height)
            ctxCanvas.value.lineTo(lineData.endX * width, lineData.endY  * height)
            ctxCanvas.value.stroke()
        }
    })
}

const listenUserPublish = async () => {
    client.value.on('user-published', async (user: { uid: any; videoTrack: any; audioTrack: any }, mediaType: string) => {
        if (user.uid === userUUID.value) return

        if (mediaType === 'video') {
            await client.value.subscribe(user, 'video')
            const remoteStream = user.videoTrack
            const remoteElement = document.getElementById('remote-stream')
            if (remoteElement) {
                remoteStream.play(remoteElement)
            }
        } else if (mediaType === 'audio') {
            await client.value.subscribe(user, 'audio')
            user.audioTrack.play()
        }
    })
}

const startDraw = (event: MouseEvent) => {
    isDrawing.value = true
    const { x, y } = getCoordinates(event, canvas.value)
    lastX.value = x
    lastY.value = y
}

const draw = (event: MouseEvent) => {
    if (!isDrawing.value || !ctxCanvas.value) return
    const { x, y } = getCoordinates(event, canvas.value)
    const lineData = { startX: lastX.value!, startY: lastY.value!, endX: x, endY: y, timestamp: Timestamp.now(), role: 2 }
    lines.value.push(lineData)

    saveLineDataToFirestore(lineData)
    drawLineOnCanvas()
  
    lastX.value = x
    lastY.value = y
}

const stopDraw = () => {
    isDrawing.value = false
}

const startDrawTouch = (event: TouchEvent) => {
    isDrawing.value = true
    const { x, y } = getCoordinates(event, canvas.value, true)
    lastX.value = x
    lastY.value = y
}

const drawTouch = (event: TouchEvent) => {
    if (!isDrawing.value || !ctxCanvas.value) return

    const { x, y } = getCoordinates(event, canvas.value, true)
    const lineData = { startX: lastX.value!, startY: lastY.value!, endX: x, endY: y, timestamp: Timestamp.now(), role: 2 }
    lines.value.push(lineData)

    saveLineDataToFirestore(lineData)
    drawLineOnCanvas()
  
    lastX.value = x
    lastY.value = y
}

const saveLineDataToFirestore = async (lineData: LineData) => {
    try {
      const linesCollection = collection(firestore.value, roomID.value)
      await addDoc(linesCollection, lineData)
    } catch (err) {
      console.error('Error saving line data to Firestore', err)
    }
}
</script>
