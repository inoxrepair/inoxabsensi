"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    const daftar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Aplikasi tetap berjalan normal bila registrasi PWA gagal.
      });
    };

    if (document.readyState === "complete") daftar();
    else window.addEventListener("load", daftar, { once: true });

    return () => window.removeEventListener("load", daftar);
  }, []);

  return null;
}
