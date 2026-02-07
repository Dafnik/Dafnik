import React from 'react';

import {useCallback, useRef, useState} from 'react';
import {Upload, ImageIcon} from 'lucide-react';

interface DropZoneProps {
  onImagesLoaded: (image1: string, image2: string | null) => void;
}

export function DropZone({onImagesLoaded}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const readers: Promise<string>[] = imageFiles.slice(0, 2).map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          }),
      );

      Promise.all(readers).then((results) => {
        onImagesLoaded(results[0], results[1] || null);
      });
    },
    [onImagesLoaded],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles],
  );

  return (
    <div
      className="bg-background relative flex h-screen w-screen items-center justify-center"
      style={{
        backgroundImage: `radial-gradient(circle, oklch(var(--foreground) / 0.15) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}>
      <button
        type="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex aspect-video w-full max-w-xl cursor-pointer flex-col items-center justify-center border-4 border-dashed shadow-[10px_10px_0_0_rgba(0,0,0,0.72)] transition-all duration-200 ${
          isDragging
            ? 'border-primary bg-primary/12 scale-[1.02]'
            : 'border-border bg-card hover:border-primary hover:bg-secondary/70'
        } `}>
        <div className="text-muted-foreground flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-secondary border-border flex h-14 w-14 items-center justify-center border-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.7)]">
              <Upload className="h-6 w-6" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-foreground text-lg font-medium">Drop screenshots here</p>
            <p className="mt-1 text-sm">Drop 1 or 2 images, or click to browse</p>
          </div>
          <div className="mt-2 flex items-center gap-6 text-xs">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />1 image: blur editor
            </span>
            <span className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              <ImageIcon className="-ml-2.5 h-3.5 w-3.5" />2 images: split view
            </span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </button>
    </div>
  );
}
