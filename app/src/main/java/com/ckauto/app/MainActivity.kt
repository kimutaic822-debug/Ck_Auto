package com.ckauto.app

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentActivity
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    lateinit var web: WebView
    private var fileCb: ValueCallback<Array<Uri>>? = null
    private var photoPicker: ((Uri?) -> Unit)? = null
    private val picker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        fileCb?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        fileCb = null
    }
    private val photoResult = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val uri = r.data?.data
        photoPicker?.invoke(uri)
        photoPicker = null
    }

    companion object {
        var ref: MainActivity? = null
        fun notifyAsk(c: Context, text: String) {
            val nm = c.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(NotificationChannel("ck_ask", "Confirmations", NotificationManager.IMPORTANCE_HIGH))
            }
            val pi = PendingIntent.getActivity(c, 2, Intent(c, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
            val n = NotificationCompat.Builder(c, "ck_ask")
                .setContentTitle("CK Shortcut: confirm")
                .setContentText(text.replace("\n", " "))
                .setSmallIcon(R.drawable.ic_stat_ck)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()
            try { nm.notify(2, n) } catch (e: SecurityException) { }
        }

        fun deliver() {
            val w = ref?.web ?: return
            w.post { w.evaluateJavascript("window.drainSms&&drainSms()", null) }
        }

        fun pickPhoto(cb: (Uri?) -> Unit) {
            val m = ref ?: return
            m.photoPicker = cb
            val i = Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            try { m.photoResult.launch(i) } catch (e: Exception) { cb(null) }
        }

        fun askFingerprint() {
            val m = ref ?: return
            m.showFingerprint()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        ref = this
        web = WebView(this)
        setContentView(web)
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(v: WebView, cb: ValueCallback<Array<Uri>>, p: WebChromeClient.FileChooserParams): Boolean {
                fileCb?.onReceiveValue(null)
                fileCb = cb
                return try { picker.launch(p.createIntent()); true } catch (e: Exception) { fileCb = null; false }
            }
        }
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        val bridge = Bridge(this)
        web.addJavascriptInterface(bridge, "Android")
        UssdEngine.onDone = { id, ok, text ->
            runOnUiThread {
                web.evaluateJavascript("window.onUssdDone(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(text) + ")", null)
            }
        }
        UssdEngine.onAsk = { id, text ->
            runOnUiThread {
                try {
                    startActivity(Intent(this, MainActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP))
                } catch (e: Exception) { }
                notifyAsk(this, text)
                web.evaluateJavascript("window.onUssdAsk(" + JSONObject.quote(id) + "," + JSONObject.quote(text) + ")", null)
            }
        }
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("nativeBack()") { r -> if (r != "true") moveTaskToBack(true) }
            }
        })
    }

    fun showFingerprint() {
        val mgr = BiometricManager.from(this)
        val canBio = mgr.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
        if (canBio != BiometricManager.BIOMETRIC_SUCCESS) {
            runOnUiThread {
                web.evaluateJavascript("window.onFingerprint(false)", null)
            }
            return
        }
        val executor = ContextCompat.getMainExecutor(this)
        val prompt = BiometricPrompt(this as FragmentActivity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    runOnUiThread { web.evaluateJavascript("window.onFingerprint(true)", null) }
                }
                override fun onAuthenticationError(code: Int, msg: CharSequence) {
                    runOnUiThread { web.evaluateJavascript("window.onFingerprint(false)", null) }
                }
                override fun onAuthenticationFailed() { }
            })
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock CK Shortcut")
            .setSubtitle("Use your fingerprint or face")
            .setNegativeButtonText("Use PIN")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
            .build()
        prompt.authenticate(info)
    }

    override fun onResume() {
        super.onResume()
        web.evaluateJavascript("window.drainSms&&drainSms();window.refreshSetup&&refreshSetup()", null)
    }

    override fun onDestroy() {
        if (ref === this) ref = null
        super.onDestroy()
    }
}
