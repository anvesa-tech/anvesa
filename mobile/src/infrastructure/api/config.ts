import { Platform } from 'react-native';

/**
 * Base URL for the ANVESA backend tRPC endpoint.
 * - Web dev: localhost works.
 * - Device (Expo Go): set EXPO_PUBLIC_API_URL to your machine's LAN IP,
 *   e.g. http://192.168.1.6:3000
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL =
  fromEnv ?? (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.1.6:3000');

export const TRPC_URL = `${API_BASE_URL}/api/trpc`;
