import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';

/**
 * Real-Time & Background GPS Odometer Service for Mochilinha
 * High-precision 2D ENU Kalman + Doppler engine with zero-cache live streaming,
 * adaptive watchdog recovery, Screen Wake Lock, and Native Android Foreground Service.
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

export interface GpsRawFixInput {
  lat: number;
  lng: number;
  accuracy: number;
  speedMps: number | null;
  timestamp: number;
}

interface NativeGpsFixEvent {
  lat: number;
  lng: number;
  accuracy: number;
  speedKmh: number;
  deltaKm: number;
  totalTrackedKm: number;
  isMoving: boolean;
  timestamp: number;
}

interface NativeGpsSnapshot {
  active: boolean;
  lat?: number;
  lng?: number;
  accuracy?: number;
  speedKmh?: number;
  totalTrackedKm?: number;
  deltaKm?: number;
  timestamp?: number;
}

interface NativeGpsOdometerPlugin {
  startTracking(options?: { resetAccumulator?: boolean }): Promise<{ started: boolean }>;
  stopTracking(): Promise<{ stopped: boolean }>;
  getSnapshot(): Promise<NativeGpsSnapshot>;
  requestImmediateFix(): Promise<{
    lat?: number;
    lng?: number;
    accuracy?: number;
    speedKmh?: number;
    timestamp?: number;
  }>;
  addListener(
    eventName: 'gpsFix',
    listenerFunc: (event: NativeGpsFixEvent) => void
  ): Promise<PluginListenerHandle>;
}

const NativeGpsOdometer = registerPlugin<NativeGpsOdometerPlugin>('NativeGpsOdometer');

const GPS_PERM_CACHE_KEY = 'mochilinha_gps_permission_v1';

// Thresholds tuned specifically for motorcycle delivery riders in urban/highway telemetry
const MAX_ACCEPTED_ACCURACY_M = 45;
const MAX_WARMUP_ACCURACY_M = 75;
const MAX_MOTORCYCLE_SPEED_MPS = 52; // ~187 km/h
const IDLE_SPEED_TIMEOUT_MS = 4000;

export function isGeolocationSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'geolocation' in navigator;
}

/**
 * Checks current device geolocation permission state without triggering a prompt.
 */
export async function checkGpsPermissionStatus(): Promise<GpsPermissionState> {
  if (!isGeolocationSupported() && !Capacitor.isNativePlatform()) return 'unsupported';

  if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
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

  const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(GPS_PERM_CACHE_KEY) : null;
  if (cached === 'granted') return 'granted';
  return 'prompt';
}

/**
 * Explicitly triggers the native device/browser Geolocation permission dialog
 * using fresh high-accuracy positioning (zero stale cache).
 */
export async function requestDeviceGpsPermission(): Promise<{
  granted: boolean;
  status: GpsPermissionState;
  coords?: GpsCoordinateSample;
  error?: string;
}> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativeGpsOdometer')) {
    try {
      const fix = await NativeGpsOdometer.requestImmediateFix();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GPS_PERM_CACHE_KEY, 'granted');
      }
      if (typeof fix.lat === 'number' && typeof fix.lng === 'number') {
        return {
          granted: true,
          status: 'granted',
          coords: {
            lat: fix.lat,
            lng: fix.lng,
            accuracy: Math.round(fix.accuracy || 10),
            speedKmh: Math.round(fix.speedKmh || 0),
            timestamp: fix.timestamp || Date.now(),
          },
        };
      }
    } catch {
      // Fall through to WebView Geolocation prompt if native check did not resolve coordinates
    }
  }

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
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 15000 }
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
 * Pure, deterministic 2D ENU Kalman + Adaptive Doppler GPS Odometer Engine.
 * Eliminates stationary drift, lateral GPS zig-zag, coarse initial lock poisoning,
 * and stale velocity lag while keeping instant sub-second responsiveness on the road.
 */
export class GpsOdometerEngine {
  private hasOrigin = false;
  private originLat = 0;
  private originLng = 0;
  private metersPerDegLat = 111132.92;
  private metersPerDegLng = 111412.84;

  private kx = 0;
  private ky = 0;
  private vx = 0;
  private vy = 0;
  private variance = 225;
  private lastSampleTs = 0;
  private outlierStreak = 0;

  private anchorX = 0;
  private anchorY = 0;
  private anchorLat = 0;
  private anchorLng = 0;
  private anchorTs = 0;
  private firstLockTs = 0;
  private firstLockAccuracy = 999;
  private acceptedStepsCount = 0;

