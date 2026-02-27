"use client";
import React, { useRef, useEffect } from "react";

type MoveableScrollAreaProps = React.PropsWithChildren<{
  className?: string;
  style?: React.CSSProperties;
}>;

export const MoveableScrollArea: React.FC<MoveableScrollAreaProps> = ({
  children,
  className = "",
  style,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  // Globale Events für Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current || !scrollRef.current) return;
      e.preventDefault();
      const y = e.pageY - scrollRef.current.offsetTop;
      const walk = (y - startY.current) * 1.5;
      scrollRef.current.scrollTop = scrollTop.current - walk;
    };
    const handleMouseUp = () => {
      isDown.current = false;
      if (scrollRef.current) scrollRef.current.style.cursor = "grab";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    isDown.current = true;
    scrollRef.current.style.cursor = "grabbing";
    startY.current = e.pageY - scrollRef.current.offsetTop;
    scrollTop.current = scrollRef.current.scrollTop;
  };

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      className={`overflow-y-auto select-none cursor-grab ${className}`}
      style={{
        ...style,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
        div::-webkit-scrollbar {
          display: none !important;
        }
      `}} />
      {children}
    </div>
  );
};