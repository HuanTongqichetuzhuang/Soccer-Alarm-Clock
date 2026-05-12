# SoccerAlarmPro ProGuard Rules

# Keep WebView JS interface methods
-keepclassmembers class com.socceralarm.pro.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep data classes used in JSON
-keep class com.socceralarm.pro.** { *; }

# Keep Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# General Android
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit