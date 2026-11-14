"use client";

import { useEffect } from "react";
import { bacaIdPerangkat } from "@/lib/perangkat-id";

/**
 * Dipasang sekali di root layout: memastikan tiap browser yang membuka
 * aplikasi punya ID perangkat (localStorage + cookie) sebelum login
 * apa pun dicatat. Tidak menampilkan apa-apa.
 */
export function PasangIdPerangkat() {
  useEffect(() => {
    bacaIdPerangkat();
  }, []);
  return null;
}
