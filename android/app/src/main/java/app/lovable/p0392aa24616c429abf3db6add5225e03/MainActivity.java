package app.lovable.p0392aa24616c429abf3db6add5225e03;

import android.animation.ValueAnimator;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.PathInterpolator;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long MAX_SPLASH_MS = 8000;
    private static final long MIN_SPLASH_MS = 1100;
    private static final int INK = Color.parseColor("#17153B");
    private static final int MUTED = Color.parseColor("#6B7280");
    private static final int BRAND = Color.parseColor("#6D5DF6");
    private static final int TRACK = Color.parseColor("#ECEBFB");

    private final Handler handler = new Handler(Looper.getMainLooper());
    private FrameLayout splash;
    private ImageView mark;
    private View progressBar;
    private ValueAnimator progressAnim;
    private long startedAt;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CardFilePlugin.class);
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        int surface = getResources().getColor(R.color.app_surface, getTheme());
        getWindow().setStatusBarColor(surface);
        getWindow().setNavigationBarColor(surface);
        boolean light = (getResources().getConfiguration().uiMode &
            android.content.res.Configuration.UI_MODE_NIGHT_MASK) !=
            android.content.res.Configuration.UI_MODE_NIGHT_YES;
        androidx.core.view.WindowInsetsControllerCompat controller =
            androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(light);
        controller.setAppearanceLightNavigationBars(light);
        showBrandSplash();
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    /** Branded launch screen: logo eases in, wordmark follows, then fades into the loaded wallet. */
    private void showBrandSplash() {
        startedAt = System.currentTimeMillis();
        PathInterpolator ease = new PathInterpolator(0.22f, 1f, 0.36f, 1f);

        splash = new FrameLayout(this);
        splash.setBackgroundColor(Color.WHITE);
        splash.setClickable(true);

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);

        mark = new ImageView(this);
        mark.setImageResource(R.drawable.brand_mark);
        mark.setElevation(dp(10));
        GradientDrawable outline = new GradientDrawable();
        outline.setCornerRadius(dp(22));
        outline.setColor(Color.TRANSPARENT);
        mark.setBackground(outline);
        mark.setClipToOutline(true);
        column.addView(mark, new LinearLayout.LayoutParams(dp(92), dp(92)));

        TextView word = new TextView(this);
        word.setText("Medora");
        word.setTextColor(INK);
        word.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30);
        word.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        word.setLetterSpacing(-0.01f);
        LinearLayout.LayoutParams wordLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wordLp.topMargin = dp(22);
        column.addView(word, wordLp);

        TextView tagline = new TextView(this);
        tagline.setText("Your health, always with you");
        tagline.setTextColor(MUTED);
        tagline.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        LinearLayout.LayoutParams tagLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tagLp.topMargin = dp(6);
        column.addView(tagline, tagLp);

        FrameLayout.LayoutParams colLp = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        splash.addView(column, colLp);

        // Slim loading track near the bottom; only appears if loading takes a moment.
        FrameLayout track = new FrameLayout(this);
        GradientDrawable trackBg = new GradientDrawable();
        trackBg.setCornerRadius(dp(2));
        trackBg.setColor(TRACK);
        track.setBackground(trackBg);
        track.setClipToOutline(true);
        progressBar = new View(this);
        GradientDrawable barBg = new GradientDrawable();
        barBg.setCornerRadius(dp(2));
        barBg.setColor(BRAND);
        progressBar.setBackground(barBg);
        track.addView(progressBar, new FrameLayout.LayoutParams(dp(40), dp(3)));
        FrameLayout.LayoutParams trackLp = new FrameLayout.LayoutParams(dp(120), dp(3),
            Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        trackLp.bottomMargin = dp(72);
        track.setAlpha(0f);
        splash.addView(track, trackLp);

        addContentView(splash, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Entrance choreography
        mark.setAlpha(0f); mark.setScaleX(0.88f); mark.setScaleY(0.88f);
        mark.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(520).setInterpolator(ease).start();
        word.setAlpha(0f); word.setTranslationY(dp(10));
        word.animate().alpha(1f).translationY(0f).setStartDelay(160).setDuration(460).setInterpolator(ease).start();
        tagline.setAlpha(0f); tagline.setTranslationY(dp(8));
        tagline.animate().alpha(1f).translationY(0f).setStartDelay(260).setDuration(460).setInterpolator(ease).start();
        track.animate().alpha(1f).setStartDelay(900).setDuration(300).start();

        progressAnim = ValueAnimator.ofFloat(-dp(40), dp(120));
        progressAnim.setDuration(1100);
        progressAnim.setRepeatCount(ValueAnimator.INFINITE);
        progressAnim.setInterpolator(new DecelerateInterpolator());
        progressAnim.addUpdateListener(a -> progressBar.setTranslationX((float) a.getAnimatedValue()));
        progressAnim.setStartDelay(900);
        progressAnim.start();

        handler.postDelayed(this::checkLoaded, 300);
    }

    private void checkLoaded() {
        if (splash == null) return;
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        long elapsed = System.currentTimeMillis() - startedAt;
        boolean loaded = webView != null && webView.getProgress() >= 100;
        boolean timedOut = elapsed > MAX_SPLASH_MS;
        if (timedOut || (loaded && elapsed >= MIN_SPLASH_MS)) {
            handler.postDelayed(this::hideSplash, loaded ? 300 : 0);
        } else {
            handler.postDelayed(this::checkLoaded, 120);
        }
    }

    private void hideSplash() {
        final FrameLayout view = splash;
        if (view == null) return;
        splash = null;
        if (mark != null) {
            mark.animate().scaleX(1.06f).scaleY(1.06f).setStartDelay(0).setDuration(380)
                .setInterpolator(new PathInterpolator(0.4f, 0f, 0.2f, 1f)).start();
        }
        view.animate().alpha(0f).setDuration(380)
            .setInterpolator(new PathInterpolator(0.4f, 0f, 0.2f, 1f))
            .withEndAction(() -> {
                if (progressAnim != null) progressAnim.cancel();
                ViewGroup parent = (ViewGroup) view.getParent();
                if (parent != null) parent.removeView(view);
            }).start();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (progressAnim != null) progressAnim.cancel();
        super.onDestroy();
    }
}
