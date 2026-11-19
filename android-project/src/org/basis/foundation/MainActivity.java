package org.basis.foundation;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.graphics.Rect;
import android.util.Base64;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String APP_ASSET_HOST = "appassets.androidplatform.net";
    private static final String CHANNEL_ID = "basis_foundation_alerts";
    private static final String PREFS_NAME = "basis_prefs";
    private static final String PREF_FIRST_OPEN_PROMPTED = "first_open_permissions_prompted";
    private static final String PREF_NOTIF_ALLOWED = "notif_permission_allowed";
    private static final String PREF_STORAGE_ALLOWED = "storage_permission_allowed";

    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int REQ_NOTIFICATION_PERMISSION = 2001;
    private static final int REQ_STORAGE_PERMISSION = 2002;
    private static final int REQ_INSTALL_UNKNOWN_APPS = 2003;
    private static final String APK_PROVIDER_AUTHORITY = "org.basis.foundation.apkprovider";

    private WebView mWebView;
    private View mSplashView;
    private ValueCallback<Uri[]> mFilePathCallback;
    private boolean mDoubleBackToExitPressedOnce = false;
    private boolean mSplashDismissed = false;
    private boolean mPendingFirstOpenStoragePrompt = false;
    private ViewTreeObserver.OnGlobalLayoutListener mKeyboardLayoutListener;
    private boolean mLastKeyboardVisible = false;
    private File mPendingInstallApkFile = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            createNotificationChannel();
            setContentView(R.layout.activity_main);

            mSplashView = findViewById(R.id.splash_view);
            mWebView = findViewById(R.id.webview);

            initWebView(savedInstanceState);

            // Trigger first-open Push Notification & Storage permission popups smoothly
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    promptFirstOpenPermissionsIfNeeded();
                }
            }, 950);
        } catch (Exception e) {
            Toast.makeText(this, "অ্যাপ প্রারম্ভে ত্রুটি: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Basis Foundation Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("রসিদ ডাউনলোড, নোটিশ ও সঞ্চয় আপডেট নোটিফিকেশন");
            channel.enableVibration(true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void notifyWebPermissionsUpdated() {
        if (mWebView == null) return;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    mWebView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('android-permissions-updated'));",
                        null
                    );
                } catch (Exception ignored) {}
            }
        });
    }

    private void promptFirstOpenPermissionsIfNeeded() {
        if (isFinishing()) return;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (prefs.getBoolean(PREF_FIRST_OPEN_PROMPTED, false)) {
            return;
        }
        prefs.edit().putBoolean(PREF_FIRST_OPEN_PROMPTED, true).apply();
        mPendingFirstOpenStoragePrompt = true;
        promptNotificationPermissionFlow();
    }

    private void promptNotificationPermissionFlow() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_NOTIF_ALLOWED, true).apply();
                notifyWebPermissionsUpdated();
                if (mPendingFirstOpenStoragePrompt) {
                    mPendingFirstOpenStoragePrompt = false;
                    promptStoragePermissionFlow();
                }
                return;
            }
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATION_PERMISSION);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            new AlertDialog.Builder(this)
                .setTitle("পুশ নোটিফিকেশন অনুমতি")
                .setMessage("নোটিশ, সঞ্চয় অনুমোদন ও পিডিএফ ডাউনলোডের তাৎক্ষণিক পুশ নোটিফিকেশন পেতে অনুমতি দিন।")
                .setCancelable(false)
                .setPositiveButton("অনুমতি দিন", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_NOTIF_ALLOWED, true).apply();
                        notifyWebPermissionsUpdated();
                        if (mPendingFirstOpenStoragePrompt) {
                            mPendingFirstOpenStoragePrompt = false;
                            promptStoragePermissionFlow();
                        }
                    }
                })
                .setNegativeButton("পরে", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_NOTIF_ALLOWED, false).apply();
                        notifyWebPermissionsUpdated();
                        if (mPendingFirstOpenStoragePrompt) {
                            mPendingFirstOpenStoragePrompt = false;
                            promptStoragePermissionFlow();
                        }
                    }
                })
                .show();
        } else {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_NOTIF_ALLOWED, true).apply();
            if (mPendingFirstOpenStoragePrompt) {
                mPendingFirstOpenStoragePrompt = false;
                promptStoragePermissionFlow();
            }
        }
    }

    private void promptStoragePermissionFlow() {
        if (isFinishing()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Build.VERSION.SDK_INT <= 32) {
            String perm = (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P)
                ? Manifest.permission.WRITE_EXTERNAL_STORAGE
                : Manifest.permission.READ_EXTERNAL_STORAGE;
            if (checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED) {
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, true).apply();
                notifyWebPermissionsUpdated();
                return;
            }
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                requestPermissions(
                    new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE, Manifest.permission.READ_EXTERNAL_STORAGE},
                    REQ_STORAGE_PERMISSION
                );
            } else {
                requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, REQ_STORAGE_PERMISSION);
            }
        } else if (Build.VERSION.SDK_INT >= 33) {
            new AlertDialog.Builder(this)
                .setTitle("ডিভাইস স্টোরেজ ও ফাইল ডাউনলোড অনুমতি")
                .setMessage("অফিসিয়াল ই-রসিদ ও হিসাব স্টেটমেন্ট PDF সরাসরি আপনার ফোনের Downloads/BasisFoundation ফোল্ডারে সংরক্ষণের জন্য স্টোরেজ অ্যাক্সেস অনুমোদন দিন।")
                .setCancelable(false)
                .setPositiveButton("অনুমতি দিন", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, true).apply();
                        notifyWebPermissionsUpdated();
                        Toast.makeText(MainActivity.this, "ফোন স্টোরেজ ডাউনলোড অনুমতি সক্রিয় হয়েছে", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("পরে", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, false).apply();
                        notifyWebPermissionsUpdated();
                    }
                })
                .show();
        } else {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, true).apply();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        boolean granted = grantResults != null && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;

        if (requestCode == REQ_NOTIFICATION_PERMISSION) {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_NOTIF_ALLOWED, granted).apply();
            Toast.makeText(
                this,
                granted ? "পুশ নোটিফিকেশন চালু হয়েছে" : "পুশ নোটিফিকেশন অনুমতি দেওয়া হয়নি",
                Toast.LENGTH_SHORT
            ).show();
            notifyWebPermissionsUpdated();

            if (mPendingFirstOpenStoragePrompt) {
                mPendingFirstOpenStoragePrompt = false;
                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        promptStoragePermissionFlow();
                    }
                }, 250);
            }
        } else if (requestCode == REQ_STORAGE_PERMISSION) {
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, granted).apply();
            Toast.makeText(
                this,
                granted ? "ফোন স্টোরেজ এক্সেস চালু হয়েছে" : "স্টোরেজ অনুমতি দেওয়া হয়নি",
                Toast.LENGTH_SHORT
            ).show();
            notifyWebPermissionsUpdated();
        }
    }

    private void postSystemNotification(String title, String body) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
        }
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int pendingFlags = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT;
            PendingIntent pi = PendingIntent.getActivity(this, 0, openIntent, pendingFlags);

            Notification.Builder builder = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);

            builder.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pi);

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                builder.setPriority(Notification.PRIORITY_HIGH);
            }

            nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
        } catch (Exception ignored) {}
    }

    private void dismissSplash() {
        if (mSplashDismissed) return;
        mSplashDismissed = true;

        if (mSplashView != null && mSplashView.getVisibility() == View.VISIBLE) {
            AlphaAnimation fadeOut = new AlphaAnimation(1.0f, 0.0f);
            fadeOut.setDuration(320);
            fadeOut.setAnimationListener(new Animation.AnimationListener() {
                @Override
                public void onAnimationStart(Animation animation) {}

                @Override
                public void onAnimationEnd(Animation animation) {
                    if (mSplashView != null) {
                        mSplashView.setVisibility(View.GONE);
                    }
                    if (mWebView != null) {
                        mWebView.setVisibility(View.VISIBLE);
                    }
                }

                @Override
                public void onAnimationRepeat(Animation animation) {}
            });
            mSplashView.startAnimation(fadeOut);
        } else if (mWebView != null) {
            mWebView.setVisibility(View.VISIBLE);
        }
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".otf")) return "font/otf";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    private WebResourceResponse interceptLocalAsset(Uri url) {
        if (url == null || !APP_ASSET_HOST.equalsIgnoreCase(url.getHost())) {
            return null;
        }
        String rawPath = url.getPath();
        if (rawPath == null || rawPath.isEmpty() || "/".equals(rawPath)) {
            rawPath = "/index.html";
        }
        while (rawPath.startsWith("/")) {
            rawPath = rawPath.substring(1);
        }
        if (rawPath.contains("..")) {
            return null;
        }
        String assetPath = "www/" + rawPath;
        try {
            InputStream stream = getAssets().open(assetPath);
            String mime = getMimeType(rawPath);
            String encoding = (mime.startsWith("text/") || mime.equals("application/javascript") || mime.equals("application/json") || mime.equals("image/svg+xml"))
                ? "UTF-8"
                : null;
            WebResourceResponse resp = new WebResourceResponse(mime, encoding, stream);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                headers.put("Cache-Control", "no-cache");
                resp.setResponseHeaders(headers);
            }
            return resp;
        } catch (Exception e) {
            return null;
        }
    }

    private void initWebView(Bundle savedInstanceState) {
        if (mWebView == null) return;

        mWebView.setBackgroundColor(0xFF022C22);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Enable cookies & third-party cookies for Firebase & Google Sheets Embed
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                cookieManager.setAcceptThirdPartyCookies(mWebView, true);
            }
        } catch (Exception ignored) {}

        // Register Native Bridge -> window.AndroidBridge in React Web App
        mWebView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request != null) {
                    WebResourceResponse localResp = interceptLocalAsset(request.getUrl());
                    if (localResp != null) {
                        return localResp;
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url != null) {
                    WebResourceResponse localResp = interceptLocalAsset(Uri.parse(url));
                    if (localResp != null) {
                        return localResp;
                    }
                }
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request != null && request.getUrl() != null) {
                    return handleUrlNavigation(request.getUrl());
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                return handleUrlNavigation(Uri.parse(url));
            }

            private boolean handleUrlNavigation(Uri uri) {
                if (uri == null) return false;
                String host = uri.getHost() != null ? uri.getHost() : "";
                if (APP_ASSET_HOST.equalsIgnoreCase(host)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Exception ignored) {
                    return false;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                try {
                    view.evaluateJavascript(
                        "window.print = function() { if (window.AndroidBridge && window.AndroidBridge.printDocument) { window.AndroidBridge.printDocument(document.title || 'BASIS_Receipt'); } };",
                        null
                    );
                } catch (Exception ignored) {}
                dismissSplash();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request != null && request.isForMainFrame()) {
                    dismissSplash();
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                dismissSplash();
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                android.util.Log.d("BASIS_CONSOLE", consoleMessage.message() + " [" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + "]");
                return true;
            }

            // Handle target="_blank" external links safely (e.g., Google Sheets external edit)
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                if (resultMsg == null || !(resultMsg.obj instanceof WebView.WebViewTransport)) {
                    return false;
                }
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                final WebView tempWebView = new WebView(MainActivity.this);
                tempWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && req != null && req.getUrl() != null) {
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, req.getUrl()));
                            } catch (Exception ignored) {}
                        }
                        tempWebView.destroy();
                        return true;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, String url) {
                        if (url != null) {
                            try {
                                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                            } catch (Exception ignored) {}
                        }
                        tempWebView.destroy();
                        return true;
                    }
                });
                transport.setWebView(tempWebView);
                resultMsg.sendToTarget();
                return true;
            }

            // Enhanced File Chooser supporting images, fonts (.ttf, .woff, .woff2), and documents
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);

                String[] acceptTypes = fileChooserParams != null ? fileChooserParams.getAcceptTypes() : null;
                boolean isImageOnly = false;
                if (acceptTypes != null && acceptTypes.length > 0) {
                    for (String type : acceptTypes) {
                        if (type != null && (type.contains("image/") || type.endsWith(".png") || type.endsWith(".jpg"))) {
                            isImageOnly = true;
                        } else if (type != null && (type.contains("font") || type.contains("ttf") || type.contains("woff") || type.contains("*/*"))) {
                            isImageOnly = false;
                            break;
                        }
                    }
                }

                if (isImageOnly) {
                    intent.setType("image/*");
                } else {
                    intent.setType("*/*");
                    String[] extraMimeTypes = new String[]{
                        "font/ttf", "font/otf", "font/woff", "font/woff2",
                        "application/x-font-ttf", "application/font-woff",
                        "image/*", "application/pdf", "*/*"
                    };
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, extraMimeTypes);
                }

                try {
                    startActivityForResult(Intent.createChooser(intent, "ফাইল বা ফন্ট নির্বাচন করুন"), FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    mFilePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        // Serve bundled assets over real HTTPS origin so Firebase Auth, Firestore onSnapshot,
        // localStorage persistence, /logo.svg, and Google Sheets embed work cleanly
        if (savedInstanceState == null) {
            mWebView.loadUrl("https://" + APP_ASSET_HOST + "/index.html");
        } else {
            mWebView.restoreState(savedInstanceState);
        }

        // Track soft keyboard open/close cleanly so chat composer can hide bottom dock when typing
        try {
            final View rootView = getWindow().getDecorView().getRootView();
            if (rootView != null) {
                mKeyboardLayoutListener = new ViewTreeObserver.OnGlobalLayoutListener() {
                    @Override
                    public void onGlobalLayout() {
                        try {
                            Rect r = new Rect();
                            rootView.getWindowVisibleDisplayFrame(r);
                            int screenHeight = rootView.getHeight();
                            if (screenHeight <= 0) return;
                            int keypadHeight = screenHeight - r.bottom;
                            boolean isKeyboardVisible = keypadHeight > screenHeight * 0.15;
                            if (isKeyboardVisible != mLastKeyboardVisible) {
                                mLastKeyboardVisible = isKeyboardVisible;
                                if (mWebView != null) {
                                    final boolean openState = isKeyboardVisible;
                                    mWebView.post(new Runnable() {
                                        @Override
                                        public void run() {
                                            try {
                                                mWebView.evaluateJavascript(
                                                    "window.__androidKeyboardOpen=" + openState +
                                                    ";window.dispatchEvent(new CustomEvent('android-keyboard-change',{detail:{open:" + openState + "}}));",
                                                    null
                                                );
                                            } catch (Exception ignored) {}
                                        }
                                    });
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                };
                rootView.getViewTreeObserver().addOnGlobalLayoutListener(mKeyboardLayoutListener);
            }
        } catch (Exception ignored) {}

        // Failsafe timer: Dismiss splash screen within 1.2s even if onPageFinished is delayed
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                dismissSplash();
            }
        }, 1200);
    }

    @Override
    protected void onPause() {
        super.onPause();
        try {
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {}
    }

    @Override
    protected void onDestroy() {
        try {
            if (mKeyboardLayoutListener != null) {
                View rootView = getWindow().getDecorView().getRootView();
                if (rootView != null && rootView.getViewTreeObserver().isAlive()) {
                    rootView.getViewTreeObserver().removeOnGlobalLayoutListener(mKeyboardLayoutListener);
                }
            }
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (mWebView != null) {
            mWebView.saveState(outState);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (mFilePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                Uri dataUri = data.getData();
                if (dataUri != null) {
                    results = new Uri[]{dataUri};
                } else if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else if (requestCode == REQ_INSTALL_UNKNOWN_APPS) {
            if (mPendingInstallApkFile != null && mPendingInstallApkFile.exists()) {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                    launchApkSystemInstaller(mPendingInstallApkFile);
                } else {
                    dispatchApkDownloadProgress(
                        "PERMISSION_REQUIRED",
                        100,
                        mPendingInstallApkFile.length(),
                        mPendingInstallApkFile.length(),
                        "Install unknown apps permission required"
                    );
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private String escapeJsString(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", " ")
            .replace("\r", " ");
    }

    private void dispatchApkDownloadProgress(final String status, final int progress, final long loaded, final long total, final String errorMsg) {
        if (mWebView == null) return;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    String safeError = escapeJsString(errorMsg);
                    String js = "window.dispatchEvent(new CustomEvent('apk-download-progress',{detail:{"
                        + "status:'" + status + "',"
                        + "progress:" + progress + ","
                        + "loaded:" + loaded + ","
                        + "total:" + total + ","
                        + "error:'" + safeError + "'"
                        + "}}));";
                    mWebView.evaluateJavascript(js, null);
                } catch (Exception ignored) {}
            }
        });
    }

    private void launchApkSystemInstaller(final File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            dispatchApkDownloadProgress("ERROR", 0, 0, 0, "ডাউনলোডকৃত APK ফাইল খুঁজে পাওয়া যায়নি।");
            return;
        }
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                        mPendingInstallApkFile = apkFile;
                        dispatchApkDownloadProgress("PERMISSION_REQUIRED", 100, apkFile.length(), apkFile.length(), null);
                        Toast.makeText(
                            MainActivity.this,
                            "আপডেট ইনস্টল করতে 'Allow from this source' অনুমতি চালু করুন",
                            Toast.LENGTH_LONG
                        ).show();
                        Intent permIntent = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName())
                        );
                        startActivityForResult(permIntent, REQ_INSTALL_UNKNOWN_APPS);
                        return;
                    }

                    Uri apkUri;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        apkUri = Uri.parse("content://" + APK_PROVIDER_AUTHORITY + "/updates/" + apkFile.getName());
                    } else {
                        apkFile.setReadable(true, false);
                        apkUri = Uri.fromFile(apkFile);
                    }

                    Intent installIntent = new Intent(Intent.ACTION_VIEW);
                    installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(installIntent);
                } catch (final Exception e) {
                    dispatchApkDownloadProgress(
                        "ERROR",
                        0,
                        0,
                        0,
                        "প্যাকেজ ইনস্টলার চালু করা যায়নি: " + e.getMessage()
                    );
                }
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null) {
            mWebView.evaluateJavascript(
                "(function(){ return (typeof window.__handleAndroidBack === 'function') ? window.__handleAndroidBack() : false; })();",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String result) {
                        if (!"true".equals(result)) {
                            handleFallbackBackPress();
                        }
                    }
                }
            );
        } else {
            handleFallbackBackPress();
        }
    }

    private void handleFallbackBackPress() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
            return;
        }

        if (mDoubleBackToExitPressedOnce) {
            finishAffinity();
            return;
        }

        this.mDoubleBackToExitPressedOnce = true;
        Toast.makeText(this, "অ্যাপ থেকে বের হতে পুনরায় ব্যাক বাটন চাপুন", Toast.LENGTH_SHORT).show();

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                mDoubleBackToExitPressedOnce = false;
            }
        }, 2000);
    }

    /**
     * JavaScript Bridge for native Android capabilities (window.AndroidBridge).
     */
    public class AndroidBridge {
        private final Context mContext;

        public AndroidBridge(Context context) {
            this.mContext = context;
        }

        @JavascriptInterface
        public boolean saveBase64Pdf(final String base64Data, final String filename, final String mimeType) {
            return saveBase64PdfInternal(base64Data, filename, mimeType);
        }

        @JavascriptInterface
        public boolean saveBase64Pdf(final String base64Data, final String filename) {
            return saveBase64PdfInternal(base64Data, filename, "application/pdf");
        }

        private boolean saveBase64PdfInternal(final String base64Data, final String filename, final String mimeType) {
            try {
                String cleanBase64 = base64Data;
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                }
                byte[] pdfBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                String rawName = (filename != null && !filename.trim().isEmpty()) ? filename.trim() : "BASIS_Document.pdf";
                final String finalName = rawName.toLowerCase().endsWith(".pdf") ? rawName : (rawName + ".pdf");
                final String resolvedMime = (mimeType != null && !mimeType.trim().isEmpty()) ? mimeType : "application/pdf";

                boolean saved = false;

                // Android 10+ (API 29+) MediaStore.Downloads Scoped Storage
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        ContentValues values = new ContentValues();
                        values.put(MediaStore.Downloads.DISPLAY_NAME, finalName);
                        values.put(MediaStore.Downloads.MIME_TYPE, resolvedMime);
                        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/BasisFoundation");
                        values.put(MediaStore.Downloads.IS_PENDING, 1);

                        ContentResolver resolver = mContext.getContentResolver();
                        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                        if (uri != null) {
                            OutputStream os = resolver.openOutputStream(uri);
                            if (os != null) {
                                os.write(pdfBytes);
                                os.flush();
                                os.close();
                                values.clear();
                                values.put(MediaStore.Downloads.IS_PENDING, 0);
                                resolver.update(uri, values, null, null);
                                saved = true;
                            }
                        }
                    } catch (Exception ignored) {
                        saved = false;
                    }
                }

                // Fallback to legacy external storage Downloads
                if (!saved) {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File basisDir = new File(downloadsDir, "BasisFoundation");
                    if (!basisDir.exists()) {
                        basisDir.mkdirs();
                    }
                    File file = new File(basisDir, finalName);
                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(pdfBytes);
                    fos.flush();
                    fos.close();
                    saved = true;
                }

                final boolean ok = saved;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (ok) {
                            Toast.makeText(
                                mContext,
                                "ফোনের Downloads/BasisFoundation ফোল্ডারে সেভ হয়েছে: " + finalName,
                                Toast.LENGTH_LONG
                            ).show();
                            postSystemNotification(
                                "পিডিএফ ডাউনলোড সম্পন্ন",
                                "Downloads/BasisFoundation/" + finalName + " ফোনে সংরক্ষিত হয়েছে।"
                            );
                        }
                    }
                });
                return ok;
            } catch (final Exception e) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(mContext, "পিডিএফ সংরক্ষণে ত্রুটি: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
                return false;
            }
        }

        @JavascriptInterface
        public boolean requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                boolean granted = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                if (!granted) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATION_PERMISSION);
                        }
                    });
                }
                return true;
            }
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_NOTIF_ALLOWED, true).apply();
            return true;
        }

        @JavascriptInterface
        public boolean requestStoragePermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, true).apply();
                return true;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean granted = checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
                if (!granted) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE_PERMISSION);
                        }
                    });
                }
                return true;
            }
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit().putBoolean(PREF_STORAGE_ALLOWED, true).apply();
            return true;
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            return getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getBoolean(PREF_NOTIF_ALLOWED, true);
        }

        @JavascriptInterface
        public boolean hasStoragePermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Build.VERSION.SDK_INT <= 32) {
                String perm = (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P)
                    ? Manifest.permission.WRITE_EXTERNAL_STORAGE
                    : Manifest.permission.READ_EXTERNAL_STORAGE;
                return checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED;
            }
            return getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getBoolean(PREF_STORAGE_ALLOWED, true);
        }

        @JavascriptInterface
        public void showNotification(final String title, final String body) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    postSystemNotification(title, body);
                }
            });
        }

        @JavascriptInterface
        public void printDocument(final String docTitle) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (printManager != null && mWebView != null) {
                            String jobName = (docTitle != null && !docTitle.isEmpty()) ? docTitle : "বেসিস ফাউন্ডেশন রসিদ";
                            PrintDocumentAdapter printAdapter;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                printAdapter = mWebView.createPrintDocumentAdapter(jobName);
                            } else {
                                printAdapter = mWebView.createPrintDocumentAdapter();
                            }
                            printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                        }
                    } catch (Exception e) {
                        Toast.makeText(mContext, "প্রিন্ট সেবা চালু করা যায়নি: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        CookieManager.getInstance().flush();
                    } catch (Exception ignored) {}
                    finishAffinity();
                }
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            return "1.2.0";
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            return 120;
        }

        @JavascriptInterface
        public boolean triggerPendingApkInstall() {
            if (mPendingInstallApkFile != null && mPendingInstallApkFile.exists()) {
                launchApkSystemInstaller(mPendingInstallApkFile);
                return true;
            }
            return false;
        }

        @JavascriptInterface
        public boolean downloadAndInstallApk(final String urlStr, final String versionName) {
            if (urlStr == null || (!urlStr.startsWith("http://") && !urlStr.startsWith("https://"))) {
                dispatchApkDownloadProgress("ERROR", 0, 0, 0, "সঠিক APK ডাউনলোড লিংক প্রদান করা হয়নি।");
                return false;
            }

            dispatchApkDownloadProgress("STARTED", 0, 0, 0, null);

            new Thread(new Runnable() {
                @Override
                public void run() {
                    HttpURLConnection conn = null;
                    InputStream input = null;
                    FileOutputStream output = null;
                    try {
                        String currentUrl = urlStr.trim();
                        int redirects = 0;
                        while (redirects < 7) {
                            URL url = new URL(currentUrl);
                            conn = (HttpURLConnection) url.openConnection();
                            conn.setInstanceFollowRedirects(false);
                            conn.setConnectTimeout(20000);
                            conn.setReadTimeout(30000);
                            conn.setRequestProperty("User-Agent", "BasisFoundationAndroidUpdater/1.0");
                            conn.connect();

                            int code = conn.getResponseCode();
                            if (code == HttpURLConnection.HTTP_MOVED_TEMP
                                || code == HttpURLConnection.HTTP_MOVED_PERM
                                || code == HttpURLConnection.HTTP_SEE_OTHER
                                || code == 307
                                || code == 308) {
                                String location = conn.getHeaderField("Location");
                                conn.disconnect();
                                if (location == null || location.isEmpty()) {
                                    throw new Exception("Redirect without Location header");
                                }
                                URL nextUrl = new URL(url, location);
                                currentUrl = nextUrl.toString();
                                redirects++;
                                continue;
                            }
                            break;
                        }

                        if (conn == null) {
                            throw new Exception("Connection failed");
                        }
                        int statusCode = conn.getResponseCode();
                        if (statusCode < 200 || statusCode >= 300) {
                            throw new Exception("সার্ভার ত্রুটি (HTTP " + statusCode + ")");
                        }

                        long totalBytes = conn.getContentLength();
                        File updatesDir = new File(getCacheDir(), "updates");
                        if (!updatesDir.exists()) {
                            updatesDir.mkdirs();
                        } else {
                            File[] oldFiles = updatesDir.listFiles();
                            if (oldFiles != null) {
                                for (File f : oldFiles) {
                                    if (f.isFile()) {
                                        f.delete();
                                    }
                                }
                            }
                        }

                        String safeVersion = (versionName != null ? versionName : "update")
                            .replaceAll("[^a-zA-Z0-9._-]", "");
                        if (safeVersion.isEmpty()) safeVersion = "update";
                        File outFile = new File(updatesDir, "BasisFoundation-" + safeVersion + ".apk");

                        input = conn.getInputStream();
                        output = new FileOutputStream(outFile);
                        byte[] buffer = new byte[16384];
                        int bytesRead;
                        long downloaded = 0;
                        int lastPct = -1;
                        long lastDispatchTime = 0;

                        while ((bytesRead = input.read(buffer)) != -1) {
                            output.write(buffer, 0, bytesRead);
                            downloaded += bytesRead;

                            int pct;
                            if (totalBytes > 0) {
                                pct = (int) Math.min(99L, (downloaded * 100L) / totalBytes);
                            } else {
                                pct = (int) Math.min(95L, Math.max(5L, (downloaded / (1024L * 300L)) * 5L));
                            }

                            long now = System.currentTimeMillis();
                            if (pct != lastPct || (now - lastDispatchTime) >= 120L) {
                                lastPct = pct;
                                lastDispatchTime = now;
                                dispatchApkDownloadProgress("DOWNLOADING", pct, downloaded, totalBytes, null);
                            }
                        }

                        output.flush();
                        output.close();
                        output = null;
                        input.close();
                        input = null;
                        conn.disconnect();
                        conn = null;

                        mPendingInstallApkFile = outFile;
                        dispatchApkDownloadProgress("COMPLETED", 100, downloaded, downloaded, null);
                        launchApkSystemInstaller(outFile);
                    } catch (Exception e) {
                        dispatchApkDownloadProgress(
                            "ERROR",
                            0,
                            0,
                            0,
                            "ডাউনলোড ব্যর্থ হয়েছে: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")
                        );
                    } finally {
                        try { if (output != null) output.close(); } catch (Exception ignored) {}
                        try { if (input != null) input.close(); } catch (Exception ignored) {}
                        try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
                    }
                }
            }).start();

            return true;
        }
    }
}
