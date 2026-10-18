# 粵語道場發佈指南

## 已自動完成

- Web 正式構建、PWA 設定及單頁路由回退
- Capacitor Android 工程、應用識別碼、圖標及品牌啟動畫面
- Android 正式簽名設定讀取機制
- 單元測試、內容校驗、TypeScript、Android Lint、原生測試編譯及構建命令
- 私隱政策草案、Play 商店文案、圖標和特性圖

## 1. 建立並永久保管上傳金鑰

這一步必須由發佈者本人完成。金鑰代表往後更新應用程式的身份，不應交給代碼生成工具或提交到 Git。

在專案根目錄開啟 PowerShell，確認 JDK 的 `keytool` 可用，然後執行：

```powershell
keytool -genkeypair -v -keystore android\release-keystore.jks -alias jyut-dojo -keyalg RSA -keysize 4096 -validity 10000
```

把 `android\keystore.properties.example` 複製為 `android\keystore.properties`，填入真實密碼。兩個檔案已被 `.gitignore` 排除。把 `.jks`、密碼及金鑰別名至少備份到兩個受保護位置。

## 2. 設定版本

編輯 `android/app/build.gradle`：

- 每次上傳 Google Play 前把 `versionCode` 增加 1，絕不可重用。
- 把 `versionName` 改為使用者看到的版本，例如 `1.0.0`。

## 3. 產生已簽名 AAB

```powershell
npm.cmd run android:bundle
```

輸出位於：

`android\app\build\outputs\bundle\release\app-release.aab`

若沒有 `keystore.properties`，Gradle 仍可產生未簽名測試產物，但不能提交 Google Play。

## 4. 發佈 Web

先執行：

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
```

把 `dist` 目錄部署到支援 HTTPS 和 SPA 回退的靜態主機。Cloudflare Pages、Netlify 可直接使用 `dist`；Vercel 已提供 `vercel.json`。主機設定：

- Build command：`npm run build`
- Output directory：`dist`
- Node：20 或更高
- 所有未知路由回退到 `/index.html`

部署後直接開啟 `/privacy`、`/tones` 和一個 `/learn/...` 深層網址，確認重新整理不會 404。

## 5. Google Play Console

1. 用擁有者 Google 帳戶建立開發者帳戶並完成身分驗證。
2. 建立應用程式，套件名稱必須為 `com.jyutdojo.app`。
3. 啟用 Play App Signing。
4. 先上傳至「內部測試」，不要直接發佈正式版。
5. 貼上 `STORE_LISTING.md` 的商店文案，上傳 `store-assets` 圖像和真機截圖。
6. 填寫應用程式存取權、廣告、內容分級、目標對象、資料安全及私隱政策網址。
7. 邀請測試者，完整測試咪高峰、語音、返回鍵、離線重開及升級保留進度。
8. 處理 Play 預啟動報告後，再逐步推送正式版。

## 6. 每次發佈前門禁

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run android:sync
npm.cmd run android:test
npm.cmd run android:lint
npm.cmd run android:bundle
```

只有全部退出碼為 0、真機冒煙測試通過、私隱政策和資料安全申報與最終版本一致時，才可上傳正式軌道。
