"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function PackageOrbit3D() {
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
    const group = new THREE.Group();
    scene.add(group);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshBasicMaterial({ color: 0x47d7a1, wireframe: true, transparent: true, opacity: 0.56 }));
    group.add(core);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 1), new THREE.MeshBasicMaterial({ color: 0x75f0be, wireframe: true, transparent: true, opacity: 0.26 }));
    group.add(inner);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x47d7a1, transparent: true, opacity: 0.2, wireframe: true });
    const rings = [new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.008, 4, 120), ringMaterial), new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.006, 4, 120), ringMaterial.clone())];
    rings[0].rotation.set(0.9, 0.3, 0.15);
    rings[1].rotation.set(0.1, 1.05, 0.8);
    rings.forEach(ring => group.add(ring));
    const nodeGeometry = new THREE.SphereGeometry(0.055, 10, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x7cf0c2 });
    for (let index = 0; index < 14; index++) {
      const angle = index * Math.PI * 2 / 14;
      const radius = index % 2 ? 2.1 : 2.58;
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.56, Math.sin(angle * 2) * 0.48);
      group.add(node);
    }

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
    const motionTarget = container.closest<HTMLElement>(".tic-package-constellation");
    const onPointerMove = (event: PointerEvent) => {
      if (!motionTarget) return;
      const bounds = motionTarget.getBoundingClientRect();
      pointerX = -((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 0.24;
      pointerZ = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 0.32;
      if (reduceMotion.matches) {
        group.rotation.x = pointerX;
        group.rotation.z = pointerZ;
        renderer.render(scene, camera);
      }
    };
    const onPointerLeave = () => { pointerX = 0; pointerZ = 0; };
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
    };
  }, []);

  return <div className="tic-package-three-orbit" ref={host} aria-hidden="true" />;
}
