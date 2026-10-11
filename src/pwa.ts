import { registerSW } from "virtual:pwa-register";
export let updateAvailable = false;
export let activateUpdate: () => Promise<void> = async () => {};
activateUpdate = registerSW({
  onNeedRefresh() {
    updateAvailable = true;
    window.dispatchEvent(new Event("strength-update"));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event("strength-offline"));
  },
});
