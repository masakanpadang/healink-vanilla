import type { IAgoraRTC } from 'agora-rtc-sdk-ng/esm';
import { ref, markRaw } from 'vue';

export function useAgora(appId: string, channel: string, uid: string) {
  const client = ref<any>(null)
  const localVideoTrack = ref<any>(null)
  const localAudioTrack = ref<any>(null)
  const remoteStream = ref<any>(null)

  const { $agora } = useNuxtApp()

  const agora = computed(() => {
    return $agora as IAgoraRTC
  })
  
  const joinChannel = async (cameraId?: string) => {
    try {
      client.value = markRaw(agora.value.createClient({ mode: 'rtc', codec: 'vp8' }))
      const user = await client.value.join(appId, channel, null, uid)

      const [audioTrack, videoTrack] = await Promise.all([
        agora.value.createMicrophoneAudioTrack(),
        agora.value.createCameraVideoTrack({
          cameraId: cameraId
        }),
      ])

      localAudioTrack.value = audioTrack
      localVideoTrack.value = videoTrack

      await client.value.publish([localVideoTrack.value, localAudioTrack.value])
      return { client, localVideoTrack, videoTrack, localAudioTrack }
    } catch (err) {
      console.error('Error joining channel:', err)
    }
  }

  const leaveChannel = async () => {
    try {
      client.value.unpublish([localVideoTrack.value, localAudioTrack.value])
      client.value.leave()
    } catch(err) {
      console.error('Failed to leave channel:', err)
    }
  }

  const switchCamera = async (cameraId: string) => {
    if (localVideoTrack.value) {
      await client.value.unpublish([localVideoTrack.value])

      const videoTrack = await agora.value.createCameraVideoTrack({
        cameraId: cameraId
      })

      localVideoTrack.value = videoTrack

      await client.value.publish([localVideoTrack.value])
      return { videoTrack }
    }
  }

  const toggleScreenShare = async () => {
    await client.value.unpublish([localAudioTrack.value, localVideoTrack.value])
    await localVideoTrack.value.stop()
    localVideoTrack.value = null

    const screenTrack = await agora.value.createScreenVideoTrack({})
    localVideoTrack.value = screenTrack

    await client.value.publish(localVideoTrack.value)
    return { localVideoTrack }
  }

  return { client, localVideoTrack, localAudioTrack, remoteStream, joinChannel, toggleScreenShare, leaveChannel, switchCamera }
}
