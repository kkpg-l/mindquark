import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import gsap from "gsap";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class ImageTrailController {
  elements: HTMLElement[];
  minDistance: number;
  currentIndex: number = 0;
  lastPos: { x: number; y: number } = { x: 0, y: 0 };
  total: number;
  zIndex: number = 100;

  constructor(elements: HTMLElement[], minDistance: number = 70) {
    this.elements = elements;
    this.minDistance = minDistance;
    this.total = elements.length;
  }

  init() {
    gsap.set(this.elements, {
      position: "fixed",
      top: 0,
      left: 0,
      xPercent: -50,
      yPercent: -50,
      pointerEvents: "none",
      opacity: 0,
      scale: 0.2,
      zIndex: 1,
      width: "48px",
      height: "auto",
      maxWidth: "52px",
      userSelect: "none",
      filter: "drop-shadow(0 2px 8px rgba(20, 184, 166, 0.2))",
    });
  }

  setMousePos(x: number, y: number) {
    const dist = Math.hypot(x - this.lastPos.x, y - this.lastPos.y);
    if (dist > this.minDistance || (this.lastPos.x === 0 && this.lastPos.y === 0)) {
      this.lastPos = { x, y };
      this.showNext(x, y);
    }
  }

  showNext(x: number, y: number) {
    if (this.elements.length === 0) return;
    const el = this.elements[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.total;
    this.zIndex += 1;

    gsap.killTweensOf(el);

    gsap.set(el, {
      x,
      y,
      zIndex: this.zIndex,
      opacity: 0,
      scale: 0.2,
      rotation: gsap.utils.random(-20, 20),
    });

    gsap.timeline()
      .to(el, {
        opacity: 0.85,
        scale: 0.55,
        duration: 0.25,
        ease: "back.out(1.6)",
      })
      .to(el, {
        opacity: 0,
        scale: 0.3,
        y: "+=18",
        duration: 0.45,
        ease: "power2.in",
        delay: 0.12,
      });
  }

  destroy() {
    this.elements.forEach((el) => {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 0 });
    });
  }
}
