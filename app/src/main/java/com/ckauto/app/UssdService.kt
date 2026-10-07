package com.ckauto.app

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class UssdService : AccessibilityService() {
    private val h = Handler(Looper.getMainLooper())
    private var pending: Runnable? = null
    private var lastText = ""
    private var lastAt = 0L

    override fun onServiceConnected() {
        instance = this
    }

    override fun onUnbind(intent: android.content.Intent?): Boolean {
        instance = null
        return super.onUnbind(intent)
    }

    fun again() {
        lastText = ""
        h.postDelayed({ process() }, 200)
    }

    override fun onInterrupt() {}

    override fun onAccessibilityEvent(e: AccessibilityEvent?) {
        if (e == null || !UssdEngine.active) return
        val pkg = e.packageName?.toString() ?: return
        if (pkg == packageName || pkg.contains("systemui") || pkg.contains("launcher")) return
        pending?.let { h.removeCallbacks(it) }
        val r = Runnable { process() }
        pending = r
        h.postDelayed(r, 600)
    }

    private fun process() {
        val root = rootInActiveWindow ?: return
        var edit: AccessibilityNodeInfo? = null
        val buttons = mutableListOf<AccessibilityNodeInfo>()
        val sb = StringBuilder()
        fun walk(n: AccessibilityNodeInfo?) {
            if (n == null) return
            val cls = n.className?.toString() ?: ""
            when {
                cls.contains("EditText") -> edit = n
                cls.contains("Button") -> buttons.add(n)
                !n.text.isNullOrEmpty() -> sb.append(n.text).append('\n')
            }
            for (i in 0 until n.childCount) walk(n.getChild(i))
        }
        walk(root)
        val text = sb.toString().trim()
        val ed = edit
        if (text.isEmpty() && ed == null) return
        if (ed == null && buttons.isEmpty()) return
        val now = System.currentTimeMillis()
        if (text == lastText && now - lastAt < 6000) return
        lastText = text
        lastAt = now
        when (val a = UssdEngine.next(text, ed != null)) {
            is Action.Reply -> {
                val b = Bundle()
                b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, a.s)
                ed?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, b)
                h.postDelayed({ click(buttons, listOf("send", "ok", "reply", "yes")) }, 350)
            }
            Action.Dismiss -> click(buttons, listOf("ok", "cancel", "dismiss", "close"))
            else -> {}
        }
    }

    private fun click(btns: List<AccessibilityNodeInfo>, names: List<String>) {
        for (n in names) {
            val b = btns.firstOrNull { it.text?.toString()?.trim()?.lowercase() == n }
            if (b != null) {
                b.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                return
            }
        }
    }

    companion object {
        var instance: UssdService? = null
        fun kick() {
            instance?.again()
        }

        fun enabled(c: Context): Boolean {
            val s = Settings.Secure.getString(c.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            return s != null && s.contains(c.packageName)
        }
    }
}
