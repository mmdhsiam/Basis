-keep class org.basis.foundation.MainActivity { *; }
-keep class org.basis.foundation.MainActivity$AndroidBridge { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*,JavascriptInterface
-keep class org.basis.foundation.R { *; }
-keep class org.basis.foundation.R$* { *; }
-dontwarn android.webkit.**
-dontwarn android.app.**
