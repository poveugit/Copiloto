/**
 * Real-Time & Background GPS Odometer Service for Mochilinha
 * Automatically tracks distance traveled (KM) during an active shift using
 * high-accuracy Geolocation watchPosition, Haversine distance calculation,
 * stationary noise filtering, Screen Wake Lock, and background catch-up.
 */

export type GpsPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface GpsCoordinateSample {
  lat: number;
  lng: number;
  accuracy: number;
  speedKmh: number;
  timestamp: number;
}

export interface GpsTrackingUpdate {
  deltaKm: number;
  currentCoords: GpsCoordinateSample;
  isMoving: boolean;
}

const GPS_PERM_CACHE_KEY = 'mochilinha_gps_permission_v1';

export function isGeolocationSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'geolocation' in navigator;
}

/**
 * Checks current device geolocation permission state without triggering a prompt.
 */
export async function checkGpsPermissionStatus(): Promise<GpsPermissionState> {
  if (!isGeolocationSupported()) return 'unsupported';

  if (navigator.permissions && typeof navigator.permissions.query === 'function') {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
        if (status.state === 'granted') {
          localStorage.setItem(GPS_PERM_CACHE_KEY, 'granted');
        }
        return status.state;
      }
    } catch {
      // Fallback if Permissions API for geolocation is not supported on this browser
    }
  }

  const cached = localStorage.getItem(GPS_PERM_CACHE_KEY);
  if (cached === 'granted') return 'granted';
  return 'prompt';
}

/**
 * Explicitly triggers the native device/browser Geolocation permission dialog
 * using getCurrentPosition with high accuracy.
 */
