package com.driverhub.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import android.content.SharedPreferences;

public class TrackingService extends Service {

    private static final String CHANNEL_ID      = "driverhub_tracking";
    private static final int    NOTIFICATION_ID = 1001;
    private static final String PREFS_NAME      = "dh_tracking";

    // Preference keys
    private static final String KEY_SHIFT_DIST  = "shift_distance";
    private static final String KEY_RIDE_DIST   = "ride_distance";
    private static final String KEY_IS_RIDING   = "is_riding";
    private static final String KEY_IS_TRACKING = "is_tracking";
    private static final String KEY_LAST_LAT    = "last_lat";
    private static final String KEY_LAST_LNG    = "last_lng";
    private static final String KEY_DATE        = "tracking_date";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private SharedPreferences prefs;

    public static final String ACTION_START_SHIFT = "START_SHIFT";
    public static final String ACTION_STOP_SHIFT  = "STOP_SHIFT";
    public static final String ACTION_START_RIDE  = "START__RIDE";
    public static final String ACTION_STOP_RIDE   = "STOP_RIDE";

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
        resetIfNewDay();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        // If system restarts service (intent is null), check if we should resume tracking
        if (action == null) {
            if (prefs.getBoolean(KEY_IS_TRACKING, false) || prefs.getFloat(KEY_SHIFT_DIST, 0f) > 0) {
                action = ACTION_START_SHIFT;
            }
        }

        if (ACTION_START_SHIFT.equals(action)) {
            prefs.edit().putBoolean(KEY_IS_TRACKING, true).apply();
            startForegroundServiceInternal();
            startLocationUpdates();

        } else if (ACTION_STOP_SHIFT.equals(action)) {
            prefs.edit().putBoolean(KEY_IS_TRACKING, false).apply();
            stopLocationUpdates();
            prefs.edit()
                .putFloat(KEY_SHIFT_DIST, 0f)
                .putFloat(KEY_RIDE_DIST, 0f)
                .putBoolean(KEY_IS_RIDING, false)
                .apply();
            stopForeground(true);
            stopSelf();

        } else if (ACTION_START_RIDE.equals(action)) {
            prefs.edit().putBoolean(KEY_IS_RIDING, true).putFloat(KEY_RIDE_DIST, 0f).apply();
            updateNotification();

        } else if (ACTION_STOP_RIDE.equals(action)) {
            prefs.edit().putBoolean(KEY_IS_RIDING, false).apply();
            updateNotification();
        }

        return START_STICKY;
    }

    private void startForegroundServiceInternal() {
        float shiftKm = prefs.getFloat(KEY_SHIFT_DIST, 0f);
        float rideKm  = prefs.getFloat(KEY_RIDE_DIST, 0f);
        Notification notification = buildNotification(shiftKm, rideKm);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void startLocationUpdates() {
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
            .setMinUpdateIntervalMillis(3000)
            .setMinUpdateDistanceMeters(5)
            .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) return;
                Location location = result.getLastLocation();
                if (location == null || location.getAccuracy() > 80) return;

                double newLat = location.getLatitude();
                double newLng = location.getLongitude();
                float  speed  = location.getSpeed() * 3.6f;

                double prevLat = prefs.getFloat(KEY_LAST_LAT, 0f);
                double prevLng = prefs.getFloat(KEY_LAST_LNG, 0f);

                if (prevLat != 0 && prevLng != 0) {
                    float inc = distanceBetween(prevLat, prevLng, newLat, newLng);
                    if (inc > 0.030f && inc < 1.0f) {
                        float shiftDist = prefs.getFloat(KEY_SHIFT_DIST, 0f) + inc;
                        prefs.edit().putFloat(KEY_SHIFT_DIST, shiftDist).apply();

                        if (prefs.getBoolean(KEY_IS_RIDING, false) && inc > 0.020f && speed > 2f) {
                            float rideDist = prefs.getFloat(KEY_RIDE_DIST, 0f) + inc;
                            prefs.edit().putFloat(KEY_RIDE_DIST, rideDist).apply();
                        }
                        updateNotification();
                    }
                }

                prefs.edit().putFloat(KEY_LAST_LAT, (float) newLat).putFloat(KEY_LAST_LNG, (float) newLng).apply();
            }
        };

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        } catch (SecurityException e) { e.printStackTrace(); }
    }

    private void stopLocationUpdates() {
        if (locationCallback != null) fusedLocationClient.removeLocationUpdates(locationCallback);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "DriverHub Tracking", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(float shiftKm, float rideKm) {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openApp, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        boolean isRiding = prefs.getBoolean(KEY_IS_RIDING, false);
        String contentText = isRiding ? String.format("🏍️ Ride: %.2f km  |  Shift: %.2f km", rideKm, shiftKm) : String.format("📍 Shift total: %.2f km", shiftKm);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(isRiding ? "🚀 Ride in Progress" : "✅ Shift Active — DriverHub")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    private void updateNotification() {
        float shiftKm = prefs.getFloat(KEY_SHIFT_DIST, 0f);
        float rideKm  = prefs.getFloat(KEY_RIDE_DIST, 0f);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification(shiftKm, rideKm));
    }

    private float distanceBetween(double lat1, double lng1, double lat2, double lng2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
        return (float)(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    private void resetIfNewDay() {
        String today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
        if (!today.equals(prefs.getString(KEY_DATE, ""))) {
            prefs.edit().putFloat(KEY_SHIFT_DIST, 0f).putFloat(KEY_RIDE_DIST, 0f).putBoolean(KEY_IS_RIDING, false).putString(KEY_DATE, today).apply();
        }
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopLocationUpdates();
        super.onDestroy();
    }
}