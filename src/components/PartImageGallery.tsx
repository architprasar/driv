"use client";

import { useState } from "react";
import Image from "next/image";
import { getMediaUrl } from "@/lib/runtime-config";

interface ImageProps {
  id: number;
  image: string;
  is_primary: boolean;
}

export default function PartImageGallery({ images, name }: { images: ImageProps[], name: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // If no images, render fallback
  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square bg-surface-container-low rounded-3xl flex items-center justify-center border border-outline-variant/30 shadow-sm">
        <span className="material-symbols-outlined text-6xl text-outline">build</span>
      </div>
    );
  }

  const mainImage = images[activeIndex];
  const imgSrc = getMediaUrl(mainImage.image);

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full aspect-square bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm p-8 relative overflow-hidden group flex items-center justify-center">
        <Image 
          src={imgSrc} 
          alt={name} 
          fill 
          className="object-contain p-8 group-hover:scale-105 transition-transform duration-500" 
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, idx) => {
            const thumbSrc = getMediaUrl(img.image);
            return (
              <button 
                key={img.id}
                onClick={() => setActiveIndex(idx)}
                className={`relative w-24 h-24 shrink-0 rounded-2xl border-2 overflow-hidden transition-all ${activeIndex === idx ? 'border-primary shadow-md' : 'border-outline-variant/30 opacity-60 hover:opacity-100 bg-surface-container-lowest'}`}
              >
                <Image src={thumbSrc} alt={`${name} thumbnail ${idx}`} fill className="object-contain p-2" sizes="96px" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
