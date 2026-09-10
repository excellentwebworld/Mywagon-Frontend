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

const localScriptSrc = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/js/particles.min.js`;
const cdnScriptSrc = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';

let scriptPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.particlesJS) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (window.particlesJS) resolve();
      else reject(new Error(`particlesJS not found on window after loading ${src}`));
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function loadParticlesScript(): Promise<void> {
  if (window.particlesJS) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = loadScript(localScriptSrc)
    .catch(() => loadScript(cdnScriptSrc))
    .catch(() => loadScript('/js/particles.min.js'));

  return scriptPromise;
}

function destroyParticlesInstance(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  if (!canvas) return;

  if (Array.isArray(window.pJSDom)) {
    const index =
      window.pJSDom.findIndex((entry) => entry?.pJS?.canvas?.el === canvas);
    if (index >= 0) {
      const entry = window.pJSDom[index];
      if (typeof entry?.pJS?.fn?.vendors?.destroypJS === 'function') {
        try {
          entry.pJS.fn.vendors.destroypJS();
        } catch {
          // ignore
        }
      }
      if (Array.isArray(window.pJSDom)) {
        window.pJSDom.splice(index, 1);
      }
    }
  }

  if (!Array.isArray(window.pJSDom)) {
    window.pJSDom = [];
  }

  try {
    canvas.remove();
  } catch {
    // ignore
  }
}

export function useLoginParticles(id: string = LOGIN_PARTICLES_ID) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.id = id;
    let cancelled = false;

    if (!Array.isArray(window.pJSDom)) {
      window.pJSDom = [];
    }

    loadParticlesScript()
      .then(() => {
        if (cancelled || typeof window.particlesJS !== 'function') return;
        if (!Array.isArray(window.pJSDom)) {
          window.pJSDom = [];
        }
        destroyParticlesInstance(container);
        window.particlesJS(id, LOGIN_PARTICLES_CONFIG);
      })
      .catch(() => {
        // Gradient background remains if particles fail to load.
      });

    return () => {
      cancelled = true;
      destroyParticlesInstance(container);
    };
  }, [id]);

  return containerRef;
}
