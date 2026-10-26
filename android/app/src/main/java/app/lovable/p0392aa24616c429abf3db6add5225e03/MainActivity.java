package app.lovable.p0392aa24616c429abf3db6add5225e03;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CardFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
