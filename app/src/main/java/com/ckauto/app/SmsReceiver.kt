package com.ckauto.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SubscriptionManager
import org.json.JSONArray
import org.json.JSONObject

object Store {
    @Synchronized
    fun push(c: Context, from: String, body: String, slot: Int) {
        val p = c.getSharedPreferences("ck", Context.MODE_PRIVATE)
        val a = JSONArray(p.getString("sms", "[]"))
        a.put(JSONObject().put("f", from).put("b", body).put("s", slot))
        p.edit().putString("sms", a.toString()).apply()
    }

    @Synchronized
    fun take(c: Context): String {
        val p = c.getSharedPreferences("ck", Context.MODE_PRIVATE)
        val s = p.getString("sms", "[]") ?: "[]"
        p.edit().putString("sms", "[]").apply()
        return s
    }
}

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        if (i.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(i) ?: return
        if (msgs.isEmpty()) return
        val body = msgs.joinToString("") { it.messageBody ?: "" }
        val from = msgs[0].originatingAddress ?: ""
        var slot = 0
        try {
            val sub = i.getIntExtra("subscription", -1)
            if (sub >= 0) {
                val info = c.getSystemService(SubscriptionManager::class.java).getActiveSubscriptionInfo(sub)
                if (info != null) slot = info.simSlotIndex + 1
            }
        } catch (e: Exception) {
        }
        Store.push(c, from, body, slot)
        MainActivity.deliver()
    }
}
