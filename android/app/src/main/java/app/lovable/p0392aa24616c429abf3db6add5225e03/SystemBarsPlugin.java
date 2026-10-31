package app.lovable.p0392aa24616c429abf3db6add5225e03;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Receives only the resolved page surface and icon contrast, never account data. */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    @PluginMethod
    public void setAppearance(PluginCall call) {
        Integer color = call.getInt("color");
        Boolean darkIcons = call.getBoolean("darkIcons");
        if (color == null || darkIcons == null) {
            call.reject("Missing screen appearance.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            android.view.Window window = getActivity().getWindow();
            WindowCompat.setDecorFitsSystemWindows(window, true);
            window.setStatusBarColor(color);
            window.setNavigationBarColor(color);
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(darkIcons);
            controller.setAppearanceLightNavigationBars(darkIcons);
            call.resolve();
        });
    }
}