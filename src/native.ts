import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();

export async function initializeNativeApp() {
  if (!isNativeApp) {
    return;
  }

  document.documentElement.classList.add("capacitor-native");

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import("@capacitor/status-bar"),
    import("@capacitor/splash-screen"),
  ]);

  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setBackgroundColor({ color: "#f7fbff" });
  await StatusBar.setStyle({ style: Style.Dark });
  await SplashScreen.hide();
}
