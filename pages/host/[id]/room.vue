<template>
    <div class="flex w-full min-h-screen">
      <div class="flex flex-col w-full">
        <div class="flex w-full bg-[#3b62f0] p-4 text-white w-full items-center gap-4">
            <div class="flex flex-col flex-1">
                <p class="text-xs">Room's ID</p>
                <p class="font-bold text-xl">{{ roomID }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button v-if="!totalDurationTime && !isRecording" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-red-500 text-white rounded-lg px-2 py-1 hover:bg-red-600 focus:outline-none" @click="startRecording">
                    ⏺ Start Recording
                </button>
                <button v-if="!totalDurationTime && isRecording" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-gray-500 text-white rounded-lg px-2 py-1 hover:bg-gray-600 focus:outline-none" @click="stopRecording">
                    ⏹ Stop Recording
                </button>
                <button v-if="!totalDurationTime" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-green-400 text-white rounded-lg px-2 py-1 hover:bg-green-500 focus:outline-none" @click="toggleStatsModal">
                    {{ showStats ? 'Hide Stats' : 'Show Stats' }}
                </button>
                <button v-if="!totalDurationTime && statsHistory.length > 0" class="h-[25px] flex items-center justify-center class text-xs md:text-sm bg-purple-400 text-white rounded-lg px-2 py-1 hover:bg-purple-500 focus:outline-none" @click="exportStatsToCSV">
                    Export Stats
                </button>
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

        <!-- Stats Modal -->
        <div v-if="showStats" class="absolute top-20 right-4 bg-white shadow-lg rounded-lg p-4 w-80 z-50 border border-gray-200">
            <h3 class="text-lg font-bold mb-3 text-gray-800">Quality Stats</h3>
            
            <div class="mb-4">
                <h4 class="font-semibold text-sm text-blue-600 mb-2">📹 Local Video</h4>
                <div class="space-y-1 text-xs">
                    <p><span class="font-medium">Resolusi:</span> {{ localStats.resolution }}</p>
                    <p><span class="font-medium">FPS:</span> {{ localStats.fps }}</p>
                    <p><span class="font-medium">Send Audio Bitrate:</span> {{ localStats.sendAudioBitrate }} kbps</p>
                    <p><span class="font-medium">Send Video Bitrate:</span> {{ localStats.sendVideoBitrate }} kbps</p>
                </div>
            </div>

            <div>
                <h4 class="font-semibold text-sm text-green-600 mb-2">📡 Remote Video</h4>
                <div v-if="remoteStats.uid" class="space-y-1 text-xs">
                    <p><span class="font-medium">Delay:</span> {{ remoteStats.delay }} ms</p>
                    <p><span class="font-medium">Resolusi:</span> {{ remoteStats.resolution }}</p>
                    <p><span class="font-medium">FPS:</span> {{ remoteStats.fps }}</p>
                    <p><span class="font-medium">Received Audio Bitrate:</span> {{ remoteStats.recvAudioBitrate }} kbps</p>
                    <p><span class="font-medium">Received Video Bitrate:</span> {{ remoteStats.recvVideoBitrate }} kbps</p>
                </div>
                <p v-else class="text-xs text-gray-500">No remote user connected</p>
            </div>
        </div>

        <!-- Recording Indicator -->
        <div v-if="isRecording" class="absolute top-24 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 z-50 animate-pulse">
            <span class="w-2 h-2 bg-white rounded-full"></span>
            Recording {{ recordingDuration }}
        </div>

        <div v-if="totalDurationTime" class="flex p-4 bg-gray-100 w-full justify-center">
            <p>The call has <span class="text-red-400 font-bold">ended</span>. Total duration <span class="text-red-400 font-bold">{{ totalDurationTime }}</span></p>
        </div>
        
        <div v-else class="flex flex-col w-screen">
            <div class="relative w-screen flex justify-center items-center p-4">
                <div id="local-video-main" class="w-full h-[50vw] bg-gray-300 object-cover rounded-xl transform scale-x-[-1]"></div>

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
const userUUID = ref('host')
const canvas = ref<HTMLCanvasElement | null>(null)
const ctxCanvas = ref<CanvasRenderingContext2D | null>(null)
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

// Stats monitoring
const showStats = ref(false)
const statsInterval = ref<NodeJS.Timeout | null>(null)
const localStats = ref({
    resolution: '-',
    fps: 0,
    sendAudioBitrate: 0,
    sendVideoBitrate: 0
})
const remoteStats = ref({
    uid: null as string | null,
    delay: 0,
    resolution: '-',
    fps: 0,
    recvAudioBitrate: 0,
    recvVideoBitrate: 0
})

// Recording
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedChunks = ref<Blob[]>([])
const isRecording = ref(false)
const recordingDuration = ref('00:00')
const recordingTimer = ref<NodeJS.Timeout | null>(null)
const recordingStartTime = ref(0)

interface StatsHistoryItem {
    timestamp: string
    localResolution: string
    localFps: number
    localSendAudioBitrate: number
    localSendVideoBitrate: number
    remoteDelay: number
    remoteResolution: string
    remoteFps: number
    remoteRecvAudioBitrate: number
    remoteRecvVideoBitrate: number
}

const statsHistory = ref<StatsHistoryItem[]>([])

const { $firestore } = useNuxtApp()
const { client, joinChannel, localVideoTrack, localAudioTrack, leaveChannel, switchCamera } = useAgora(appID.value, roomID.value, userUUID.value)

interface LineData {
    startX: number; startY: number; endX: number; endY: number; role: number;
}

onMounted(async () => {
    await getAvailableCameras();
    if (availableCameras.value.length > 0) {
        selectedCameraId.value = availableCameras.value[0].deviceId
    }
    
    await join()
    await addLineDataToFirestore()

    document.body.classList.add('overflow-hidden')
    listenUserPublish()
    
    nextTick(() => {
        setTimeout(() => {
            setCanvasSize()
            listenToDrawingUpdates()
        }, 1000)
        
        window.addEventListener('resize', () => {
            setCanvasSize()
            drawLineOnCanvas()
        })
    })
})

onBeforeUnmount(() => {
    clearSession()
    stopStatsMonitoring()
    if (isRecording.value) {
        stopRecording()
    }
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

    const currentIndex = availableCameras.value.findIndex(
        (camera) => camera.deviceId === selectedCameraId.value
    )
    const nextIndex = (currentIndex + 1) % availableCameras.value.length
    selectedCameraId.value = availableCameras.value[nextIndex].deviceId

    try {
        // Stop recording jika sedang recording
        if (isRecording.value) {
            alert('Please stop recording before switching camera')
            return
        }
        
        const { videoTrack } = await switchCamera(selectedCameraId.value)
        const mainVideoElement = document.getElementById('local-video-main')
        if (mainVideoElement) {
            videoTrack.play(mainVideoElement)
        }
    } catch (error) {
        console.error('Error switching camera:', error)
    }
}

const firestore = computed(() => {
    return $firestore as Firestore
})

const setCanvasSize = () => {
    const mainVideo = document.getElementById('local-video-main')
    const canvasEl = canvas.value as HTMLCanvasElement

    if (!mainVideo || !canvasEl) return

    canvasEl.width = mainVideo.offsetWidth
    canvasEl.height = mainVideo.offsetHeight
    canvasEl.style.top = `${mainVideo.offsetTop}px`
    canvasEl.style.left = `${mainVideo.offsetLeft}px`

    ctxCanvas.value = canvasEl.getContext('2d')
}

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":")
};

