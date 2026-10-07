package com.ckauto.app

import android.os.Handler
import android.os.Looper
import org.json.JSONArray

data class Step(val t: String, val v: String = "", val p: Int = 0, val n: String = "")

sealed class Action {
    data class Reply(val s: String) : Action()
    object Dismiss : Action()
    object Leave : Action()
    object None : Action()
}

/** Runs one USSD session: the web app sends a list of steps, this answers each screen. */
object UssdEngine {
    private val main = Handler(Looper.getMainLooper())
    var active = false
        private set
    private var id = ""
    private var steps: List<Step> = emptyList()
    private var idx = 0
    private var moreTries = 0
    private val timeout = Runnable { finish(false, "Timed out waiting for the USSD reply") }
    var onDone: ((String, Boolean, String) -> Unit)? = null
    var onAsk: ((String, String) -> Unit)? = null
    private var asking = false
    private var pending: Action? = null
    private var limitMs = 30000L
    private val log = StringBuilder()

    fun debug(): String = log.toString()

    /** The user answered the in-app confirmation (for example the recipient name). */
    fun answer(yes: Boolean) {
        if (!asking) return
        asking = false
        if (yes) {
            val s = steps[idx]
            idx++
            pending = Action.Reply(s.v.ifEmpty { "1" })
            arm()
        } else {
            pending = Action.Dismiss
            finish(false, "Cancelled by you")
        }
        UssdService.kick()
    }

    fun start(sid: String, json: String, limit: Long = 30000L) {
        limitMs = if (limit < 10000L) 30000L else limit
        val a = JSONArray(json)
        steps = (0 until a.length()).map {
            val o = a.getJSONObject(it)
            val key = o.optString("v").ifEmpty { o.optString("k") }
            Step(o.getString("t"), key, o.optInt("p", 0), o.optString("n"))
        }
        log.setLength(0)
        log.append("START ").append(steps.joinToString(" > ") { it.t + ":" + it.v.ifEmpty { it.p.toString() } }).append("\n")
        idx = 0
        moreTries = 0
        asking = false
        pending = null
        id = sid
        active = true
        arm()
    }

    fun fail(sid: String, why: String) {
        onDone?.invoke(sid, false, why)
    }

    private fun arm() {
        main.removeCallbacks(timeout)
        main.postDelayed(timeout, limitMs)
    }

    private fun finish(ok: Boolean, text: String) {
        if (!active) return
        active = false
        log.append("RESULT: ").append(if (ok) "ok" else "failed - " + text.take(100)).append("\n")
        main.removeCallbacks(timeout)
        onDone?.invoke(id, ok, text)
    }

    private val optRe = Regex("^\\s*(\\d+)\\s*[:.)\\-]\\s*(.*)$")
    private val atRe = Regex("at\\s*(\\d+)", RegexOption.IGNORE_CASE)

    private fun norm(s: String) = s.lowercase().replace(Regex("\\s"), "")

    private fun options(text: String): List<Pair<String, String>> =
        text.lines().mapNotNull { l -> optRe.find(l)?.let { it.groupValues[1] to it.groupValues[2] } }

    /** Options 0 and 00 are BACK and HOME, so they are never picked by a search. */
    private fun choices(text: String) = options(text).filter { it.first != "0" && it.first != "00" }

    private fun findOpt(text: String, key: String): String? {
        val keys = key.split("|").map { norm(it) }.filter { it.isNotEmpty() }
        if (keys.isEmpty()) return null
        return choices(text).firstOrNull { o -> val x = norm(o.second); keys.any { x.contains(it) } }?.first
    }

    private fun findPrice(text: String, p: Int): String? =
        if (p <= 0) null else choices(text).firstOrNull { atRe.find(it.second)?.groupValues?.get(1)?.toIntOrNull() == p }?.first

    /** Called by the accessibility service with the current USSD screen. */
    fun next(text: String, hasInput: Boolean): Action {
        val a = decide(text, hasInput)
        if (active || a !is Action.None) {
            val what = when (a) {
                is Action.Reply -> "pressed " + a.s
                Action.Dismiss -> "closed"
                Action.Leave -> "left open"
                else -> "nothing"
            }
            log.append("- ").append(text.take(90).replace("\n", " / ")).append("  =>  ").append(what).append("\n")
        }
        return a
    }

    private fun decide(text: String, hasInput: Boolean): Action {
        pending?.let {
            pending = null
            return it
        }
        if (!active) return Action.None
        if (!asking) arm()
        if (!hasInput) {
            while (idx < steps.size && steps[idx].t == "opt") idx++
            val ok = idx >= steps.size
            finish(ok, if (ok) text else "Ended early: $text")
            return Action.Dismiss
        }
        if (idx >= steps.size) {
            finish(true, text)
            return Action.Leave
        }
        val s = steps[idx]
        return when (s.t) {
            "text" -> {
                if (s.v.isEmpty()) {
                    finish(false, "Nothing to type")
                    Action.Dismiss
                } else {
                    idx++
                    Action.Reply(s.v)
                }
            }
            "opt" -> {
                val n = findOpt(text, s.v)
                idx++
                if (n != null) {
                    Action.Reply(n)
                } else {
                    finish(false, "Unexpected prompt: $text")
                    Action.Dismiss
                }
            }
            "number" -> {
                val o = findOpt(text, "other")
                if (o != null && moreTries < 2) {
                    moreTries++
                    Action.Reply(o)
                } else if (s.v.isEmpty()) {
                    finish(false, "No number to type")
                    Action.Dismiss
                } else {
                    idx++
                    moreTries = 0
                    Action.Reply(s.v)
                }
            }
            "ask" -> {
                if (!asking) {
                    asking = true
                    main.removeCallbacks(timeout)
                    main.postDelayed(timeout, 120000)
                    onAsk?.invoke(id, text)
                }
                Action.Leave
            }
            "stop" -> {
                finish(true, text)
                Action.Leave
            }
            "find", "price" -> {
                val n = (if (s.t == "find") findOpt(text, s.v) else findPrice(text, s.p)) ?: (if (s.n.isEmpty()) null else s.n)
                if (n != null) {
                    idx++
                    moreTries = 0
                    Action.Reply(n)
                } else {
                    finish(false, "Option not found on the menu: " + s.v.ifEmpty { s.p.toString() })
                    Action.Dismiss
                }
            }
            else -> {
                finish(false, "Unknown step")
                Action.Dismiss
            }
        }
    }
}
