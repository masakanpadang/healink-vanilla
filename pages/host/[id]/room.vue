<template>
    <div class="flex w-full min-h-screen">
      <div class="flex flex-col w-full">
        <div class="flex w-full bg-[#3b62f0] p-4 text-white w-full items-center gap-4">
            <div class="flex flex-col flex-1">
                <p class="text-xs">Room's ID</p>
                <p class="font-bold text-xl">{{ roomID }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button v-if="!totalDurationTime" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-orange-400 text-white rounded-lg px-2 py-1 hover:bg-orange-500 focus:outline-none" @click="switchCameraInternal">
                    Switch Camera
                </button>
                <button v-if="showEraserLine" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-orange-400 text-white rounded-lg px-2 py-1 hover:bg-orange-500 focus:outline-none" @click="clearAnnotation(false)">
                    Clear Annotation
                </button>
                <button v-if="onCall" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-red-400 text-white rounded-lg px-2 py-1 hover:bg-red-500 focus:outline-none" @click="endCall">
                    End call
                </button>
            </div>
        </div>

        <div v-if="totalDurationTime" class="flex p-4 bg-gray-100 w-full justify-center">
            <p>The call has <span class="text-red-400 font-bold">ended</span>. Total duration <span class="text-red-400 font-bold">{{ totalDurationTime }}</span></p>
        </div>
        
        <div v-else class="flex flex-col w-screen">
            <div class="relative w-screen flex justify-center items-center p-4">
                <video ref="cameraInput" autoplay playsinline class="w-full h-[50vw] object-cover rounded-xl transform scale-x-[-1]"></video>

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
                <div id="remote-stream" class="w-[120px] h-[120px] mt-4 rounded-xl overflow-hidden transform scale-x-[-1]"></div>
            </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { addDoc, collection, deleteDoc, Firestore, getDocs, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useAgora } from '~/composable/agora';
import { getCoordinates } from '~/utils/canvasUtils';

const route = useRoute()
const roomID = ref(route.params.id as string ?? '')
const config = useRuntimeConfig()
const appID = ref(config.public.APP_ID)
// TODO: still hardcoded, need to be get from the user data once we have backend to maintain user.
const userUUID = ref('host')
const canvas = ref<HTMLCanvasElement | null>(null)
const ctxCanvas = ref<CanvasRenderingContext2D | null>(null)
const cameraInput = ref<HTMLVideoElement | null>(null)
const startTime = ref()
const totalDurationTime = ref<string | null>(null)
const onCall = ref(false)
const isDrawing = ref(false)
const showEraserLine = ref(false)
const lastX = ref<number | null>(null)
const lastY = ref<number | null>(null)
const availableCameras = ref<MediaDeviceInfo[]>([])
const selectedCameraId = ref<string | null>(null)
const lines: Ref<LineData[]> = ref([])

const { $firestore } = useNuxtApp()
const { client, joinChannel, localVideoTrack, localAudioTrack, leaveChannel, switchCamera } = useAgora(appID.value, roomID.value, userUUID.value)

interface LineData {
    startX: number; startY: number; endX: number; endY: number; role: number;
}

onMounted(async () => {
    await getAvailableCameras();
    if (availableCameras.value.length > 0) {
        selectedCameraId.value = availableCameras.value[0].deviceId
        await startCamera(selectedCameraId.value)
    }
    join()
    addLineDataToFirestore()

    document.body.classList.add('overflow-hidden')
    listenUserPublish()
    nextTick(() => {
        if (cameraInput.value) {
            cameraInput.value.onloadeddata = () => {
                setCanvasSize()
                listenToDrawingUpdates()
            }
        }
        window.addEventListener('resize', () => {
            setCanvasSize()
            drawLineOnCanvas()
        })
    })
})

onBeforeUnmount(() => {
    clearSession()
})

const getAvailableCameras = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        availableCameras.value = devices.filter((device) => device.kind === 'videoinput')
    } catch (error) {
        console.error('Error fetching available cameras:', error)
    }
}

const switchCameraInternal = async () => {
    if (availableCameras.value.length < 2) {
        alert('No other cameras available to switch to.')
        return
    }

    // Find the next camera in the list
    const currentIndex = availableCameras.value.findIndex((camera) => camera.deviceId === selectedCameraId.value)
    const nextIndex = (currentIndex + 1) % availableCameras.value.length
    selectedCameraId.value = availableCameras.value[nextIndex].deviceId
    // Restart the camera with the new device ID
    await stopCamera()
    const videoTrack = switchCamera(selectedCameraId.value)
    await startCamera(selectedCameraId.value)
}

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":")
};

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
    stopCamera()
    leaveChannel()
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
            ctxCanvas.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
        }
    } catch (err) {
        console.error('Error clearing annotation', err)
    }
}

const startCamera = async (cameraId?: string) => {
    if (!cameraInput.value) return

    try {
        const constraints: MediaStreamConstraints = {
            video: cameraId ? { deviceId: { exact: cameraId } } : true,
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        cameraInput.value.srcObject = stream
        cameraInput.value.play()
    } catch (error) {
        alert("Could not access the camera.")
    }
}

const stopCamera = async () => {
    if (!cameraInput.value || !cameraInput.value.srcObject) return

    try {
        const stream = cameraInput.value.srcObject as MediaStream
        stream.getTracks().forEach((track) => {
            track.stop()
        })
        cameraInput.value.srcObject = null
    } catch (error) {
        alert("Could not access the camera.")
    }
}

const firestore = computed(() => {
    return $firestore as Firestore
})

const join = async () => {
    startTime.value = Date.now()
    onCall.value = true

    const res = await joinChannel(selectedCameraId.value ?? undefined)
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
        const video = cameraInput.value
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
    const lineData = { startX: lastX.value!, startY: lastY.value!, endX: x, endY: y, timestamp: Timestamp.now(), role: 1 }
    lines.value.push(lineData)

    addLineDataToFirestore(lineData)
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
    const lineData = { startX: lastX.value!, startY: lastY.value!, endX: x, endY: y, timestamp: Timestamp.now(), role: 1 }
    lines.value.push(lineData)

    addLineDataToFirestore(lineData)
    drawLineOnCanvas()
  
    lastX.value = x
    lastY.value = y
}

// Function to add line data to Firestore to make sure that the data is saved and the room is available for
// participant to join.
const addLineDataToFirestore = async (lineData?: LineData) => {
    try {
      const linesCollection = collection(firestore.value, roomID.value)
      await addDoc(linesCollection, lineData ?? {})
    } catch (err) {
      console.error('Error saving line data to Firestore', err)
    }
}
</script>