const join = async () => {
    try {
        const { videoTrack } = await joinChannel(selectedCameraId.value ?? undefined)
        
        const mainVideoElement = document.getElementById('local-video-main')
        if (mainVideoElement) {
            videoTrack.play(mainVideoElement)
        }
        
        startTime.value = Date.now()
        onCall.value = true
        
        startStatsMonitoring()
    } catch (err) {
        console.error('Error joining channel:', err)
    }
}

const endCall = () => {
    // Stop recording jika masih aktif
    if (isRecording.value) {
        stopRecording()
    }
    
    clearSession()

    const endTime = Date.now()
    const durationInSeconds = Math.floor((endTime - startTime.value) / 1000)
    totalDurationTime.value = formatTime(durationInSeconds)
    onCall.value = false
    stopStatsMonitoring()
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

const listenUserPublish = () => {
    client.value.on('user-published', async (remoteUser: any, mediaType: string) => {
        await client.value.subscribe(remoteUser, mediaType)
        
        if (mediaType === 'video') {
            remoteUser.videoTrack?.play('remote-stream')
        }
        
        if (mediaType === 'audio') {
            remoteUser.audioTrack?.play()
        }
    })
}

// Recording functions
const startRecording = async () => {
    try {
        if (!localVideoTrack.value || !localAudioTrack.value) {
            alert('Video or audio track not available')
            return
        }

        // Get MediaStreamTrack dari Agora
        const videoMediaStreamTrack = localVideoTrack.value.getMediaStreamTrack()
        const audioMediaStreamTrack = localAudioTrack.value.getMediaStreamTrack()

        // Buat MediaStream
        const stream = new MediaStream([videoMediaStreamTrack, audioMediaStreamTrack])

        // Setup MediaRecorder
        const options = { mimeType: 'video/webm;codecs=vp8,opus' }
        mediaRecorder.value = new MediaRecorder(stream, options)

        recordedChunks.value = []

        mediaRecorder.value.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.value.push(event.data)
            }
        }

        mediaRecorder.value.onstop = () => {
            saveRecording()
        }

        mediaRecorder.value.start(1000) // Record in 1s chunks
        isRecording.value = true
        recordingStartTime.value = Date.now()
        
        // Start recording timer
        startRecordingTimer()

        console.log('Recording started')
    } catch (error) {
        console.error('Error starting recording:', error)
        alert('Failed to start recording')
    }
}

