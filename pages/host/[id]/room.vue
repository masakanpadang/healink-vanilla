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
        <div v-if="showStats" class="absolute top-20 right-4 bg-white shadow-lg rounded-lg p-4 w-96 z-50 border border-gray-200 max-h-[80vh] overflow-y-auto">
            <h3 class="text-lg font-bold mb-3 text-gray-800">Quality Stats</h3>
            
            <!-- Client Stats -->
            <div class="mb-4">
                <h4 class="font-semibold text-sm text-gray-700 mb-2">🌐 Client Stats</h4>
                <div class="space-y-1 text-xs">
                    <p><span class="font-medium">Users in Channel:</span> {{ clientStats.userCount }}</p>
                    <p><span class="font-medium">Duration:</span> {{ clientStats.duration }} s</p>
                    <p><span class="font-medium">Send Bitrate:</span> {{ clientStats.sendBitrate }} bps</p>
                    <p><span class="font-medium">Recv Bitrate:</span> {{ clientStats.recvBitrate }} bps</p>
                    <p><span class="font-medium">Send Bytes:</span> {{ clientStats.sendBytes }} bytes</p>
                    <p><span class="font-medium">Recv Bytes:</span> {{ clientStats.recvBytes }} bytes</p>
                    <p><span class="font-medium">Outgoing Bandwidth:</span> {{ clientStats.outgoingAvailableBandwidth }} kbps</p>
                    <p><span class="font-medium">RTT:</span> {{ clientStats.rtt }} ms</p>
                </div>
            </div>

            <!-- Local Stats -->
            <div class="mb-4">
                <h4 class="font-semibold text-sm text-blue-600 mb-2">📹 Local Stats</h4>
                <div class="space-y-1 text-xs">
                    <p class="font-medium text-blue-500 mt-1">Audio:</p>
                    <p><span class="font-medium">Send Bitrate:</span> {{ localStats.audioSendBitrate }} bps</p>
                    <p><span class="font-medium">Send Bytes:</span> {{ localStats.audioSendBytes }} bytes</p>
                    <p><span class="font-medium">Send Packets:</span> {{ localStats.audioSendPackets }}</p>
                    <p><span class="font-medium">Packets Lost:</span> {{ localStats.audioSendPacketsLost }}</p>
                    <p class="font-medium text-blue-500 mt-1">Video:</p>
                    <p><span class="font-medium">Capture Resolution:</span> {{ localStats.captureResolutionWidth }}x{{ localStats.captureResolutionHeight }}</p>
                    <p><span class="font-medium">Send Resolution:</span> {{ localStats.sendResolutionWidth }}x{{ localStats.sendResolutionHeight }}</p>
                    <p><span class="font-medium">Encode Delay:</span> {{ localStats.encodeDelay }} ms</p>
                    <p><span class="font-medium">Send Bitrate:</span> {{ localStats.videoSendBitrate }} bps</p>
                    <p><span class="font-medium">Send Bytes:</span> {{ localStats.videoSendBytes }} bytes</p>
                    <p><span class="font-medium">Send Packets:</span> {{ localStats.videoSendPackets }}</p>
                    <p><span class="font-medium">Packets Lost:</span> {{ localStats.videoSendPacketsLost }}</p>
                    <p><span class="font-medium">Duration:</span> {{ localStats.videoDuration }} s</p>
                    <p><span class="font-medium">Freeze Time:</span> {{ localStats.videoFreezeTime }} s</p>
                </div>
            </div>

            <!-- Remote Stats -->
            <div>
                <h4 class="font-semibold text-sm text-green-600 mb-2">📡 Remote Stats</h4>
                <div v-if="remoteStats.uid" class="space-y-1 text-xs">
                    <p class="font-medium text-green-500 mt-1">Audio:</p>
                    <p><span class="font-medium">Receive Delay:</span> {{ remoteStats.audioReceiveDelay }} ms</p>
                    <p><span class="font-medium">Receive Bytes:</span> {{ remoteStats.audioReceiveBytes }} bytes</p>
                    <p><span class="font-medium">Receive Packets:</span> {{ remoteStats.audioReceivePackets }}</p>
                    <p><span class="font-medium">Packets Lost:</span> {{ remoteStats.audioReceivePacketsLost }}</p>
                    <p><span class="font-medium">Packet Loss Rate:</span> {{ remoteStats.audioPacketLossRate }} %</p>
                    <p class="font-medium text-green-500 mt-1">Video:</p>
                    <p><span class="font-medium">Receive Delay:</span> {{ remoteStats.videoReceiveDelay }} ms</p>
                    <p><span class="font-medium">Receive Resolution:</span> {{ remoteStats.receiveResolutionWidth }}x{{ remoteStats.receiveResolutionHeight }}</p>
                    <p><span class="font-medium">Receive Bitrate:</span> {{ remoteStats.videoReceiveBitrate }} bps</p>
                    <p><span class="font-medium">Receive Bytes:</span> {{ remoteStats.videoReceiveBytes }} bytes</p>
                    <p><span class="font-medium">Receive Packets:</span> {{ remoteStats.videoReceivePackets }}</p>
                    <p><span class="font-medium">Packets Lost:</span> {{ remoteStats.videoReceivePacketsLost }}</p>
                    <p><span class="font-medium">Packet Loss Rate:</span> {{ remoteStats.videoPacketLossRate }} %</p>
                    <p><span class="font-medium">Duration:</span> {{ remoteStats.videoDuration }} s</p>
                    <p><span class="font-medium">Freeze Time:</span> {{ remoteStats.videoFreezeTime }} s</p>
                    <p><span class="font-medium">Freeze Rate:</span> {{ remoteStats.videoFreezeRate }} %</p>
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

