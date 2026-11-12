package com.copilotrider.app;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeGpsOdometer",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class NativeGpsOdometerPlugin extends Plugin {

    private GpsOdometerForegroundService odometerService;
    private boolean isBound = false;
    private double lastHandledTotalKm = 0.0;

    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            GpsOdometerForegroundService.LocalBinder binder =
                (GpsOdometerForegroundService.LocalBinder) service;
            odometerService = binder.getService();
            isBound = true;
            odometerService.setFixCallback(
                (lat, lng, accuracy, speedKmh, deltaKm, totalTrackedKm, isMoving, timestamp) -> {
                    lastHandledTotalKm = totalTrackedKm;
                    JSObject ret = new JSObject();
                    ret.put("lat", lat);
                    ret.put("lng", lng);
                    ret.put("accuracy", accuracy);
                    ret.put("speedKmh", speedKmh);
                    ret.put("deltaKm", deltaKm);
                    ret.put("totalTrackedKm", totalTrackedKm);
                    ret.put("isMoving", isMoving);
                    ret.put("timestamp", timestamp);
                    notifyListeners("gpsFix", ret);
                }
            );
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            isBound = false;
            odometerService = null;
        }
    };

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "startTrackingPermsCallback");
            return;
        }
        startForegroundOdometer(call);
    }

    @PermissionCallback
    private void startTrackingPermsCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            startForegroundOdometer(call);
        } else {
            call.reject("Permissão de localização negada.");
        }
    }

    private void startForegroundOdometer(PluginCall call) {
        boolean resetAccumulator = call.getBoolean("resetAccumulator", false);
        if (resetAccumulator) {
            lastHandledTotalKm = 0.0;
        }

        Context ctx = getContext();
        Intent intent = new Intent(ctx, GpsOdometerForegroundService.class);
        intent.setAction(GpsOdometerForegroundService.ACTION_START);
        intent.putExtra("resetAccumulator", resetAccumulator);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(ctx, intent);
        } else {
            ctx.startService(intent);
        }

        if (!isBound) {
            ctx.bindService(intent, connection, Context.BIND_AUTO_CREATE);
        } else if (odometerService != null && resetAccumulator) {
            odometerService.resetEngine();
        }

        JSObject res = new JSObject();
        res.put("started", true);
        call.resolve(res);
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Context ctx = getContext();
        if (odometerService != null) {
            odometerService.setFixCallback(null);
        }
        if (isBound) {
            try {
                ctx.unbindService(connection);
            } catch (Exception ignored) {
            }
            isBound = false;
        }
        Intent stopIntent = new Intent(ctx, GpsOdometerForegroundService.class);
        stopIntent.setAction(GpsOdometerForegroundService.ACTION_STOP);
        ctx.stopService(stopIntent);
        lastHandledTotalKm = 0.0;

        JSObject res = new JSObject();
        res.put("stopped", true);
        call.resolve(res);
    }

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        JSObject res = new JSObject();
        if (odometerService != null) {
            double totalTrackedKm = odometerService.getTotalTrackedKm();
            double deltaSinceLast = Math.max(0.0, totalTrackedKm - lastHandledTotalKm);
            lastHandledTotalKm = totalTrackedKm;
            res.put("active", true);
            res.put("lat", odometerService.getLastLat());
            res.put("lng", odometerService.getLastLng());
            res.put("accuracy", odometerService.getLastAccuracy());
            res.put("speedKmh", odometerService.getLastSpeedKmh());
            res.put("totalTrackedKm", totalTrackedKm);
            res.put("deltaKm", deltaSinceLast);
            res.put("timestamp", odometerService.getLastTimestamp());
            odometerService.drainPendingBackgroundDeltaKm();
        } else {
            res.put("active", false);
            res.put("totalTrackedKm", 0.0);
            res.put("deltaKm", 0.0);
        }
        call.resolve(res);
    }

    @PluginMethod
    public void requestImmediateFix(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "immediateFixPermsCallback");
            return;
        }
        resolveLastKnownOrSingleFix(call);
    }

    @PermissionCallback
    private void immediateFixPermsCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            resolveLastKnownOrSingleFix(call);
        } else {
            call.reject("Permissão de localização negada.");
        }
    }

    private void resolveLastKnownOrSingleFix(PluginCall call) {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) {
                call.reject("GPS indisponível no dispositivo.");
                return;
            }
            Location gpsLoc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            Location netLoc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            Location best = gpsLoc;
            if (best == null || (netLoc != null && netLoc.getTime() > best.getTime() + 10000L && netLoc.getAccuracy() < best.getAccuracy())) {
                best = netLoc;
            }
            JSObject res = new JSObject();
            if (best != null) {
                res.put("lat", best.getLatitude());
                res.put("lng", best.getLongitude());
                res.put("accuracy", best.hasAccuracy() ? Math.round(best.getAccuracy()) : 15);
                res.put("speedKmh", best.hasSpeed() ? Math.round(best.getSpeed() * 3.6) : 0);
                res.put("timestamp", best.getTime() > 0 ? best.getTime() : System.currentTimeMillis());
            }
            call.resolve(res);
        } catch (SecurityException e) {
            call.reject("Permissão de localização necessária.");
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (odometerService != null) {
            odometerService.setFixCallback(null);
        }
        if (isBound) {
            try {
                getContext().unbindService(connection);
            } catch (Exception ignored) {
            }
            isBound = false;
        }
        super.handleOnDestroy();
    }
}
