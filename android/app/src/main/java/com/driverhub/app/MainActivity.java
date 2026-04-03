package com.driverhub.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register our custom native TrackingPlugin before Capacitor bridge init
        registerPlugin(TrackingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}