// Client-level stats (from client.getRTCStats())
const clientStats = ref({
    userCount: 0,
    duration: 0,
    sendBitrate: 0,
    recvBitrate: 0,
    sendBytes: 0,
    recvBytes: 0,
    outgoingAvailableBandwidth: '0.000',
    rtt: 0
})

// Local stats (from client.getLocalVideoStats() & client.getLocalAudioStats())
const localStats = ref({
    audioSendBitrate: 0,
    audioSendBytes: 0,
    audioSendPackets: 0,
    audioSendPacketsLost: 0,
    captureResolutionHeight: 0,
    captureResolutionWidth: 0,
    sendResolutionHeight: 0,
    sendResolutionWidth: 0,
    encodeDelay: '0.00',
    videoSendBitrate: 0,
    videoSendBytes: 0,
    videoSendPackets: 0,
    videoSendPacketsLost: 0,
    videoDuration: 0,
    videoFreezeTime: 0
})

// Remote stats (from client.getRemoteVideoStats() & client.getRemoteAudioStats())
const remoteStats = ref({
    uid: null as string | null,
    audioReceiveDelay: '0.00',
    videoReceiveDelay: '0.00',
    audioReceiveBytes: 0,
    audioReceivePackets: 0,
    audioReceivePacketsLost: 0,
    audioPacketLossRate: '0.000',
    receiveResolutionHeight: 0,
    receiveResolutionWidth: 0,
    videoReceiveBitrate: 0,
    videoReceiveBytes: 0,
    videoReceivePackets: 0,
    videoReceivePacketsLost: 0,
    videoPacketLossRate: '0.000',
    videoDuration: 0,
    videoFreezeTime: 0,
    videoFreezeRate: '0.000'
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
    // Client stats
    userCount: number
    duration: number
    sendBitrate: number
    recvBitrate: number
    sendBytes: number
    recvBytes: number
    outgoingAvailableBandwidth: string
    rtt: number
    // Local audio stats
    audioSendBitrate: number
    audioSendBytes: number
    audioSendPackets: number
    audioSendPacketsLost: number
    // Local video stats
    captureResolutionHeight: number
    captureResolutionWidth: number
    sendResolutionHeight: number
    sendResolutionWidth: number
    encodeDelay: string
    videoSendBitrate: number
    videoSendBytes: number
    videoSendPackets: number
    videoSendPacketsLost: number
    videoDuration: number
    videoFreezeTime: number
    // Remote audio stats
    audioReceiveDelay: string
    audioReceiveBytes: number
    audioReceivePackets: number
    audioReceivePacketsLost: number
    audioPacketLossRate: string
    // Remote video stats
    videoReceiveDelay: string
    receiveResolutionHeight: number
    receiveResolutionWidth: number
    videoReceiveBitrate: number
    videoReceiveBytes: number
    videoReceivePackets: number
    videoReceivePacketsLost: number
    videoPacketLossRate: string
    remoteVideoDuration: number
    remoteVideoFreezeTime: number
    videoFreezeRate: string
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

        const videoMediaStreamTrack = localVideoTrack.value.getMediaStreamTrack()
        const audioMediaStreamTrack = localAudioTrack.value.getMediaStreamTrack()

        const stream = new MediaStream([videoMediaStreamTrack, audioMediaStreamTrack])

        let options: MediaRecorderOptions
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            options = { 
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000
            }
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            options = { 
                mimeType: 'video/webm;codecs=vp8,opus',
                videoBitsPerSecond: 2500000
            }
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            options = { 
                mimeType: 'video/webm',
                videoBitsPerSecond: 2500000
            }
        } else {
            alert('WebM recording not supported in this browser')
            return
        }

        console.log('Recording with:', options.mimeType)
        mediaRecorder.value = new MediaRecorder(stream, options)

        recordedChunks.value = []

        mediaRecorder.value.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.value.push(event.data)
            }
        }

        mediaRecorder.value.onstop = () => {
            saveRecording()
        }

        mediaRecorder.value.onerror = (event: any) => {
            console.error('MediaRecorder error:', event)
            alert('Recording error occurred')
            isRecording.value = false
            stopRecordingTimer()
        }

        mediaRecorder.value.start(100)
        isRecording.value = true
        recordingStartTime.value = Date.now()
        
        startRecordingTimer()

        console.log('Recording started')
    } catch (error) {
        console.error('Error starting recording:', error)
        alert('Failed to start recording: ' + error)
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

// =====================================================
// Stats monitoring functions (using client-level SDK stats)
// =====================================================
const toggleStatsModal = () => {
    showStats.value = !showStats.value
}

const startStatsMonitoring = () => {
    if (statsInterval.value) return
    
    statsInterval.value = setInterval(() => {
        flushStats()
        saveStatsToHistory()
    }, 1000)
}

const stopStatsMonitoring = () => {
    if (statsInterval.value) {
        clearInterval(statsInterval.value)
        statsInterval.value = null
    }
}

const flushStats = () => {
    if (!client.value) return

    // ---- Client Stats (client.getRTCStats()) ----
    const rtcStats = client.value.getRTCStats()
    clientStats.value.userCount = rtcStats.UserCount ?? 0
    clientStats.value.duration = rtcStats.Duration ?? 0
    clientStats.value.recvBitrate = rtcStats.RecvBitrate ?? 0
    clientStats.value.sendBitrate = rtcStats.SendBitrate ?? 0
    clientStats.value.recvBytes = rtcStats.RecvBytes ?? 0
    clientStats.value.sendBytes = rtcStats.SendBytes ?? 0
    clientStats.value.outgoingAvailableBandwidth = Number(rtcStats.OutgoingAvailableBandwidth ?? 0).toFixed(3)
    clientStats.value.rtt = rtcStats.RTT ?? 0

    // ---- Local Stats (client.getLocalVideoStats() & client.getLocalAudioStats()) ----
    const localVideoStat = client.value.getLocalVideoStats()
    const localAudioStat = client.value.getLocalAudioStats()

    localStats.value.audioSendBitrate = localAudioStat.sendBitrate ?? 0
    localStats.value.audioSendBytes = localAudioStat.sendBytes ?? 0
    localStats.value.audioSendPackets = localAudioStat.sendPackets ?? 0
    localStats.value.audioSendPacketsLost = localAudioStat.sendPacketsLost ?? 0

    localStats.value.captureResolutionHeight = localVideoStat.captureResolutionHeight ?? 0
    localStats.value.captureResolutionWidth = localVideoStat.captureResolutionWidth ?? 0
    localStats.value.sendResolutionHeight = localVideoStat.sendResolutionHeight ?? 0
    localStats.value.sendResolutionWidth = localVideoStat.sendResolutionWidth ?? 0
    localStats.value.encodeDelay = Number(localVideoStat.encodeDelay ?? 0).toFixed(2)
    localStats.value.videoSendBitrate = localVideoStat.sendBitrate ?? 0
    localStats.value.videoSendBytes = localVideoStat.sendBytes ?? 0
    localStats.value.videoSendPackets = localVideoStat.sendPackets ?? 0
    localStats.value.videoSendPacketsLost = localVideoStat.sendPacketsLost ?? 0
    localStats.value.videoDuration = localVideoStat.totalDuration ?? 0
    localStats.value.videoFreezeTime = localVideoStat.totalFreezeTime ?? 0

    // ---- Remote Stats (client.getRemoteVideoStats() & client.getRemoteAudioStats()) ----
    const remoteVideoStatsMap = client.value.getRemoteVideoStats()
    const remoteAudioStatsMap = client.value.getRemoteAudioStats()

    const remoteUids = Object.keys(remoteVideoStatsMap)
    if (remoteUids.length > 0) {
        const uid = remoteUids[0]
        remoteStats.value.uid = uid

        const rvs = remoteVideoStatsMap[uid]
        const ras = remoteAudioStatsMap[uid]

        if (ras) {
            remoteStats.value.audioReceiveDelay = Number(ras.receiveDelay ?? 0).toFixed(2)
            remoteStats.value.audioReceiveBytes = ras.receiveBytes ?? 0
            remoteStats.value.audioReceivePackets = ras.receivePackets ?? 0
            remoteStats.value.audioReceivePacketsLost = ras.receivePacketsLost ?? 0
            remoteStats.value.audioPacketLossRate = Number(ras.packetLossRate ?? 0).toFixed(3)
        }

        if (rvs) {
            remoteStats.value.videoReceiveDelay = Number(rvs.receiveDelay ?? 0).toFixed(2)
            remoteStats.value.receiveResolutionHeight = rvs.receiveResolutionHeight ?? 0
            remoteStats.value.receiveResolutionWidth = rvs.receiveResolutionWidth ?? 0
            remoteStats.value.videoReceiveBitrate = rvs.receiveBitrate ?? 0
            remoteStats.value.videoReceiveBytes = rvs.receiveBytes ?? 0
            remoteStats.value.videoReceivePackets = rvs.receivePackets ?? 0
            remoteStats.value.videoReceivePacketsLost = rvs.receivePacketsLost ?? 0
            remoteStats.value.videoPacketLossRate = Number(rvs.receivePacketsLost ?? 0).toFixed(3)
            remoteStats.value.videoDuration = rvs.totalDuration ?? 0
            remoteStats.value.videoFreezeTime = rvs.totalFreezeTime ?? 0
            remoteStats.value.videoFreezeRate = Number(rvs.freezeRate ?? 0).toFixed(3)
        }
    } else {
        remoteStats.value.uid = null
    }
}

const saveStatsToHistory = () => {
    const now = new Date()
    const timestamp = now.toLocaleString('id-ID')
    
    statsHistory.value.push({
        timestamp,
        // Client stats
        userCount: clientStats.value.userCount,
        duration: clientStats.value.duration,
        sendBitrate: clientStats.value.sendBitrate,
        recvBitrate: clientStats.value.recvBitrate,
        sendBytes: clientStats.value.sendBytes,
        recvBytes: clientStats.value.recvBytes,
        outgoingAvailableBandwidth: clientStats.value.outgoingAvailableBandwidth,
        rtt: clientStats.value.rtt,
        // Local audio
        audioSendBitrate: localStats.value.audioSendBitrate,
        audioSendBytes: localStats.value.audioSendBytes,
        audioSendPackets: localStats.value.audioSendPackets,
        audioSendPacketsLost: localStats.value.audioSendPacketsLost,
        // Local video
        captureResolutionHeight: localStats.value.captureResolutionHeight,
        captureResolutionWidth: localStats.value.captureResolutionWidth,
        sendResolutionHeight: localStats.value.sendResolutionHeight,
        sendResolutionWidth: localStats.value.sendResolutionWidth,
        encodeDelay: localStats.value.encodeDelay,
        videoSendBitrate: localStats.value.videoSendBitrate,
        videoSendBytes: localStats.value.videoSendBytes,
        videoSendPackets: localStats.value.videoSendPackets,
        videoSendPacketsLost: localStats.value.videoSendPacketsLost,
        videoDuration: localStats.value.videoDuration,
        videoFreezeTime: localStats.value.videoFreezeTime,
        // Remote audio
        audioReceiveDelay: remoteStats.value.audioReceiveDelay,
        audioReceiveBytes: remoteStats.value.audioReceiveBytes,
        audioReceivePackets: remoteStats.value.audioReceivePackets,
        audioReceivePacketsLost: remoteStats.value.audioReceivePacketsLost,
        audioPacketLossRate: remoteStats.value.audioPacketLossRate,
        // Remote video
        videoReceiveDelay: remoteStats.value.videoReceiveDelay,
        receiveResolutionHeight: remoteStats.value.receiveResolutionHeight,
        receiveResolutionWidth: remoteStats.value.receiveResolutionWidth,
        videoReceiveBitrate: remoteStats.value.videoReceiveBitrate,
        videoReceiveBytes: remoteStats.value.videoReceiveBytes,
        videoReceivePackets: remoteStats.value.videoReceivePackets,
        videoReceivePacketsLost: remoteStats.value.videoReceivePacketsLost,
        videoPacketLossRate: remoteStats.value.videoPacketLossRate,
        remoteVideoDuration: remoteStats.value.videoDuration,
        remoteVideoFreezeTime: remoteStats.value.videoFreezeTime,
        videoFreezeRate: remoteStats.value.videoFreezeRate
    })
}

const exportStatsToCSV = () => {
    if (statsHistory.value.length === 0) {
        alert('No stats data to export')
        return
    }
    
    const headers = [
        'Timestamp',
        // Client stats
        'Users in Channel',
        'Duration (s)',
        'Send Bitrate (bps)',
        'Recv Bitrate (bps)',
        'Send Bytes',
        'Recv Bytes',
        'Outgoing Available Bandwidth (kbps)',
        'RTT (ms)',
        // Local audio
        'Local Audio Send Bitrate (bps)',
        'Local Audio Send Bytes',
        'Local Audio Send Packets',
        'Local Audio Packets Lost',
        // Local video
        'Local Capture Resolution Height',
        'Local Capture Resolution Width',
        'Local Send Resolution Height',
        'Local Send Resolution Width',
        'Local Encode Delay (ms)',
        'Local Video Send Bitrate (bps)',
        'Local Video Send Bytes',
        'Local Video Send Packets',
        'Local Video Packets Lost',
        'Local Video Duration (s)',
        'Local Video Freeze Time (s)',
        // Remote audio
        'Remote Audio Receive Delay (ms)',
        'Remote Audio Receive Bytes',
        'Remote Audio Receive Packets',
        'Remote Audio Packets Lost',
        'Remote Audio Packet Loss Rate (%)',
        // Remote video
        'Remote Video Receive Delay (ms)',
        'Remote Video Receive Resolution Height',
        'Remote Video Receive Resolution Width',
        'Remote Video Receive Bitrate (bps)',
        'Remote Video Receive Bytes',
        'Remote Video Receive Packets',
        'Remote Video Packets Lost',
        'Remote Video Packet Loss Rate (%)',
        'Remote Video Duration (s)',
        'Remote Video Freeze Time (s)',
        'Remote Video Freeze Rate (%)'
    ]
    
    const rows = statsHistory.value.map(stat => [
        stat.timestamp,
        stat.userCount,
        stat.duration,
        stat.sendBitrate,
        stat.recvBitrate,
        stat.sendBytes,
        stat.recvBytes,
        stat.outgoingAvailableBandwidth,
        stat.rtt,
        stat.audioSendBitrate,
        stat.audioSendBytes,
        stat.audioSendPackets,
        stat.audioSendPacketsLost,
        stat.captureResolutionHeight,
        stat.captureResolutionWidth,
        stat.sendResolutionHeight,
        stat.sendResolutionWidth,
        stat.encodeDelay,
        stat.videoSendBitrate,
        stat.videoSendBytes,
        stat.videoSendPackets,
        stat.videoSendPacketsLost,
        stat.videoDuration,
        stat.videoFreezeTime,
        stat.audioReceiveDelay,
        stat.audioReceiveBytes,
        stat.audioReceivePackets,
        stat.audioReceivePacketsLost,
        stat.audioPacketLossRate,
        stat.videoReceiveDelay,
        stat.receiveResolutionHeight,
        stat.receiveResolutionWidth,
        stat.videoReceiveBitrate,
        stat.videoReceiveBytes,
        stat.videoReceivePackets,
        stat.videoReceivePacketsLost,
        stat.videoPacketLossRate,
        stat.remoteVideoDuration,
        stat.remoteVideoFreezeTime,
        stat.videoFreezeRate
    ])
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `stats_host_${roomID.value}_${Date.now()}.csv`)
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