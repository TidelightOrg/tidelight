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
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
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
    const render = () => {
      frame = 0;
      renderer.render(scene, camera);
      if (!reduceMotion.matches) {
        group.rotation.y += 0.0014;
        group.rotation.z += 0.0003;
        frame = window.requestAnimationFrame(render);
      }
    };
    render();
    const onMotion = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      render();
    };
    reduceMotion.addEventListener("change", onMotion);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      reduceMotion.removeEventListener("change", onMotion);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="tic-package-three-orbit" ref={host} aria-hidden="true" />;
}