export async function requestDeviceGpsPermission(): Promise<{
  granted: boolean;
  status: GpsPermissionState;
  coords?: GpsCoordinateSample;
  error?: string;
}> {
  if (!isGeolocationSupported()) {
    return {
      granted: false,
      status: 'unsupported',
      error: 'Seu aparelho ou navegador não possui suporte a GPS / Geolocalização.',
    };
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => {
        localStorage.setItem(GPS_PERM_CACHE_KEY, 'granted');
        const speedMps = position.coords.speed ?? 0;
        const speedKmh = speedMps > 0 ? Math.round(speedMps * 3.6) : 0;

        resolve({
          granted: true,
          status: 'granted',
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy || 10),
            speedKmh,
            timestamp: position.timestamp || Date.now(),
          },
        });
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          localStorage.removeItem(GPS_PERM_CACHE_KEY);
          resolve({
            granted: false,
            status: 'denied',
            error:
              'Permissão de localização negada. Nas configurações do celular/navegador, altere a Localização para "Permitir o tempo todo" (ou "Permitir durante o uso").',
          });
          return;
        }

        if (err.code === err.POSITION_UNAVAILABLE) {
          resolve({
            granted: false,
            status: 'prompt',
            error: 'Sinal de GPS indisponível no momento. Verifique se a Localização (GPS) do celular está ativada.',
          });
          return;
        }

        if (err.code === err.TIMEOUT) {
          // Even if high-accuracy timed out indoors, try a quick low-accuracy check to confirm permission
          navigator.geolocation.getCurrentPosition(
            pos2 => {
              localStorage.setItem(GPS_PERM_CACHE_KEY, 'granted');
              resolve({
                granted: true,
                status: 'granted',
                coords: {
                  lat: pos2.coords.latitude,
                  lng: pos2.coords.longitude,
                  accuracy: Math.round(pos2.coords.accuracy || 25),
                  speedKmh: 0,
                  timestamp: pos2.timestamp || Date.now(),
                },
              });
            },
            () => {
              resolve({
                granted: false,
                status: 'prompt',
                error: 'Tempo esgotado ao buscar satélite GPS. Certifique-se de que o GPS do aparelho está ligado.',
              });
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
          return;
        }

        resolve({
          granted: false,
          status: 'denied',
          error: 'Não foi possível obter acesso ao GPS do dispositivo.',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Calculates the distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Starts continuous GPS odometer tracking (foreground + background catch-up + WakeLock).
 */
export function startGpsShiftWatcher(
  initialLastPoint: { lat?: number; lng?: number; timestamp?: number } | null,
  onDistanceUpdate: (update: GpsTrackingUpdate) => void,
  onStatusError?: (errMessage: string, isPermissionDenied: boolean) => void
): { stop: () => void } {
  if (!isGeolocationSupported()) {
    onStatusError?.('GPS não suportado neste dispositivo.', false);
    return { stop: () => {} };
  }

  let lastLat = initialLastPoint?.lat;
  let lastLng = initialLastPoint?.lng;
  let lastTimestamp = initialLastPoint?.timestamp || Date.now();
  let watchId: number | null = null;
  let wakeLockSentinel: any = null;
  let isStopped = false;

  // 1. Request Screen Wake Lock when available so device keeps tracking seamlessly
  const requestWakeLock = async () => {
    if (isStopped) return;
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // WakeLock is optional and may fail when tab is in background
    }
  };

  requestWakeLock();

  const processPosition = (position: GeolocationPosition) => {
    if (isStopped) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy || 15;
    const nowTs = position.timestamp || Date.now();
    const rawSpeedMps = position.coords.speed;

    // Ignore very inaccurate readings (> 120m) unless we have no initial point yet
    if (accuracy > 120 && lastLat !== undefined && lastLng !== undefined) {
      return;
    }

    let deltaKm = 0;
    let computedSpeedKmh =
      rawSpeedMps !== null && rawSpeedMps !== undefined && rawSpeedMps >= 0
        ? Math.round(rawSpeedMps * 3.6)
        : 0;

    if (lastLat !== undefined && lastLng !== undefined) {
      const distKm = calculateHaversineKm(lastLat, lastLng, lat, lng);
      const elapsedHours = Math.max(0.0002, (nowTs - lastTimestamp) / 3600000);
      const impliedSpeedKmh = distKm / elapsedHours;

      if (computedSpeedKmh === 0 && distKm >= 0.015) {
        computedSpeedKmh = Math.min(160, Math.round(impliedSpeedKmh));
      }

      // Noise filter:
      // - Minimum movement of 10 meters (0.010 km) to avoid stationary GPS drift
      // - Maximum realistic motorcycle speed filter (< 185 km/h) to reject GPS teleports
      const minThresholdKm = accuracy > 40 ? 0.022 : 0.01;
      if (distKm >= minThresholdKm && impliedSpeedKmh <= 185) {
        deltaKm = distKm;
        lastLat = lat;
        lastLng = lng;
        lastTimestamp = nowTs;
      }
    } else {
      // First valid coordinate lock
      lastLat = lat;
      lastLng = lng;
      lastTimestamp = nowTs;
    }

    const currentCoords: GpsCoordinateSample = {
      lat,
      lng,
      accuracy: Math.round(accuracy),
      speedKmh: computedSpeedKmh,
      timestamp: nowTs,
    };

    onDistanceUpdate({
      deltaKm,
      currentCoords,
      isMoving: deltaKm > 0 || computedSpeedKmh >= 3,
    });
  };

  const handleError = (err: GeolocationPositionError) => {
    if (isStopped) return;
    if (err.code === err.PERMISSION_DENIED) {
      localStorage.removeItem(GPS_PERM_CACHE_KEY);
      onStatusError?.(
        'Permissão de localização GPS bloqueada. Ative "Permitir o tempo todo" nas configurações do aparelho.',
        true
      );
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      onStatusError?.('Sinal de GPS fraco ou desligado. Mantenha a Localização ativada.', false);
    }
  };

  // 2. Start continuous high-accuracy watchPosition
  try {
    watchId = navigator.geolocation.watchPosition(processPosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    });
  } catch {
    onStatusError?.('Falha ao iniciar o rastreamento do odômetro por GPS.', false);
  }

  // 3. Background catch-up: when the motoboy returns from iFood/Uber or unlocks the screen,
  // immediately poll current position to compute any distance covered while in background
  const handleVisibilityChange = () => {
    if (isStopped) return;
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      navigator.geolocation.getCurrentPosition(processPosition, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      });
    }
  };

  // 4. Periodic heartbeat poll every 8 seconds to keep background GPS warm on mobile browsers
  const heartbeatInterval = setInterval(() => {
    if (isStopped) return;
    navigator.geolocation.getCurrentPosition(processPosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 7000,
    });
  }, 8000);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    stop: () => {
      isStopped = true;
      clearInterval(heartbeatInterval);
      if (watchId !== null && isGeolocationSupported()) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
      }
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        try {
          wakeLockSentinel.release();
        } catch {
          // ignore
        }
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    },
  };
}