  private lastMovementTs = 0;
  private lastSpeedKmh = 0;
  private lastAccuracy = 25;

  constructor(initialLastPoint?: { lat?: number; lng?: number; timestamp?: number } | null) {
    if (
      initialLastPoint &&
      typeof initialLastPoint.lat === 'number' &&
      typeof initialLastPoint.lng === 'number' &&
      Number.isFinite(initialLastPoint.lat) &&
      Number.isFinite(initialLastPoint.lng) &&
      (initialLastPoint.lat !== 0 || initialLastPoint.lng !== 0)
    ) {
      this.initOrigin(
        initialLastPoint.lat,
        initialLastPoint.lng,
        15,
        initialLastPoint.timestamp || Date.now()
      );
    }
  }

  private initOrigin(lat: number, lng: number, accuracy: number, timestamp: number): void {
    this.hasOrigin = true;
    this.originLat = lat;
    this.originLng = lng;
    this.metersPerDegLat = 111132.92;
    this.metersPerDegLng = Math.max(1000, 111412.84 * Math.cos((this.originLat * Math.PI) / 180));

    this.kx = 0;
    this.ky = 0;
    this.vx = 0;
    this.vy = 0;
    this.variance = Math.pow(Math.max(3.5, accuracy), 2);
    this.anchorX = 0;
    this.anchorY = 0;
    this.anchorLat = lat;
    this.anchorLng = lng;
    this.anchorTs = timestamp;
    this.firstLockTs = timestamp;
    this.firstLockAccuracy = accuracy;
    this.lastSampleTs = timestamp;
    this.lastAccuracy = accuracy;
  }

  ingest(sample: GpsRawFixInput): GpsTrackingUpdate | null {
    const { lat, lng, timestamp } = sample;
    const accuracy = Number.isFinite(sample.accuracy) && sample.accuracy > 0 ? sample.accuracy : 15;
    const speedMps =
      sample.speedMps !== null && sample.speedMps !== undefined && Number.isFinite(sample.speedMps) && sample.speedMps >= 0
        ? sample.speedMps
        : null;

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      (lat === 0 && lng === 0)
    ) {
      return null;
    }

    if (this.lastSampleTs > 0 && timestamp <= this.lastSampleTs) {
      return null;
    }

    // Before first high-confidence lock, report coarse warm-up coords without poisoning the anchor
    if (!this.hasOrigin) {
      if (accuracy > MAX_ACCEPTED_ACCURACY_M) {
        if (accuracy <= MAX_WARMUP_ACCURACY_M) {
          this.lastAccuracy = accuracy;
          return {
            deltaKm: 0,
            currentCoords: {
              lat,
              lng,
              accuracy: Math.round(accuracy),
              speedKmh: 0,
              timestamp,
            },
            isMoving: false,
          };
        }
        return null;
      }

      this.initOrigin(lat, lng, accuracy, timestamp);
      const initialSpeedKmh = speedMps !== null && speedMps >= 0.7 ? Math.round(speedMps * 3.6) : 0;
      this.lastSpeedKmh = initialSpeedKmh;
      if (initialSpeedKmh > 0) this.lastMovementTs = timestamp;

      return {
        deltaKm: 0,
        currentCoords: {
          lat,
          lng,
          accuracy: Math.round(accuracy),
          speedKmh: initialSpeedKmh,
          timestamp,
        },
        isMoving: initialSpeedKmh >= 3,
      };
    }

    // Reject inaccurate spikes (> 45m) during tracking so cell-tower bounces never inject fake KM
    if (accuracy > MAX_ACCEPTED_ACCURACY_M) {
      return null;
    }

    const rawX = (lng - this.originLng) * this.metersPerDegLng;
    const rawY = (lat - this.originLat) * this.metersPerDegLat;
    const dt = Math.max(0.1, (timestamp - this.lastSampleTs) / 1000);
    const rawJumpM = Math.hypot(rawX - this.kx, rawY - this.ky);
    const impliedJumpSpeedMps = rawJumpM / dt;

