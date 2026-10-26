package app.lovable.p0392aa24616c429abf3db6add5225e03;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "CardFile")
public class CardFilePlugin extends Plugin {
    @PluginMethod
    public void savePdf(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");
        if (data == null || data.length() > 14000000 || filename == null ||
            !filename.matches("Medora-Health-Card-[A-Z0-9]+\\.pdf")) {
            call.reject("Invalid health card file.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null ||
            result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        getBridge().execute(() -> {
            try {
                String data = call.getString("data");
                if (data == null) throw new IllegalArgumentException();
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' ||
                    bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-') {
                    throw new IllegalArgumentException();
                }
                try (OutputStream stream = getContext().getContentResolver()
                        .openOutputStream(result.getData().getData(), "w")) {
                    if (stream == null) throw new IllegalStateException();
                    stream.write(bytes);
                }
                JSObject response = new JSObject();
                response.put("saved", true);
                call.resolve(response);
            } catch (Exception error) {
                call.reject("Could not save your card. Please choose a location and try again.");
            }
        });
    }
}