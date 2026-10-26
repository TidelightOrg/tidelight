"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type PackageOrbit3DProps = {
  motionTargetSelector?: string;
  staticFallback?: boolean;
};

export function PackageOrbit3D({ motionTargetSelector = ".tic-package-constellation", staticFallback = false }: PackageOrbit3DProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current;
    if (!container || !window.matchMedia("(min-width: 701px)").matches) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8.5);
    let renderer: THREE.WebGLRenderer;
    try {
      // Probe WebGL2 first so unsupported browsers keep the static constellation
      // without Three.js emitting a renderer initialization error.
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
      if (!context) return;
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    container.classList.add("has-webgl");
    const group = new THREE.Group();
    scene.add(group);

    const themeRoot = container.closest<HTMLElement>(".tic") ?? document.documentElement;
    const themeAccent = () => getComputedStyle(themeRoot).getPropertyValue("--tic-accent").trim() || "#47d7a1";
    const accentColor = new THREE.Color(themeAccent());
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true, transparent: true, opacity: 0.56 }));
    group.add(core);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true, transparent: true, opacity: 0.26 }));
    group.add(inner);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.2, wireframe: true });
    const rings = [new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.008, 4, 120), ringMaterial), new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.006, 4, 120), ringMaterial.clone())];
    rings[0].rotation.set(0.9, 0.3, 0.15);
    rings[1].rotation.set(0.1, 1.05, 0.8);
    rings.forEach(ring => group.add(ring));
    const nodeGeometry = new THREE.SphereGeometry(0.055, 10, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: accentColor });
    for (let index = 0; index < 14; index++) {
      const angle = index * Math.PI * 2 / 14;
      const radius = index % 2 ? 2.1 : 2.58;
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.56, Math.sin(angle * 2) * 0.48);
      group.add(node);
    }

    const onThemeChange = () => {
      const nextAccent = themeAccent();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if ("color" in material) (material as THREE.MeshBasicMaterial).color.setStyle(nextAccent);
        });
      });
      renderer.render(scene, camera);
    };
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let inView = false;
    let pointerX = 0;
    let pointerZ = 0;
    let spin = 0;
    const motionTarget = container.closest<HTMLElement>(motionTargetSelector);
    const onPointerMove = (event: PointerEvent) => {
      if (!motionTarget || reduceMotion.matches) return;
      const bounds = motionTarget.getBoundingClientRect();
      pointerX = -((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 0.24;
      pointerZ = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 0.32;
      if (reduceMotion.matches) {
        group.rotation.x = pointerX;
        group.rotation.z = pointerZ;
        renderer.render(scene, camera);
      }
    };
    const onPointerLeave = () => {
      if (reduceMotion.matches) return;
      pointerX = 0;
      pointerZ = 0;
    };
    motionTarget?.addEventListener("pointermove", onPointerMove, { passive: true });
    motionTarget?.addEventListener("pointerleave", onPointerLeave, { passive: true });
    const inViewport = new IntersectionObserver(entries => {
      inView = Boolean(entries[0]?.isIntersecting);
      if (inView && !document.hidden && !reduceMotion.matches) startAnimation();
      else if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
    }, { threshold: 0.01 });
    inViewport.observe(container);
    const onVisibilityChange = () => {
      if (!document.hidden && inView && !reduceMotion.matches) render();
      else if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const render = () => {
      frame = 0;
      spin += 0.0014;
      group.rotation.y = spin;
      group.rotation.x += (pointerX - group.rotation.x) * 0.035;
      group.rotation.z += (pointerZ - group.rotation.z) * 0.035;
      renderer.render(scene, camera);
      if (!reduceMotion.matches && inView && !document.hidden) {
        frame = window.requestAnimationFrame(render);
      }
    };
    const startAnimation = () => {
      if (!frame && inView && !document.hidden && !reduceMotion.matches) render();
    };
    // Paint a still frame immediately; animation starts only while visible.
    renderer.render(scene, camera);
    const onMotion = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (reduceMotion.matches) renderer.render(scene, camera);
      else if (inView && !document.hidden) startAnimation();
    };
    reduceMotion.addEventListener("change", onMotion);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
      inViewport.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionTarget?.removeEventListener("pointermove", onPointerMove);
      motionTarget?.removeEventListener("pointerleave", onPointerLeave);
      reduceMotion.removeEventListener("change", onMotion);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => materials.add(item));
          else materials.add(material);
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      container.classList.remove("has-webgl");
    };
  }, [motionTargetSelector]);

  return <div className="tic-package-three-orbit" ref={host} aria-hidden="true">
    {staticFallback && <svg className="tic-orbit-static" viewBox="0 0 420 300" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs><radialGradient id="tic-orbit-glow"><stop stopColor="#76f1c0" stopOpacity=".24"/><stop offset="1" stopColor="#76f1c0" stopOpacity="0"/></radialGradient></defs>
      <ellipse cx="210" cy="150" rx="178" ry="67" fill="none" stroke="#67dfb3" strokeOpacity=".3" strokeWidth="1" transform="rotate(-22 210 150)"/>
      <ellipse cx="210" cy="150" rx="145" ry="91" fill="none" stroke="#67dfb3" strokeOpacity=".2" strokeWidth="1" transform="rotate(32 210 150)"/>
      <ellipse cx="210" cy="150" rx="110" ry="110" fill="none" stroke="#67dfb3" strokeOpacity=".11" strokeWidth="1"/>
      <circle cx="210" cy="150" r="76" fill="url(#tic-orbit-glow)"/>
      <path d="m210 109 37 21v42l-37 21-37-21v-42z M210 109v84m-37-63 74 42m0-42-74 42" fill="none" stroke="#76f1c0" strokeOpacity=".64" strokeWidth="1.2"/>
      <g fill="#8cf5ca" stroke="#102d26" strokeWidth="5"><circle cx="43" cy="147" r="5"/><circle cx="105" cy="74" r="5"/><circle cx="304" cy="62" r="5"/><circle cx="376" cy="171" r="5"/><circle cx="290" cy="241" r="5"/><circle cx="117" cy="229" r="5"/></g>
      <g fill="none" stroke="#76f1c0" strokeOpacity=".23" strokeWidth="1"><path d="m43 147 62-73 105 76m0 0 94-88m-94 88 86 91m-86-91-93 79m93-79 166 21"/></g>
    </svg>}
  </div>;
}
