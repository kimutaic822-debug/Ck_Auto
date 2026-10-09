package com.ckshortcut.app

import android.Manifest
import android.content.ContentProviderOperation
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.PowerManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.ContactsContract
import android.provider.Settings
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Base64
import android.webkit.JavascriptInterface
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.InputStream

class Bridge(private val a: MainActivity) {

    private fun has(p: String) = ContextCompat.checkSelfPermission(a, p) == PackageManager.PERMISSION_GRANTED

    @JavascriptInterface
    fun ussd(id: String, code: String, steps: String, sim: Int, timeout: Int) {
        a.runOnUiThread {
            if (!UssdService.enabled(a)) {
                UssdEngine.fail(id, "Turn on the CK Shortcut USSD service in Accessibility settings")
                return@runOnUiThread
            }
            if (!has(Manifest.permission.CALL_PHONE)) {
                UssdEngine.fail(id, "Phone permission is missing")
                return@runOnUiThread
            }
            try {
                UssdEngine.start(id, steps, timeout * 1000L)
                val i = Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(code)))
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                simHandle(sim)?.let { i.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, it) }
                a.startActivity(i)
            } catch (e: Exception) {
                UssdEngine.fail(id, "Could not dial: " + e.message)
            }
        }
    }

    private fun simHandle(sim: Int): PhoneAccountHandle? = try {
        if (sim in 1..2 && has(Manifest.permission.READ_PHONE_STATE)) {
            val l = a.getSystemService(TelecomManager::class.java).callCapablePhoneAccounts
            if (sim <= l.size) l[sim - 1] else null
        } else null
    } catch (e: Exception) { null }

    private fun subId(sim: Int): Int? = try {
        if (sim in 1..2 && has(Manifest.permission.READ_PHONE_STATE)) {
            a.getSystemService(SubscriptionManager::class.java)
                .getActiveSubscriptionInfoForSimSlotIndex(sim - 1)?.subscriptionId
        } else null
    } catch (e: Exception) { null }

    @Suppress("DEPRECATION")
    @JavascriptInterface
    fun sendSms(to: String, text: String, sim: Int): Boolean = try {
        val id = subId(sim)
        val sm = if (id != null) SmsManager.getSmsManagerForSubscriptionId(id) else SmsManager.getDefault()
        sm.sendMultipartTextMessage(to, null, sm.divideMessage(text), null, null)
        true
    } catch (e: Exception) { false }

    @JavascriptInterface
    fun ussdAnswer(yes: Boolean) { a.runOnUiThread { UssdEngine.answer(yes) } }

    @JavascriptInterface
    fun startRecord(code: String, sim: Int) {
        UssdService.recording = true
    }

    @JavascriptInterface
    fun stopRecord() {
        UssdService.recording = false
    }

    @JavascriptInterface
    fun saveContact(name: String, number: String): Boolean = try {
        if (!has(Manifest.permission.WRITE_CONTACTS)) false
        else {
            var exists = false
            if (has(Manifest.permission.READ_CONTACTS)) {
                val u = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
                a.contentResolver.query(u, arrayOf(ContactsContract.PhoneLookup._ID), null, null, null)?.use {
                    exists = it.count > 0
                }
            }
            if (!exists) {
                val ops = ArrayList<ContentProviderOperation>()
                ops.add(ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null).build())
                ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name).build())
                ops.add(ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, number)
                    .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE).build())
                a.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
            }
            true
        }
    } catch (e: Exception) { false }

    @JavascriptInterface
    fun dial(number: String) {
        a.runOnUiThread { a.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + number))) }
    }

    @JavascriptInterface
    fun smsTo(number: String) {
        a.runOnUiThread { a.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + number))) }
    }

    private fun photoPerm() =
        if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE

    @JavascriptInterface
    fun hasPhotos(): Boolean = has(photoPerm())

    @JavascriptInterface
    fun askPhotos() {
        a.runOnUiThread { ActivityCompat.requestPermissions(a, arrayOf(photoPerm()), 2) }
    }

    // Called by MainActivity after the picker returns a photo
    fun deliverPhoto(uri: Uri?) {
        if (uri == null) return
        try {
            val stream: InputStream? = a.contentResolver.openInputStream(uri)
            val bmp = BitmapFactory.decodeStream(stream)
            stream?.close()
            if (bmp == null) return
            val max = 512
            val ratio = minOf(max.toFloat() / bmp.width, max.toFloat() / bmp.height, 1f)
            val out = Bitmap.createScaledBitmap(bmp, (bmp.width * ratio).toInt(), (bmp.height * ratio).toInt(), true)
            val bos = java.io.ByteArrayOutputStream()
            out.compress(Bitmap.CompressFormat.JPEG, 80, bos)
            val b64 = "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
            val w = MainActivity.ref?.web
            w?.post { w.evaluateJavascript("window.onPhotoPicked(" + JSONObject.quote(b64) + ")", null) }
        } catch (e: Exception) { }
    }

    @JavascriptInterface
    fun askBattery() {
        a.runOnUiThread {
            try {
                a.startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + a.packageName)))
            } catch (e: Exception) {
                a.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        }
    }

    @JavascriptInterface
    fun ussdQuick(id: String, code: String, sim: Int) {
        a.runOnUiThread {
            if (Build.VERSION.SDK_INT < 26 || !has(Manifest.permission.CALL_PHONE) || UssdEngine.active) {
                UssdEngine.fail(id, "Quick USSD not available")
                return@runOnUiThread
            }
            try {
                var tm = a.getSystemService(TelephonyManager::class.java)
                val sid = subId(sim)
                if (sid != null) tm = tm.createForSubscriptionId(sid)
                tm.sendUssdRequest(code, object : TelephonyManager.UssdResponseCallback() {
                    override fun onReceiveUssdResponse(t: TelephonyManager, r: String, resp: CharSequence) {
                        UssdEngine.onDone?.invoke(id, true, resp.toString())
                    }
                    override fun onReceiveUssdResponseFailed(t: TelephonyManager, r: String, c: Int) {
                        UssdEngine.onDone?.invoke(id, false, "USSD failed ($c)")
                    }
                }, Handler(Looper.getMainLooper()))
            } catch (e: Exception) {
                UssdEngine.fail(id, "USSD error: " + e.message)
            }
        }
    }

    @JavascriptInterface
    fun email(to: String, subject: String, body: String) {
        a.runOnUiThread {
            try {
                val i = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:"))
                i.putExtra(Intent.EXTRA_EMAIL, arrayOf(to))
                i.putExtra(Intent.EXTRA_SUBJECT, subject)
                i.putExtra(Intent.EXTRA_TEXT, body)
                a.startActivity(i)
            } catch (e: Exception) { }
        }
    }

    @JavascriptInterface
    fun debugLog(): String = UssdEngine.debug()

    @JavascriptInterface
    fun takeSms(): String = Store.take(a)

    @JavascriptInterface
    fun status(): String {
        val o = JSONObject()
        o.put("acc", UssdService.enabled(a))
        o.put("call", has(Manifest.permission.CALL_PHONE))
        o.put("sms", has(Manifest.permission.SEND_SMS) && has(Manifest.permission.RECEIVE_SMS))
        o.put("phone", has(Manifest.permission.READ_PHONE_STATE))
        o.put("contacts", has(Manifest.permission.WRITE_CONTACTS))
        o.put("battery", a.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(a.packageName))
        return o.toString()
    }

    @JavascriptInterface
    fun askPermissions() {
        a.runOnUiThread {
            val p = mutableListOf(
                Manifest.permission.CALL_PHONE,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.SEND_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.WRITE_CONTACTS
            )
            if (Build.VERSION.SDK_INT >= 33) p.add(Manifest.permission.POST_NOTIFICATIONS)
            ActivityCompat.requestPermissions(a, p.toTypedArray(), 1)
        }
    }

    @JavascriptInterface
    fun openAccessibility() {
        a.runOnUiThread { a.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
    }

    @JavascriptInterface
    fun keepAlive(on: Boolean) {
        a.runOnUiThread {
            val i = Intent(a, KeepAliveService::class.java)
            try {
                if (on) ContextCompat.startForegroundService(a, i) else a.stopService(i)
                a.getSharedPreferences("ck", android.content.Context.MODE_PRIVATE)
                    .edit().putBoolean("automation_on", on).apply()
            } catch (e: Exception) { }
        }
    }

    @JavascriptInterface
    fun vibrate(ms: Int) {
        try {
            val v = a.getSystemService(Vibrator::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                v.vibrate(VibrationEffect.createOneShot(ms.toLong(), VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(ms.toLong())
            }
        } catch (e: Exception) { }
    }
}
