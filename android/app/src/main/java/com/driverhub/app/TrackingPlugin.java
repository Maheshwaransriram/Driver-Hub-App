package com.driverhub.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TrackingPlugin")
public class TrackingPlugin extends Plugin {

    private static final String PREFS_NAME = "dh_tracking";

    // ── Start shift — launches foreground service ─────────────────────────
    @PluginMethod
    public void startShift(PluginCall call) {
        Intent intent = new Intent(getContext(), TrackingService.class);
        intent.setAction(TrackingService.ACTION_START_SHIFT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    // ── Stop shift — stops foreground service ─────────────────────────────
    @PluginMethod
    public void stopShift(PluginCall call) {
        Intent intent = new Intent(getContext(), TrackingService.class);
        intent.setAction(TrackingService.ACTION_STOP_SHIFT);
        getContext().startService(intent);
        call.resolve();
    }

    // ── Start ride segment ────────────────────────────────────────────────
    @PluginMethod
    public void startRide(PluginCall call) {
        Intent intent = new Intent(getContext(), TrackingService.class);
        intent.setAction(TrackingService.ACTION_START_RIDE);
        getContext().startService(intent);
        call.resolve();
    }

    // ── Stop ride segment ─────────────────────────────────────────────────
    @PluginMethod
    public void stopRide(PluginCall call) {
        Intent intent = new Intent(getContext(), TrackingService.class);
        intent.setAction(TrackingService.ACTION_STOP_RIDE);
        getContext().startService(intent);
        call.resolve();
    }

    // ── Read current tracking data from SharedPreferences ─────────────────
    // Called by JS to sync distances into React state
    @PluginMethod
    public void getTrackingData(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
        JSObject data = new JSObject();
        data.put("shiftDistance", prefs.getFloat("shift_distance", 0f));
        data.put("rideDistance",  prefs.getFloat("ride_distance",  0f));
        data.put("isRiding",      prefs.getBoolean("is_riding", false));
        data.put("lastLat",       prefs.getFloat("last_lat", 0f));
        data.put("lastLng",       prefs.getFloat("last_lng", 0f));
        call.resolve(data);
    }
}