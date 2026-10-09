package com.ckauto.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        if (i.action == Intent.ACTION_BOOT_COMPLETED) {
            val prefs = c.getSharedPreferences("ck", Context.MODE_PRIVATE)
            val automationOn = prefs.getBoolean("automation_on", true)
            if (automationOn) {
                try {
                    ContextCompat.startForegroundService(c, Intent(c, KeepAliveService::class.java))
                } catch (e: Exception) { }
            }
        }
    }
}