    // Teleport / outlier rejection with automatic tunnel-emergence recovery after 3 consecutive confirmations
    if (
      impliedJumpSpeedMps > MAX_MOTORCYCLE_SPEED_MPS &&
      rawJumpM > 40 &&
      (speedMps === null || speedMps < 42)
    ) {
      this.outlierStreak += 1;
      if (this.outlierStreak < 3) {
        return null;
      }
      // Confirmed relocation (e.g. signal returned after tunnel/underpass): re-anchor without teleport km
      this.outlierStreak = 0;
      this.kx = rawX;
      this.ky = rawY;
      this.vx = 0;
      this.vy = 0;
      this.variance = Math.pow(Math.max(4, accuracy), 2);
      this.anchorX = rawX;
      this.anchorY = rawY;
      this.anchorLat = lat;
      this.anchorLng = lng;
      this.anchorTs = timestamp;
      this.lastSampleTs = timestamp;
      this.lastAccuracy = accuracy;
      this.lastSpeedKmh = speedMps !== null ? Math.round(speedMps * 3.6) : 0;
      return {
        deltaKm: 0,
        currentCoords: {
          lat,
          lng,
          accuracy: Math.round(accuracy),
          speedKmh: this.lastSpeedKmh,
          timestamp,
        },
        isMoving: false,
      };
    }
    this.outlierStreak = 0;

    // 2D Predictive Constant-Velocity Kalman Update (zero lag on straightaways & corners, smooths lateral noise)
    const hasDopplerMotion = speedMps !== null && speedMps >= 1.2; // >= 4.3 km/h
    const estSpeedMps = speedMps !== null ? speedMps : Math.min(45, rawJumpM / dt);
    const isMovingSample = hasDopplerMotion || (speedMps === null && estSpeedMps >= 1.2);
    const velDecay = isMovingSample ? Math.min(1, 3.0 / Math.max(1, dt)) * 0.85 : 0;
    const predX = this.kx + this.vx * dt * velDecay;
    const predY = this.ky + this.vy * dt * velDecay;

    const q = estSpeedMps < 1.0 ? 0.7 : Math.min(12.0, Math.max(4.5, estSpeedMps * 0.75));
    this.variance = Math.min(2500, this.variance + dt * q * q);

    const r = Math.pow(Math.max(3.0, Math.min(MAX_ACCEPTED_ACCURACY_M, accuracy)), 2);
    const k = this.variance / (this.variance + r);
    const nextKx = predX + k * (rawX - predX);
    const nextKy = predY + k * (rawY - predY);

    if (isMovingSample) {
      const instVx = (nextKx - this.kx) / dt;
      const instVy = (nextKy - this.ky) / dt;
      if (Math.hypot(instVx, instVy) <= MAX_MOTORCYCLE_SPEED_MPS) {
        this.vx = this.vx * 0.35 + instVx * 0.65;
        this.vy = this.vy * 0.35 + instVy * 0.65;
      }
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.kx = nextKx;
    this.ky = nextKy;
    this.variance = (1 - k) * this.variance;

    const filteredLat = this.originLat + this.ky / this.metersPerDegLat;
    const filteredLng = this.originLng + this.kx / this.metersPerDegLng;
    this.lastSampleTs = timestamp;
    this.lastAccuracy = accuracy;

    let deltaKm = 0;
    let speedKmh = speedMps !== null ? (speedMps < 0.7 ? 0 : Math.round(speedMps * 3.6)) : this.lastSpeedKmh;

    // First-lock convergence guard: if initial lock was noisy (>24m) and crisp fix (<=16m) arrives while parked, refine start anchor silently
    if (
      this.acceptedStepsCount === 0 &&
      timestamp - this.firstLockTs <= 6000 &&
      !hasDopplerMotion &&
      accuracy <= 16 &&
      this.firstLockAccuracy > 24
    ) {
      this.anchorX = this.kx;
      this.anchorY = this.ky;
      this.anchorLat = filteredLat;
      this.anchorLng = filteredLng;
      this.anchorTs = timestamp;
    } else {
      const stepM = Math.hypot(this.kx - this.anchorX, this.ky - this.anchorY);
      const anchorDt = Math.max(0.1, (timestamp - this.anchorTs) / 1000);
      const anchorAvgSpeedMps = stepM / anchorDt;
      const minStepM = hasDopplerMotion
        ? 2.0
        : Math.max(6.5, Math.min(20, accuracy * 0.6));

      const stepValid = hasDopplerMotion
        ? stepM >= minStepM && anchorAvgSpeedMps <= MAX_MOTORCYCLE_SPEED_MPS
        : stepM >= minStepM && anchorAvgSpeedMps >= 0.8 && anchorAvgSpeedMps <= MAX_MOTORCYCLE_SPEED_MPS;

      if (stepValid) {
        deltaKm = calculateHaversineKm(this.anchorLat, this.anchorLng, filteredLat, filteredLng);
        this.anchorX = this.kx;
        this.anchorY = this.ky;
        this.anchorLat = filteredLat;
        this.anchorLng = filteredLng;
        this.anchorTs = timestamp;
        this.acceptedStepsCount += 1;
        this.lastMovementTs = timestamp;

        if (speedMps === null) {
          speedKmh = Math.min(165, Math.round(anchorAvgSpeedMps * 3.6));
        }
      } else if (!hasDopplerMotion && timestamp - this.anchorTs >= 3500) {
        speedKmh = 0;
      }
    }

    if (hasDopplerMotion) {
      this.lastMovementTs = timestamp;
    }
    this.lastSpeedKmh = speedKmh;

    return {
      deltaKm,
      currentCoords: {
        lat: filteredLat,
        lng: filteredLng,
        accuracy: Math.round(accuracy),
        speedKmh,
        timestamp,
      },
      isMoving: deltaKm > 0 || hasDopplerMotion,
    };
  }