const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop()
        isRecording.value = false
        stopRecordingTimer()
        console.log('Recording stopped')
    }
}

const startRecordingTimer = () => {
    recordingTimer.value = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000)
        const minutes = Math.floor(elapsed / 60)
        const seconds = elapsed % 60
        recordingDuration.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }, 1000)
}

const stopRecordingTimer = () => {
    if (recordingTimer.value) {
        clearInterval(recordingTimer.value)
        recordingTimer.value = null
        recordingDuration.value = '00:00'
    }
}

const saveRecording = () => {
    if (recordedChunks.value.length === 0) {
        alert('No recording data to save')
        return
    }

    const blob = new Blob(recordedChunks.value, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.href = url
    link.download = `host_recording_${roomID.value}_${timestamp}.webm`
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    recordedChunks.value = []
    
    alert('Recording saved successfully!')
}

// Stats monitoring functions
const toggleStatsModal = () => {
    showStats.value = !showStats.value
}

const startStatsMonitoring = () => {
    if (statsInterval.value) return
    
    statsInterval.value = setInterval(() => {
        updateLocalStats()
        updateRemoteStats()
        saveStatsToHistory()
    }, 1000)
}

const stopStatsMonitoring = () => {
    if (statsInterval.value) {
        clearInterval(statsInterval.value)
        statsInterval.value = null
    }
}

const updateLocalStats = () => {
    if (!localVideoTrack.value || !localAudioTrack.value) return
    
    const videoStats = localVideoTrack.value.getStats()
    localStats.value.resolution = `${videoStats.sendResolutionWidth}x${videoStats.sendResolutionHeight}`
    localStats.value.fps = videoStats.sendFrameRate || 0
    localStats.value.sendVideoBitrate = Math.round(videoStats.sendBitrate || 0)
    
    const audioStats = localAudioTrack.value.getStats()
    localStats.value.sendAudioBitrate = Math.round(audioStats.sendBitrate || 0)
}

const updateRemoteStats = () => {
    const remoteUsers = client.value.remoteUsers
    if (remoteUsers.length === 0) {
        remoteStats.value.uid = null
        return
    }
    
    const remoteUser = remoteUsers[0]
    remoteStats.value.uid = remoteUser.uid
    
    if (remoteUser.videoTrack) {
        const videoStats = remoteUser.videoTrack.getStats()
        remoteStats.value.resolution = `${videoStats.receiveResolutionWidth}x${videoStats.receiveResolutionHeight}`
        remoteStats.value.fps = videoStats.receiveFrameRate || 0
        remoteStats.value.recvVideoBitrate = Math.round(videoStats.receiveBitrate || 0)
        remoteStats.value.delay = videoStats.receiveDelay || 0
    }
    
    if (remoteUser.audioTrack) {
        const audioStats = remoteUser.audioTrack.getStats()
        remoteStats.value.recvAudioBitrate = Math.round(audioStats.receiveBitrate || 0)
    }
}

const saveStatsToHistory = () => {
    const now = new Date()
    const timestamp = now.toLocaleString('id-ID')
    
    statsHistory.value.push({
        timestamp,
        localResolution: localStats.value.resolution,
        localFps: localStats.value.fps,
        localSendAudioBitrate: localStats.value.sendAudioBitrate,
        localSendVideoBitrate: localStats.value.sendVideoBitrate,
        remoteDelay: remoteStats.value.delay,
        remoteResolution: remoteStats.value.resolution,
        remoteFps: remoteStats.value.fps,
        remoteRecvAudioBitrate: remoteStats.value.recvAudioBitrate,
        remoteRecvVideoBitrate: remoteStats.value.recvVideoBitrate
    })
}

const exportStatsToCSV = () => {
    if (statsHistory.value.length === 0) {
        alert('No stats data to export')
        return
    }
    
    const headers = [
        'Timestamp',
        'Local Resolution',
        'Local FPS',
        'Local Send Audio Bitrate (kbps)',
        'Local Send Video Bitrate (kbps)',
        'Remote Delay (ms)',
        'Remote Resolution',
        'Remote FPS',
        'Remote Recv Audio Bitrate (kbps)',
        'Remote Recv Video Bitrate (kbps)'
    ]
    
    const rows = statsHistory.value.map(stat => [
        stat.timestamp,
        stat.localResolution,
        stat.localFps,
        stat.localSendAudioBitrate,
        stat.localSendVideoBitrate,
        stat.remoteDelay,
        stat.remoteResolution,
        stat.remoteFps,
        stat.remoteRecvAudioBitrate,
        stat.remoteRecvVideoBitrate
    ])
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `stats_${roomID.value}_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// Drawing functions
const startDraw = (event: MouseEvent) => {
    isDrawing.value = true
    const { x, y } = getCoordinates(event, canvas.value!)
    lastX.value = x
    lastY.value = y
}

const draw = (event: MouseEvent) => {
    if (!isDrawing.value || lastX.value === null || lastY.value === null) return

    const { x, y } = getCoordinates(event, canvas.value!)
    const lineData: LineData = {
        startX: lastX.value, startY: lastY.value, endX: x, endY: y, role: 1
    }
    
    lines.value.push(lineData)
    drawLine(lineData)

    lastX.value = x
    lastY.value = y
}

const stopDraw = () => {
    isDrawing.value = false
    lastX.value = null
    lastY.value = null
}

const startDrawTouch = (event: TouchEvent) => {
    event.preventDefault()
    isDrawing.value = true
    const touch = event.touches[0]
    const { x, y } = getCoordinates(touch, canvas.value!)
    lastX.value = x
    lastY.value = y
}

const drawTouch = (event: TouchEvent) => {
    event.preventDefault()
    if (!isDrawing.value || lastX.value === null || lastY.value === null) return

    const touch = event.touches[0]
    const { x, y } = getCoordinates(touch, canvas.value!)
    const lineData: LineData = {
        startX: lastX.value, startY: lastY.value, endX: x, endY: y, role: 1
    }
    
    lines.value.push(lineData)
    drawLine(lineData)

    lastX.value = x
    lastY.value = y
}

const drawLine = (lineData: LineData) => {
    if (!ctxCanvas.value) return

    ctxCanvas.value.strokeStyle = 'red'
    ctxCanvas.value.lineWidth = 3
    ctxCanvas.value.beginPath()
    ctxCanvas.value.moveTo(lineData.startX, lineData.startY)
    ctxCanvas.value.lineTo(lineData.endX, lineData.endY)
    ctxCanvas.value.stroke()
}

const drawLineOnCanvas = () => {
    if (!ctxCanvas.value || !canvas.value) return

    ctxCanvas.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
    
    lines.value.forEach((lineData) => {
        drawLine(lineData)
    })
}

const addLineDataToFirestore = async (lineData?: LineData) => {
    try {
        const linesCollection = collection(firestore.value, roomID.value)
        await addDoc(linesCollection, lineData ?? { timestamp: Timestamp.now() })
    } catch (err) {
        console.error('Error saving line data to Firestore', err)
    }
}

const listenToDrawingUpdates = () => {
    if (!firestore.value) return

    const lineCollectionRef = collection(firestore.value, roomID.value, 'annotations', 'lines')
    const q = query(lineCollectionRef, orderBy('timestamp', 'asc'))
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const lineData = change.doc.data() as LineData
                if (lineData.role === 2) {
                    drawLine(lineData)
                    showEraserLine.value = true
                }
            }
        })
    })
}

const clearAnnotation = async (force: boolean = false) => {
    if (!firestore.value) return
    
    if (!force) {
        const isConfirmed = confirm("Clear all annotations?")
        if (!isConfirmed) return
    }

    try {
        const lineCollectionRef = collection(firestore.value, roomID.value, 'annotations', 'lines')
        const snapshot = await getDocs(lineCollectionRef)
        
        const deletePromises = snapshot.docs.map((docSnapshot) => 
            deleteDoc(docSnapshot.ref)
        )
        
        await Promise.all(deletePromises)
        
        if (ctxCanvas.value && canvas.value) {
            ctxCanvas.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
        }
        
        lines.value = []
        showEraserLine.value = false
    } catch (error) {
        console.error('Error clearing annotations:', error)
    }
}
</script>