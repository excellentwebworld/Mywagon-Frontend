import { useEffect, useRef } from "react";
import { LOGIN_PARTICLES_CONFIG } from "./loginParticlesConfig";

declare global {
  interface Window {
    particlesJS?: (id: string, config: object) => void;
    pJSDom?: Array<{
      pJS: {
        canvas: { el: HTMLCanvasElement };
        fn: { vendors: { destroypJS: () => void } };
      };
    }>;
  }
}

export const LOGIN_PARTICLES_ID = "shipper-login-particles";

const particlesScriptSrc = `${import.meta.env.BASE_URL}js/particles.min.js`;

let scriptPromise: Promise<void> | null = null;

function loadParticlesScript(): Promise<void> {
  if (window.particlesJS) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.particlesJS) resolve();
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${particlesScriptSrc}"]`,
    );
    if (existing) {
      if (window.particlesJS) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("particles.js failed")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = particlesScriptSrc;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("particles.js failed"));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

function destroyParticlesInstance(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  if (!canvas) return;

  const index =
    window.pJSDom?.findIndex((entry) => entry.pJS.canvas.el === canvas) ?? -1;
  if (index >= 0 && window.pJSDom?.[index]?.pJS?.fn?.vendors?.destroypJS) {
    window.pJSDom[index].pJS.fn.vendors.destroypJS();
    window?.pJSDom?.splice(index, 1);
    return;
  }

  canvas.remove();
}

export function useLoginParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.id = LOGIN_PARTICLES_ID;
    let cancelled = false;

    loadParticlesScript()
      .then(() => {
        if (cancelled || !window.particlesJS) return;
        destroyParticlesInstance(container);
        window.particlesJS(LOGIN_PARTICLES_ID, LOGIN_PARTICLES_CONFIG);
      })
      .catch(() => {
        // Gradient background remains if particles fail to load.
      });

    return () => {
      cancelled = true;
      destroyParticlesInstance(container);
    };
  }, []);

  return containerRef;
}
