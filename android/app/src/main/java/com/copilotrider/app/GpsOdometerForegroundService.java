package com.copilotrider.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Binder;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.util.Locale;

/**
 * High-frequency Android Foreground Service for real-time GPS odometer tracking.
 * Keeps GNSS hardware active at 500ms / 0.5m intervals even when switching to delivery apps
 * or locking the screen, filtering fixes through an adaptive 2D ENU Kalman + Doppler gate.
 */
public class GpsOdometerForegroundService extends Service implements LocationListener {

    public static final String CHANNEL_ID = "mochilinha_gps_odometer";
    public static final int NOTIFICATION_ID = 4401;
    public static final String ACTION_START = "com.copilotrider.app.action.START_GPS";
    public static final String ACTION_STOP = "com.copilotrider.app.action.STOP_GPS";

    public interface FixCallback {
        void onFilteredFix(
            double lat,
            double lng,
            double accuracy,
            double speedKmh,
            double deltaKm,
            double totalTrackedKm,
            boolean isMoving,
            long timestamp
        );
    }

    private final IBinder binder = new LocalBinder();
    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private FixCallback fixCallback;
    private boolean isTracking = false;

    // ENU 2D Kalman & Anchor state
    private boolean hasOrigin = false;
    private double originLat = 0.0;
    private double originLng = 0.0;
    private double metersPerDegLat = 111132.92;
    private double metersPerDegLng = 111412.84;

    private double kx = 0.0;
    private double ky = 0.0;
    private double vx = 0.0;
    private double vy = 0.0;
    private double variance = 225.0;
    private long lastSampleTs = 0L;
    private int outlierStreak = 0;

    private double anchorX = 0.0;
    private double anchorY = 0.0;
    private double anchorLat = 0.0;
    private double anchorLng = 0.0;
    private long anchorTs = 0L;
    private long firstLockTs = 0L;
    private double firstLockAccuracy = 999.0;
    private int acceptedStepsCount = 0;

    private double pendingBackgroundDeltaKm = 0.0;
    private double totalTrackedKm = 0.0;
    private double lastSpeedKmh = 0.0;
    private double lastAccuracy = 0.0;
    private long lastFixWallMs = 0L;

    public class LocalBinder extends Binder {
        public GpsOdometerForegroundService getService() {
            return GpsOdometerForegroundService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    public void setFixCallback(FixCallback callback) {
        this.fixCallback = callback;
    }

    public synchronized double drainPendingBackgroundDeltaKm() {
        double drained = pendingBackgroundDeltaKm;
        pendingBackgroundDeltaKm = 0.0;
        return drained;
    }

    public synchronized double getLastSpeedKmh() {
        if (System.currentTimeMillis() - lastFixWallMs > 4000L) {
            return 0.0;
        }
        return lastSpeedKmh;
    }

    public synchronized double getTotalTrackedKm() {
        return totalTrackedKm;
    }

    public synchronized double getLastLat() {
        return anchorLat;
    }

    public synchronized double getLastLng() {
        return anchorLng;
    }

    public synchronized double getLastAccuracy() {
        return lastAccuracy;
    }

    public synchronized long getLastTimestamp() {
        return lastSampleTs;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            stopTrackingInternal();
            stopSelf();
            return START_NOT_STICKY;
        }
        startTrackingInternal(intent != null && intent.getBooleanExtra("resetAccumulator", false));
        return START_STICKY;
    }

    public synchronized void resetEngine() {
        hasOrigin = false;
        kx = 0.0;
        ky = 0.0;
        vx = 0.0;
        vy = 0.0;
        variance = 225.0;
        lastSampleTs = 0L;
        outlierStreak = 0;
        anchorX = 0.0;
        anchorY = 0.0;
        anchorLat = 0.0;
        anchorLng = 0.0;
        anchorTs = 0L;
        firstLockTs = 0L;
        firstLockAccuracy = 999.0;
        acceptedStepsCount = 0;
        pendingBackgroundDeltaKm = 0.0;
        totalTrackedKm = 0.0;
        lastSpeedKmh = 0.0;
    }

