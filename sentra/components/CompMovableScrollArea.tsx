"use client";
import React, { useRef } from "react";

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    // Klicks auf Buttons/Inputs erlauben
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;

    isDown.current = true;
    scrollRef.current.style.cursor = "grabbing";
    startY.current = e.pageY - scrollRef.current.offsetTop;
    scrollTop.current = scrollRef.current.scrollTop;
  };

  const stopDragging = () => {
    isDown.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const y = e.pageY - scrollRef.current.offsetTop;
    const walk = (y - startY.current) * 1.5; 
    scrollRef.current.scrollTop = scrollTop.current - walk;
  };

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={stopDragging}
      onMouseUp={stopDragging}
      onMouseMove={handleMouseMove}
      className={`overflow-y-auto select-none cursor-grab ${className}`}
      style={{
        ...style,
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE/Edge
      }}
    >
      {/* Dieser Block ist entscheidend für Chrome, Safari und Opera */}
      <style dangerouslySetInnerHTML={{ __html: `
        div::-webkit-scrollbar {
          display: none !important;
        }
      `}} />
      {children}
    </div>
  );
};
