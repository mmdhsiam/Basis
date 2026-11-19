import React, { useState } from 'react';
import {
  Smartphone,
  FileCode,
  CheckCircle2,
  Copy,
  Terminal,
  ShieldCheck,
  Layers,
  Check,
} from 'lucide-react';
import { StaggerList, StaggerItem, SpringIcon } from '../common/MotionPrimitives';

export const NativeAndroidSpecView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2200);
  };

  const mainActivityKotlinSnippet = `// app/src/main/java/org/basis/foundation/MainActivity.kt
package org.basis.foundation

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.provider.MediaStore
import android.util.Base64
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val CHANNEL_ID = "basis_foundation_alerts"

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val msg = if (granted) "পুশ নোটিফিকেশন চালু হয়েছে" else "পুশ নোটিফিকেশন অনুমতি দেওয়া হয়নি"
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    private val storagePermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val msg = if (granted) "ফোন স্টোরেজ এক্সেস চালু হয়েছে" else "স্টোরেজ অনুমতি দেওয়া হয়নি"
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannel()

        webView = WebView(this)
        setContentView(webView)

        // Serve bundled Vite dist/ assets over real HTTPS origin so Firebase Auth,
        // Firestore, localStorage persistence, /logo.svg, and Google Sheets iframe work 100% error-free
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true       // Persists Settings, Theme, Haptics, Sound & Seen Badges
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            loadsImagesAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            mediaPlaybackRequiresUserGesture = false
        }

        // Enable cookies & third-party cookies for Firebase & Google Sheets Embed
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // Register Native Bridge -> window.AndroidBridge in React Web App
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                val host = request.url.host ?: ""

                // Keep internal app assets inside WebView
                if (host == "appassets.androidplatform.net") {
                    return false
                }

                // Dialer, Email, WhatsApp, or External Browser / Google Sheets App
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (_: Exception) {
                    false
                }
            }
        }

        // Handle target="_blank" external links safely (e.g., Google Sheets external edit)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                val tempWebView = WebView(this@MainActivity)
                tempWebView.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        v: WebView?,
                        req: WebResourceRequest?
                    ): Boolean {
                        req?.url?.let { uri ->
                            try {
                                startActivity(Intent(Intent.ACTION_VIEW, uri))
                            } catch (_: Exception) {}
                        }
                        tempWebView.destroy()
                        return true
                    }
                }
                transport.webView = tempWebView
                resultMsg.sendToTarget()
                return true
            }
        }

        // Hardware Back Button & Gesture Navigation:
        // 1) Closes open modals/drawers -> 2) Non-home tab returns to Home -> 3) Home shows Exit Dialog
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "(function(){ return (typeof window.__handleAndroidBack === 'function') ? window.__handleAndroidBack() : false; })();"
                ) { result ->
                    if (result != "true") {
                        if (webView.canGoBack()) {
                            webView.goBack()
                        } else {
                            finishAffinity()
                        }
                    }
                }
            }
        })

        if (savedInstanceState == null) {
            webView.loadUrl("https://appassets.androidplatform.net/index.html")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Basis Foundation Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "রসিদ ডাউনলোড, নোটিশ ও সঞ্চয় আপডেট নোটিফিকেশন"
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun postSystemNotification(title: String, body: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        nm.notify((System.currentTimeMillis() % 100000).toInt(), notification)
    }

    inner class AndroidBridge {

        // Saves Receipt & Statement PDFs directly to Phone Storage (Downloads/BasisFoundation)
        @JavascriptInterface
        fun saveBase64Pdf(base64Data: String, fileName: String, mimeType: String): Boolean {
            return try {
                val cleanBase64 = base64Data.substringAfter("base64,", base64Data)
                val pdfBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                val safeName = if (fileName.endsWith(".pdf", true)) fileName else "$fileName.pdf"

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                        put(MediaStore.Downloads.MIME_TYPE, mimeType.ifBlank { "application/pdf" })
                        put(
                            MediaStore.Downloads.RELATIVE_PATH,
                            Environment.DIRECTORY_DOWNLOADS + "/BasisFoundation"
                        )
                        put(MediaStore.Downloads.IS_PENDING, 1)
                    }
                    val resolver = contentResolver
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                        ?: return false
                    resolver.openOutputStream(uri)?.use { out ->
                        out.write(pdfBytes)
                        out.flush()
                    }
                    values.clear()
                    values.put(MediaStore.Downloads.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                } else {
                    val dir = File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                        "BasisFoundation"
                    )
                    if (!dir.exists()) dir.mkdirs()
                    val file = File(dir, safeName)
                    FileOutputStream(file).use { out ->
                        out.write(pdfBytes)
                        out.flush()
                    }
                }

                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "ফোনের Downloads/BasisFoundation ফোল্ডারে সেভ হয়েছে: $safeName",
                        Toast.LENGTH_LONG
                    ).show()
                    postSystemNotification(
                        "পিডিএফ ডাউনলোড সম্পন্ন",
                        "Downloads/BasisFoundation/$safeName ফোনে সংরক্ষিত হয়েছে।"
                    )
                }
                true
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }

        @JavascriptInterface
        fun requestNotificationPermission(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    runOnUiThread {
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
                true
            } else {
                true
            }
        }

        @JavascriptInterface
        fun requestStoragePermission(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Scoped MediaStore.Downloads works automatically on Android 10+
                true
            } else {
                val granted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    runOnUiThread {
                        storagePermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    }
                }
                true
            }
        }

        @JavascriptInterface
        fun showNotification(title: String, body: String) {
            runOnUiThread {
                postSystemNotification(title, body)
            }
        }

        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                CookieManager.getInstance().flush()
                finishAffinity()
            }
        }
    }
}`;

  const manifestXmlSnippet = `<!-- app/src/main/AndroidManifest.xml -->
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- ইন্টারনেট, পুশ নোটিফিকেশন, হ্যাপটিক ভাইব্রেশন ও স্টোরেজ ডাউনলোড পারমিশন -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission
        android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="28" />
    <uses-permission
        android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Basis Foundation"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="false"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`;

  const gradleSnippet = `// app/build.gradle.kts (:app module)
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "org.basis.foundation"
    compileSdk = 35

    defaultConfig {
        applicationId = "org.basis.foundation"
        minSdk = 24
        targetSdk = 35
        versionCode = 112
        versionName = "1.1.2"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.11.0")
}`;

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <SpringIcon>
            <Smartphone className="w-6 h-6 text-emerald-400" />
          </SpringIcon>
          <div>
            <h2 className="text-xl font-bold text-ink">
              Android Studio নেটিভ APK বিল্ড কোড ও পূর্ণাঙ্গ সেটআপ গাইড
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              প্যাকেজ: <code className="text-emerald-400 font-mono">org.basis.foundation</code> • হার্ডওয়্যার ব্যাক বাটন, পিডিএফ স্টোরেজ ডাউনলোড, পুশ নোটিফিকেশন ও লগইন সাপোর্ট সহ।
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>ওয়েব অ্যাপ ও Android APK শতভাগ একরকম রাখার গ্যারান্টিযুক্ত আর্কিটেকচার:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 leading-relaxed">
            <li>
              <strong>WebViewAssetLoader (HTTPS Origin):</strong> লোকাল <code className="text-emerald-300">file://</code> এর বদলে <code className="text-emerald-300">https://appassets.androidplatform.net</code> ডোমেইনে অ্যাপ রান হয়—ফলে Firebase লগইন, Firestore সিংক, লোগো/ছবি এবং Google Sheets ভিউ কোনো ইরর ছাড়াই ওয়েবের মতো কাজ করে।
            </li>
            <li>
              <strong>হার্ডওয়্যার ব্যাক বাটন (`window.__handleAndroidBack`):</strong> মোডাল বা ড্রয়ার খোলা থাকলে আগে বন্ধ করবে, অন্য ট্যাবে থাকলে হোম ট্যাবে ফেরাবে এবং হোম ট্যাবে থাকলে প্রস্থান নিশ্চিতকরণ পপআপ দেখিয়ে <code className="text-emerald-300">AndroidBridge.exitApp()</code> কল করবে।
            </li>
            <li>
              <strong>সরাসরি ফোন স্টোরেজে রসিদ ও স্টেটমেন্ট সেভ:</strong> <code className="text-emerald-300">AndroidBridge.saveBase64Pdf()</code> এর মাধ্যমে পিডিএফ সরাসরি ফোনের <code className="text-emerald-300">Downloads/BasisFoundation</code> ফোল্ডারে ডাউনলোড হবে এবং নোটিফিকেশন দেখাবে।
            </li>
            <li>
              <strong>সেটিংস ও ব্যাজ স্থায়ী সংরক্ষণ:</strong> <code className="text-emerald-300">domStorageEnabled = true</code> ও <code className="text-emerald-300">CookieManager.flush()</code> থাকায় থিম, সাউন্ড, হ্যাপটিক ও সিন করা নোটিশ/চ্যাট ব্যাজ অ্যাপ বন্ধ করলেও কখনো রিসেট হবে না।
            </li>
          </ul>
        </div>
      </div>

      {/* Step-by-Step Build Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-ink">
            Android Studio-তে ইরর-মুক্ত APK বিল্ড করার ৪টি ধাপ
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-emerald-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[11px]">১</span>
              <span>ওয়েব সোর্স কোড প্রোডাকশন বিল্ড তৈরি করুন</span>
            </h4>
            <p className="text-slate-400 leading-relaxed pl-7">
              প্রজেক্ট ফোল্ডারে টার্মিনাল ওপেন করে নিচের কমান্ড দিন। এতে <code className="text-emerald-400">dist</code> ফোল্ডারে অপ্টিমাইজড ফাইল তৈরি হবে:
            </p>
            <div className="bg-slate-900 p-2 rounded-lg font-mono text-emerald-300 ml-7 text-[11px]">
              npm install && npm run build
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-blue-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[11px]">২</span>
              <span>Android Studio প্রজেক্ট ও assets ফোল্ডার প্রস্তুত করুন</span>
            </h4>
            <p className="text-slate-400 leading-relaxed pl-7">
              Android Studio-তে <strong>Empty Views Activity</strong> প্রজেক্ট খুলে Package Name দিন <code className="text-blue-300">org.basis.foundation</code>। এরপর <code className="text-emerald-400">app/src/main/assets</code> ফোল্ডার তৈরি করে তার ভেতরে <code className="text-emerald-400">dist/</code> ফোল্ডারের সব ফাইল (<code className="text-slate-300">index.html, logo.svg, assets/*</code>) কপি করে পেস্ট করুন।
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-amber-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-[11px]">৩</span>
              <span>নিচের ৩টি ফাইল কপি করে Android Studio-তে বসিয়ে দিন</span>
            </h4>
            <p className="text-slate-400 leading-relaxed pl-7">
              নিচের কোড বক্স থেকে যথাক্রমে <code className="text-amber-300">app/build.gradle.kts</code>, <code className="text-amber-300">AndroidManifest.xml</code> এবং <code className="text-amber-300">MainActivity.kt</code> কপি করে রিপ্লেস করুন এবং <strong>Sync Now</strong> চাপুন।
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-purple-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-[11px]">৪</span>
              <span>APK ফাইল জেনারেট করুন</span>
            </h4>
            <p className="text-slate-400 leading-relaxed pl-7">
              Android Studio মেনু থেকে <strong className="text-ink">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> ক্লিক করলেই সম্পূর্ণ ইরর-মুক্ত APK তৈরি হয়ে যাবে।
            </p>
          </div>
        </div>
      </div>

      {/* Code Snippets */}
      <StaggerList className="space-y-4">
        {/* 1. MainActivity.kt */}
        <StaggerItem hoverLift>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-2">
              <FileCode className="w-4 h-4 shrink-0" />
              <span>১. MainActivity.kt (Back Button + PDF Download + Permissions + CookieManager)</span>
            </span>
            <button
              onClick={() => copyToClipboard(mainActivityKotlinSnippet, 1)}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5 font-bold shrink-0 cursor-pointer"
            >
              <SpringIcon activeKey={copiedIndex === 1}>
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </SpringIcon>
              <span>{copiedIndex === 1 ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
            {mainActivityKotlinSnippet}
          </pre>
        </div>
        </StaggerItem>

        {/* 2. AndroidManifest.xml */}
        <StaggerItem hoverLift>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>২. AndroidManifest.xml (Storage, Push Notification & Orientation Config)</span>
            </span>
            <button
              onClick={() => copyToClipboard(manifestXmlSnippet, 2)}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 font-bold shrink-0 cursor-pointer"
            >
              <SpringIcon activeKey={copiedIndex === 2}>
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </SpringIcon>
              <span>{copiedIndex === 2 ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {manifestXmlSnippet}
          </pre>
        </div>
        </StaggerItem>

        {/* 3. build.gradle.kts */}
        <StaggerItem hoverLift>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-teal-400 flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0" />
              <span>৩. app/build.gradle.kts (AndroidX WebKit AssetLoader & Dependencies)</span>
            </span>
            <button
              onClick={() => copyToClipboard(gradleSnippet, 3)}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 font-bold shrink-0 cursor-pointer"
            >
              <SpringIcon activeKey={copiedIndex === 3}>
                {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </SpringIcon>
              <span>{copiedIndex === 3 ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {gradleSnippet}
          </pre>
        </div>
        </StaggerItem>
      </StaggerList>
    </div>
  );
};
