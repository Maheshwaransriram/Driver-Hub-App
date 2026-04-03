package com.driverhub.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/**
 * Restarts the TrackingService after phone reboot if a shift was active.
 * Without this, the tracking stops on every reboot.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        // Check if shift was active when phone was shut down
        SharedPreferences prefs = context.getSharedPreferences("dh_tracking", Context.MODE_PRIVATE);
        float shiftDist = prefs.getFloat("shift_distance", 0f);

        if (shiftDist > 0) {
            // Shift was active — restart the foreground service
            Intent serviceIntent = new Intent(context, TrackingService.class);
            serviceIntent.setAction(TrackingService.ACTION_START_SHIFT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}