// plugins/agora.js
import AgoraRTC from 'agora-rtc-sdk-ng';

export default defineNuxtPlugin(nuxtApp => {
  // Only on the client side
  if (process.client) {
    // Make the AgoraRTC SDK globally available
    nuxtApp.provide('agora', AgoraRTC);
  }
});