  /**
   * Decays stale displayed speed to 0 km/h when rider stops and provider stops sending updates.
   */
  checkIdleSpeedDecay(nowTs = Date.now()): GpsTrackingUpdate | null {
    if (!this.hasOrigin || this.lastSpeedKmh === 0) return null;
    if (nowTs - Math.max(this.lastMovementTs, this.anchorTs) < IDLE_SPEED_TIMEOUT_MS) {
      return null;
    }
    this.lastSpeedKmh = 0;
    return {
      deltaKm: 0,
      currentCoords: {
        lat: this.anchorLat,
        lng: this.anchorLng,
        accuracy: Math.round(this.lastAccuracy),
        speedKmh: 0,
        timestamp: nowTs,
      },
      isMoving: false,
    };
  }
}

/**
 * Starts continuous GPS odometer tracking using:
 * 1) Native Android Foreground Service + 500ms GNSS LocationManager when inside APK
 * 2) High-accuracy 2D Kalman + Doppler Web Geolocation watcher with zero-cache and adaptive watchdog on Web/PWA
 */
export function startGpsShiftWatcher(
  initialLastPoint: { lat?: number; lng?: number; timestamp?: number; resetNativeAccumulator?: boolean } | null,
  onDistanceUpdate: (update: GpsTrackingUpdate) => void,
  onStatusError?: (errMessage: string, isPermissionDenied: boolean) => void
): { stop: () => void } {
  const isNative = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativeGpsOdometer');

  if (isNative) {
    let isStopped = false;
    let listenerHandle: PluginListenerHandle | null = null;
    let lastSyncedNativeTotalKm = 0;
    let lastNativeFixWallMs = Date.now();
    let lastKnownCoords: GpsCoordinateSample = {
      lat: initialLastPoint?.lat || 0,
      lng: initialLastPoint?.lng || 0,
      accuracy: 15,
      speedKmh: 0,
      timestamp: initialLastPoint?.timestamp || Date.now(),
    };

    const emitNativeDelta = (
      lat: number,
      lng: number,
      accuracy: number,
      speedKmh: number,
      totalTrackedKm: number,
      timestamp: number,
      isMoving: boolean
    ) => {
      if (isStopped) return;
      const safeTotal = Number.isFinite(totalTrackedKm) ? Math.max(0, totalTrackedKm) : lastSyncedNativeTotalKm;
      const deltaKm = Math.max(0, safeTotal - lastSyncedNativeTotalKm);
      if (safeTotal > lastSyncedNativeTotalKm) {
        lastSyncedNativeTotalKm = safeTotal;
      }
      lastNativeFixWallMs = Date.now();
      lastKnownCoords = {
        lat,
        lng,
        accuracy: Math.round(accuracy || 15),
        speedKmh: Math.round(speedKmh || 0),
        timestamp: timestamp || Date.now(),
      };
      onDistanceUpdate({
        deltaKm,
        currentCoords: lastKnownCoords,
        isMoving,
      });
    };

    const syncNativeSnapshot = async () => {
      if (isStopped) return;
      try {
        const snap = await NativeGpsOdometer.getSnapshot();
        if (isStopped || !snap?.active) return;
        const total = Number(snap.totalTrackedKm || 0);
        if (total > lastSyncedNativeTotalKm || (snap.lat && snap.lng)) {
          emitNativeDelta(
            snap.lat || lastKnownCoords.lat,
            snap.lng || lastKnownCoords.lng,
            snap.accuracy || lastKnownCoords.accuracy,
            snap.speedKmh ?? 0,
            Math.max(lastSyncedNativeTotalKm, total),
            snap.timestamp || Date.now(),
            (snap.speedKmh || 0) >= 3
          );
        }
      } catch {
        // Ignore snapshot error
      }
    };

    (async () => {
      try {
        listenerHandle = await NativeGpsOdometer.addListener('gpsFix', ev => {
          emitNativeDelta(
            ev.lat,
            ev.lng,
            ev.accuracy,
            ev.speedKmh,
            ev.totalTrackedKm,
            ev.timestamp,
            ev.isMoving
          );
        });
        await NativeGpsOdometer.startTracking({
          resetAccumulator: Boolean(initialLastPoint?.resetNativeAccumulator),
        });
        await syncNativeSnapshot();
      } catch (err: any) {
        if (!isStopped) {
          const msg = String(err?.message || err || '');
          onStatusError?.(
            msg || 'Falha ao iniciar o serviço nativo de GPS em 2º plano.',
            msg.toLowerCase().includes('negad') || msg.toLowerCase().includes('denied')
          );
        }
      }
    })();

    const onVisibility = () => {
      if (!isStopped && document.visibilityState === 'visible') {
        void syncNativeSnapshot();
      }
    };

    const nativeIdleWatchdog = setInterval(() => {
      if (isStopped) return;
      if (Date.now() - lastNativeFixWallMs >= IDLE_SPEED_TIMEOUT_MS && lastKnownCoords.speedKmh > 0) {
        lastKnownCoords = { ...lastKnownCoords, speedKmh: 0, timestamp: Date.now() };
        onDistanceUpdate({
          deltaKm: 0,
          currentCoords: lastKnownCoords,
          isMoving: false,
        });
      }
    }, 1500);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return {
      stop: () => {
        isStopped = true;
        clearInterval(nativeIdleWatchdog);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisibility);
        }
        if (listenerHandle) {
          void listenerHandle.remove();
          listenerHandle = null;
        }
        void NativeGpsOdometer.stopTracking().catch(() => {});
      },
    };
  }

  // Fallback / Web & PWA Mode: Enhanced 2D Kalman + Adaptive Watchdog Geolocation
  if (!isGeolocationSupported()) {
    onStatusError?.('GPS não suportado neste dispositivo.', false);
    return { stop: () => {} };
  }

  const engine = new GpsOdometerEngine(initialLastPoint);
  let watchId: number | null = null;
  let wakeLockSentinel: any = null;
  let isStopped = false;
  let lastFixWallTime = Date.now();
  let isPollInFlight = false;

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
    lastFixWallTime = Date.now();

    const update = engine.ingest({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy || 15,
      speedMps: position.coords.speed,
      timestamp: position.timestamp || Date.now(),
    });

    if (update) {
      onDistanceUpdate(update);
    }
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

  const triggerImmediateFix = () => {
    if (isStopped || isPollInFlight) return;
    isPollInFlight = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        isPollInFlight = false;
        processPosition(pos);
      },
      () => {
        isPollInFlight = false;
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000,
      }
    );
  };

  // Start zero-cache high-accuracy continuous watchPosition
  try {
    watchId = navigator.geolocation.watchPosition(processPosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  } catch {
    onStatusError?.('Falha ao iniciar o rastreamento do odômetro por GPS.', false);
  }

  // Trigger an instant initial lock immediately so rider doesn't wait for watchPosition warm-up
  triggerImmediateFix();

  const handleVisibilityChange = () => {
    if (isStopped) return;
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      triggerImmediateFix();
    }
  };

  const handleWindowFocus = () => {
    if (!isStopped) {
      triggerImmediateFix();
    }
  };

  // Adaptive watchdog: only polls if watchPosition goes quiet >= 2.2s, avoiding GPS contention while streaming fast,
  // and decays idle speed cleanly to 0 km/h after 4s stationary
  const watchdogInterval = setInterval(() => {
    if (isStopped) return;
    const now = Date.now();
    if (now - lastFixWallTime >= 2200) {
      triggerImmediateFix();
    }
    const decayUpdate = engine.checkIdleSpeedDecay(now);
    if (decayUpdate) {
      onDistanceUpdate(decayUpdate);
    }
  }, 1500);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleWindowFocus);
  }

  return {
    stop: () => {
      isStopped = true;
      clearInterval(watchdogInterval);
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    },
  };
}