    private void startTrackingInternal(boolean reset) {
        if (reset) {
            resetEngine();
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            stopSelf();
            return;
        }

        Notification notification = buildNotification(totalTrackedKm, lastSpeedKmh);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Mochilinha:GpsOdometerWakeLock");
                wakeLock.setReferenceCounted(false);
            }
        }
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(12 * 60 * 60 * 1000L);
        }

        if (!isTracking && locationManager != null) {
            isTracking = true;
            try {
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        500L,
                        0.5f,
                        this,
                        Looper.getMainLooper()
                    );
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                        && locationManager.hasProvider(LocationManager.FUSED_PROVIDER)) {
                    locationManager.requestLocationUpdates(
                        LocationManager.FUSED_PROVIDER,
                        800L,
                        1.0f,
                        this,
                        Looper.getMainLooper()
                    );
                } else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        2000L,
                        3.0f,
                        this,
                        Looper.getMainLooper()
                    );
                }
            } catch (SecurityException | IllegalArgumentException ignored) {
                isTracking = false;
            }
        }
    }

    private void stopTrackingInternal() {
        isTracking = false;
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception ignored) {
            }
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
    }

    @Override
    public void onDestroy() {
        stopTrackingInternal();
        super.onDestroy();
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        double lat = location.getLatitude();
        double lng = location.getLongitude();
        double accuracy = location.hasAccuracy() ? location.getAccuracy() : 15.0;
        long timestamp = location.getTime() > 0 ? location.getTime() : System.currentTimeMillis();
        Double speedMps = location.hasSpeed() && location.getSpeed() >= 0f ? (double) location.getSpeed() : null;

        if (!Double.isFinite(lat) || !Double.isFinite(lng) || (lat == 0.0 && lng == 0.0)) {
            return;
        }
        if (accuracy > 45.0) {
            return;
        }

        double deltaKm = 0.0;
        boolean isMoving = false;
        double filteredLat = lat;
        double filteredLng = lng;
        double speedKmh = speedMps != null ? Math.round(speedMps * 3.6) : 0.0;

        synchronized (this) {
            if (lastSampleTs > 0 && timestamp <= lastSampleTs) {
                return;
            }
            lastFixWallMs = System.currentTimeMillis();
            lastAccuracy = accuracy;

            if (!hasOrigin) {
                hasOrigin = true;
                originLat = lat;
                originLng = lng;
                metersPerDegLat = 111132.92;
                metersPerDegLng = Math.max(1000.0, 111412.84 * Math.cos(Math.toRadians(originLat)));
                kx = 0.0;
                ky = 0.0;
                variance = Math.pow(Math.max(3.5, accuracy), 2);
                anchorX = 0.0;
                anchorY = 0.0;
                anchorLat = lat;
                anchorLng = lng;
                anchorTs = timestamp;
                firstLockTs = timestamp;
                firstLockAccuracy = accuracy;
                lastSampleTs = timestamp;
                filteredLat = lat;
                filteredLng = lng;
            } else {
                double rawX = (lng - originLng) * metersPerDegLng;
                double rawY = (lat - originLat) * metersPerDegLat;
                double dt = Math.max(0.1, (timestamp - lastSampleTs) / 1000.0);
                double rawJumpM = Math.hypot(rawX - kx, rawY - ky);
                double impliedJumpSpeedMps = rawJumpM / dt;

                if (impliedJumpSpeedMps > 52.0 && rawJumpM > 40.0 && (speedMps == null || speedMps < 42.0)) {
                    outlierStreak++;
                    if (outlierStreak < 3) {
                        return;
                    }
                    // Emerged from tunnel/blockage: re-anchor cleanly without adding phantom distance
                    outlierStreak = 0;
                    kx = rawX;
                    ky = rawY;
                    vx = 0.0;
                    vy = 0.0;
                    variance = Math.pow(Math.max(4.0, accuracy), 2);
                    anchorX = rawX;
                    anchorY = rawY;
                    anchorLat = lat;
                    anchorLng = lng;
                    anchorTs = timestamp;
                    lastSampleTs = timestamp;
                    lastSpeedKmh = speedKmh;
                    return;
                }
                outlierStreak = 0;

                boolean hasDopplerMotion = speedMps != null && speedMps >= 1.2;
                double estSpeedMps = speedMps != null ? speedMps : Math.min(45.0, rawJumpM / dt);
                boolean isMovingSample = hasDopplerMotion || (speedMps == null && estSpeedMps >= 1.2);
                double velDecay = isMovingSample ? Math.min(1.0, 3.0 / Math.max(1.0, dt)) * 0.85 : 0.0;
                double predX = kx + vx * dt * velDecay;
                double predY = ky + vy * dt * velDecay;

                double q = estSpeedMps < 1.0 ? 0.7 : Math.min(12.0, Math.max(4.5, estSpeedMps * 0.75));
                variance = Math.min(2500.0, variance + dt * q * q);
                double r = Math.pow(Math.max(3.0, Math.min(45.0, accuracy)), 2);
                double k = variance / (variance + r);
                double nextKx = predX + k * (rawX - predX);
                double nextKy = predY + k * (rawY - predY);

                if (isMovingSample) {
                    double instVx = (nextKx - kx) / dt;
                    double instVy = (nextKy - ky) / dt;
                    if (Math.hypot(instVx, instVy) <= 52.0) {
                        vx = vx * 0.35 + instVx * 0.65;
                        vy = vy * 0.35 + instVy * 0.65;
                    }
                } else {
                    vx = 0.0;
                    vy = 0.0;
                }

                kx = nextKx;
                ky = nextKy;
                variance = (1.0 - k) * variance;

                filteredLat = originLat + (ky / metersPerDegLat);
                filteredLng = originLng + (kx / metersPerDegLng);
                lastSampleTs = timestamp;

                if (acceptedStepsCount == 0
                        && (timestamp - firstLockTs) <= 6000L
                        && !hasDopplerMotion
                        && accuracy <= 16.0
                        && firstLockAccuracy > 24.0) {
                    anchorX = kx;
                    anchorY = ky;
                    anchorLat = filteredLat;
                    anchorLng = filteredLng;
                    anchorTs = timestamp;
                } else {
                    double stepM = Math.hypot(kx - anchorX, ky - anchorY);
                    double anchorDt = Math.max(0.1, (timestamp - anchorTs) / 1000.0);
                    double anchorAvgSpeedMps = stepM / anchorDt;
                    double minStepM = hasDopplerMotion
                        ? 2.0
                        : Math.max(6.5, Math.min(20.0, accuracy * 0.6));

                    boolean stepValid = hasDopplerMotion
                        ? (stepM >= minStepM && anchorAvgSpeedMps <= 52.0)
                        : (stepM >= minStepM && anchorAvgSpeedMps >= 0.8 && anchorAvgSpeedMps <= 52.0);

                    if (stepValid) {
                        deltaKm = haversineKm(anchorLat, anchorLng, filteredLat, filteredLng);
                        anchorX = kx;
                        anchorY = ky;
                        anchorLat = filteredLat;
                        anchorLng = filteredLng;
                        anchorTs = timestamp;
                        acceptedStepsCount++;
                        totalTrackedKm += deltaKm;
                        if (speedMps == null) {
                            speedKmh = Math.min(165.0, Math.round(anchorAvgSpeedMps * 3.6));
                        }
                    } else if (!hasDopplerMotion && (timestamp - anchorTs) >= 3500L) {
                        speedKmh = 0.0;
                    }
                }

                if (speedMps != null) {
                    speedKmh = speedMps < 0.7 ? 0.0 : Math.round(speedMps * 3.6);
                }
                lastSpeedKmh = speedKmh;
                isMoving = deltaKm > 0.0 || (speedMps != null && speedMps >= 1.2);
            }
        }

        if (deltaKm > 0.0) {
            if (fixCallback == null) {
                synchronized (this) {
                    pendingBackgroundDeltaKm += deltaKm;
                }
            }
            updateNotification(totalTrackedKm, speedKmh);
        }

        if (fixCallback != null) {
            fixCallback.onFilteredFix(
                filteredLat,
                filteredLng,
                Math.round(accuracy),
                speedKmh,
                deltaKm,
                totalTrackedKm,
                isMoving,
                timestamp
            );
        }
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(@NonNull String provider) {}

    @Override
    public void onProviderDisabled(@NonNull String provider) {}

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return R * c;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Odômetro GPS em Tempo Real",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantém a leitura de quilometragem precisa em segundo plano durante o turno.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(double km, double speedKmh) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openIntent, pendingFlags);

        String contentText = String.format(
            Locale.forLanguageTag("pt-BR"),
            "Rodados: +%.2f km · %.0f km/h",
            km,
            speedKmh
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Mochilinha · Odômetro GPS Ativo")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void updateNotification(double km, double speedKmh) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(km, speedKmh));
        }
    }
}
