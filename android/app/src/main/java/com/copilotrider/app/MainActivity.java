package com.copilotrider.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeGpsOdometerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
