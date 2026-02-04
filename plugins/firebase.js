// plugins/firebase.ts
import { defineNuxtPlugin } from '#app'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

export default defineNuxtPlugin(nuxtApp => {
  if (process.client) {
    const config = useRuntimeConfig()

    const firebaseConfig = {
      apiKey: config.public.FIREBASE_API_KEY,
      authDomain: config.public.FIREBASE_AUTH_DOMAIN,
      projectId: config.public.FIREBASE_PROJECT_ID,
      storageBucket: config.public.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.public.FIREBASE_MESSAGING_SENDER_ID,
      appId: config.public.FIREBASE_APP_ID,
      measurementId: config.public.FIREBASE_MEASUREMENT_ID
    }

    console.log('Firebase config:', firebaseConfig)

    // Initialize Firebase
    const app = initializeApp(firebaseConfig)

    // Get Firestore instance using the modular API
    const db = getFirestore(app)

    nuxtApp.provide('firestore', db) // Provide Firestore globally
  }
})
