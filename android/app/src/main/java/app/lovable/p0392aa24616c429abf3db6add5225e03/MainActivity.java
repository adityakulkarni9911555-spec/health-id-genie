package app.lovable.p0392aa24616c429abf3db6add5225e03;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long MAX_SPLASH_MS = 8000;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private ImageView splashOverlay;
    private long startedAt;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CardFilePlugin.class);
        super.onCreate(savedInstanceState);
        showBrandSplash();
    }

    /** Keeps the Medora logo on screen until the web page has painted, so there is no blank gap. */
    private void showBrandSplash() {
        startedAt = System.currentTimeMillis();
        splashOverlay = new ImageView(this);
        splashOverlay.setBackgroundColor(Color.WHITE);
        splashOverlay.setImageResource(R.drawable.splash);
        splashOverlay.setScaleType(ImageView.ScaleType.CENTER_CROP);
        addContentView(splashOverlay, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        handler.postDelayed(this::checkLoaded, 300);
    }

    private void checkLoaded() {
        if (splashOverlay == null) return;
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        boolean loaded = webView != null && webView.getProgress() >= 100;
        boolean timedOut = System.currentTimeMillis() - startedAt > MAX_SPLASH_MS;
        if (loaded || timedOut) {
            handler.postDelayed(this::hideSplash, loaded ? 350 : 0);
        } else {
            handler.postDelayed(this::checkLoaded, 150);
        }
    }

    private void hideSplash() {
        final ImageView view = splashOverlay;
        if (view == null) return;
        splashOverlay = null;
        view.animate().alpha(0f).setDuration(250).withEndAction(() -> {
            ViewGroup parent = (ViewGroup) view.getParent();
            if (parent != null) parent.removeView(view);
        }).start();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
