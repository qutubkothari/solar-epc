"use client";

import { useEffect } from "react";

export function DynamicMetadata() {
  useEffect(() => {
    const updateMetadata = async () => {
      try {
        const res = await fetch("/api/company-settings");
        const settings = await res.json();

        // Update page title
        if (settings.companyName) {
          document.title = settings.companyName;
        }

        // Update favicon
        if (settings.companyFavicon) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = settings.companyFavicon;
        }
      } catch (error) {
        console.error("Failed to load company settings:", error);
      }
    };

    updateMetadata();
  }, []);

  return null;
}
