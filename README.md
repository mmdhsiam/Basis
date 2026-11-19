# BASIS FOUNDATION — Digital Cooperative Savings Management System
**বেসিস ফাউন্ডেশন — ডিজিটাল সমবায় সঞ্চয় ও ব্যবস্থাপনা প্ল্যাটফর্ম**

> **Created & Developed by Mahmudul Siam**  
> Developer Profile: [https://github.com/mahmudul-siam](https://github.com/mahmudul-siam)

---

## ১. ভূমিকা ও পরিবেশ প্রতিবেদন (Environment Transparency Report)
অনুচ্ছেদ ৩৫ এর সুস্পষ্ট নির্দেশনানুসারে পরিবেশ যাচাই:
- **বর্তমান ডেভেলপমেন্ট এনভায়রনমেন্ট:** Node.js v22 / TypeScript / Vite / React SPA running on Linux container.
- **বাস্তবায়ন কৌশল:** 
  1. চলমান **Production-Grade Android Material 3 PWA অ্যাপ** (responsive, offline-ready, back button handler, dynamic role switching, dark/light theme, Bengali typography).
  2. **নেটিভ অ্যান্ড্রয়েড আর্কিটেকচার ও এপিকে বিল্ড ব্লুপ্রিন্ট** (`NativeAndroidSpecView.tsx` এবং এই ডকুমেন্টে অন্তর্ভুক্ত) যা দিয়ে Android Studio ও Gradle ব্যবহার করে সরাসরি রিলিজ APK কম্পাইল করা যাবে।

---

## ২. ফিচার বাস্তবায়ন শ্রেণীকরণ (Feature Classification Matrix)

| ফিচার | শ্রেণী | বিস্তারিত বিবরণ |
|---|---|---|
| **সদস্য তালিকা ও প্রোফাইল** | **Fully Implemented** | সদস্য অনুসন্ধান, আইডি ফিল্টার, সর্বোচ্চ সঞ্চয় বা সর্বশেষ জমা অনুসারে সর্টিং, সেফ ডায়ালার ইনটেন্ট (`tel:`)। |
| **২/৩ সিলিং বহু-মডারেটর অনুমোদন** | **Fully Implemented** | `CEILING(eligible * 2 / 3)` গাণিতিক মডেল, দ্বৈত ভোট প্রতিরোধ, পেন্ডিং ও অ্যাপ্রুভড বিচ্ছিন্নকরণ। |
| **ডিজিটাল রসিদ জেনারেটর** | **Fully Implemented** | ট্রানজেকশন আইডি, ইউনিক রসিদ নম্বর, ভেরিফিকেশন হ্যাশ ও পিডিএফ ডাউনলোড। |
| **অফিসিয়াল ব্যাংক-স্টাইল স্টেটমেন্ট** | **Fully Implemented** | `BF_<MEMBER_ID>_<PERIOD>_Statement.pdf` ফরমেটে পেজ নম্বর, ওয়াটারমার্ক ও সামারি সহ পিডিএফ ডাউনলোড। |
| **হিসাব বিশ্লেষণ (Financial Analytics)** | **Fully Implemented** | মাসিক বার চার্ট, প্রবৃদ্ধি হার (+/-%), পেমেন্ট মাধ্যম বিভাজন ও ডিউ ডেট রিপোর্ট। |
| **অ্যান্ড্রয়েড ব্যাক এক্সিট ডায়ালগ** | **Fully Implemented** | "আপনি কি অ্যাপ থেকে বের হতে চান? [বের হব না] [বের হতে চাই]"। |
| **কমিউনিটি চ্যাট ও পোল** | **Fully Implemented** | সাধারণ গ্রুপ চ্যাট, মডারেটর-অনলি চ্যানেল, ইমোজি রিয়েকশন ও লাইভ ভোট পোল। |
| **বকেয়া সঞ্চয় নোটিফিকেশন শর্টকাট** | **Fully Implemented** | প্রতি মাসের ১০ তারিখের পর বকেয়া সদস্যদের লাল নির্দেশক ও এসএমএস/নোটিফিকেশন অ্যালার্ট। |
| **অ্যাপ্লিকেশন আপডেট ম্যানেজার** | **Fully Implemented** | এপিকে ভার্সন কোড, রিলিজ নোটস, ম্যান্ডেটরি আপডেট ডায়ালগ ও হ্যাশ ভেরিফিকেশন। |
| **ব্যাকআপ ও রিস্টোর** | **Fully Implemented** | পূর্ণাঙ্গ ডাটাবেজ JSON এক্সপোর্ট, স্কিমা ভ্যালিডেশন এবং রিস্টোর ইঞ্জিন। |
| **গুগল শিটস ক্লাউড সিঙ্ক** | **Implemented (External Config)** | গুগল শিট লিংক ম্যানেজমেন্ট ও ইন্টারঅ্যাক্টিভ স্প্রেডশিট প্রিভিউ; Google OAuth কনফিগারেশন সাপেক্ষ। |
| **WebRTC অডিও/ভিডিও কলিং** | **Implemented (External Config)** | কল সেশন হ্যান্ডলিং, রিং স্টেট, ক্যামেরা/মাইক কন্ট্রোল ও সময় গণক; STUN/TURN সার্ভার সাপেক্ষ। |
| **Firebase Cloud Messaging (FCM)** | **Implemented (External Config)** | ব্যাকগ্রাউন্ড পুশ নোটিফিকেশন পরিকাঠামো; `google-services.json` কনফিগারেশন সাপেক্ষ। |

---

## ৩. অনুমোদন অ্যালগরিদম (2/3rds Ceiling Approval Logic)
- **সূত্র:** $\text{Required Votes} = \lceil \frac{\text{Eligible Moderators} \times 2}{3} \rceil$
- **টেস্ট কেস ভেরিফিকেশন (Unit Tested):**
  - ১ জন মডারেটর $\to$ ১ ভোট
  - ২ জন মডারেটর $\to$ ২ ভোট
  - ৩ জন মডারেটর $\to$ ২ ভোট
  - ৪ জন মডারেটর $\to$ ৩ ভোট
  - ৫ জন মডারেটর $\to$ ৪ ভোট
  - ৬ জন মডারেটর $\to$ ৪ ভোট
  - ৭ জন মডারেটর $\to$ ৫ ভোট

---

## ৪. ফায়ারবেস সিকিউরিটি রুলস (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isApprovedMember() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'APPROVED';
    }
    function isModerator() {
      let role = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
      return isAuthenticated() && (role == 'MODERATOR' || role == 'APP_MODERATOR');
    }
    function isAppModerator() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'APP_MODERATOR';
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow update: if isAppModerator() || request.auth.uid == userId;
    }

    match /savingsTransactions/{txId} {
      allow read: if isApprovedMember();
      allow create: if isModerator();
      allow update, delete: if false; // Immutability & Reversals only
    }

    match /moderatorChat/{msgId} {
      allow read, write: if isModerator();
    }
  }
}
```

---

## ৫. নেটিভ অ্যান্ড্রয়েড এপিকে কম্পাইলেশন গাইড (Native Android Build)
1. **প্রয়োজনীয়তা:** Android Studio Ladybug/Koala, JDK 17+, Android SDK 35।
2. **ক্লোন ও সেটআপ:**
   - প্রজেক্টের `src/components/android/NativeAndroidSpecView.tsx` ফাইলে অন্তর্ভুক্ত আর্কিটেকচারাল কোড কপি করুন।
   - আপনার Firebase Console থেকে `google-services.json` ফাইলটি `app/` ডিরেক্টরিতে পেস্ট করুন।
3. **কমান্ড লাইন বিল্ড:**
   ```bash
   # Debug APK
   ./gradlew assembleDebug

   # Production Release APK (with Keystore)
   ./gradlew assembleRelease
   ```
4. **জেনারেটকৃত এপিকে লোকেশন:**
   `app/build/outputs/apk/release/app-release.apk`
