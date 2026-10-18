package com.socceralarm.pro

import android.content.Context

/**
 * 隐私政策同意状态管理。
 *
 * 国内应用商店合规要求：首次启动必须展示隐私政策，用户明确点击"同意"之后，
 * 才能初始化 WebView、申请权限、发起网络请求。
 */
object PrivacyConsent {

    private const val PREFS_NAME = "privacy_consent"
    private const val KEY_AGREED = "agreed"
    private const val KEY_VERSION = "policy_version"

    /** 隐私政策版本号：政策内容有实质变更时递增，用户需重新同意 */
    private const val CURRENT_POLICY_VERSION = 1

    /** 隐私政策在线地址（官网，已 ICP 备案） */
    const val PRIVACY_URL = "https://xn--5eyx16c61esnb.top/privacy"

    fun hasAgreed(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_AGREED, false) &&
                prefs.getInt(KEY_VERSION, 0) >= CURRENT_POLICY_VERSION
    }

    fun setAgreed(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_AGREED, true)
            .putInt(KEY_VERSION, CURRENT_POLICY_VERSION)
            .apply()
    }
}
