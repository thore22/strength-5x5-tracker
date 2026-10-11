import { registerSW } from 'virtual:pwa-register';
export let activateUpdate:()=>Promise<void>=async()=>{};
activateUpdate=registerSW({onNeedRefresh(){window.dispatchEvent(new Event('strength-update'));},onOfflineReady(){window.dispatchEvent(new Event('strength-offline'));}});
