"use client";

// Aceternity-style LayoutGrid, adapted for this codebase:
// - React 19: the global `JSX.Element` type is gone → React.ReactNode.
// - Thumbnails render through next/image (the gallery PNGs are ~2.5MB each;
//   raw <img> would ship the originals) inside a layoutId'd motion wrapper.
// - The expanded card + backdrop are `fixed`, not `absolute`: the source demo
//   assumed a screen-tall grid, but with a long scrolling grid an absolutely
//   centered card lands mid-container, off-viewport.
// - bg-white → bg-card, and Escape closes the expanded card.

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type LayoutGridCard = {
  id: number;
  content: React.ReactNode;
  className: string;
  thumbnail: string;
  /** Accessible name for the card; also the thumbnail alt text. */
  label?: string;
  /** Optional next/image blur placeholder. */
  blurDataURL?: string;
};

export const LayoutGrid = ({ cards }: { cards: LayoutGridCard[] }) => {
  const [selected, setSelected] = useState<LayoutGridCard | null>(null);
  const [lastSelected, setLastSelected] = useState<LayoutGridCard | null>(null);

  const handleClick = (card: LayoutGridCard) => {
    setLastSelected(selected);
    setSelected(card);
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleOutsideClick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 auto-rows-[13rem] md:auto-rows-[15rem] md:grid-flow-dense md:grid-cols-3">
      {cards.map((card, i) => (
        <div key={i} className={cn(card.className, "")}>
          <motion.div
            role="button"
            tabIndex={0}
            aria-label={card.label}
            onClick={() => handleClick(card)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick(card);
              }
            }}
            className={cn(
              card.className,
              "relative cursor-pointer overflow-hidden",
              selected?.id === card.id
                ? "fixed inset-0 z-50 m-auto flex h-1/2 w-full flex-col flex-wrap items-center justify-center rounded-lg md:w-1/2"
                : lastSelected?.id === card.id
                  ? "z-40 h-full w-full rounded-xl bg-card"
                  : "h-full w-full rounded-xl bg-card",
            )}
            layoutId={`card-${card.id}`}
          >
            {selected?.id === card.id && <SelectedCard selected={selected} />}
            <ImageComponent card={card} />
          </motion.div>
        </div>
      ))}
      <motion.div
        onClick={handleOutsideClick}
        className={cn(
          "fixed left-0 top-0 z-10 h-full w-full bg-black opacity-0",
          selected?.id !== undefined ? "pointer-events-auto" : "pointer-events-none",
        )}
        animate={{ opacity: selected ? 0.55 : 0 }}
        aria-hidden
      />
    </div>
  );
};

const ImageComponent = ({ card }: { card: LayoutGridCard }) => {
  return (
    <motion.div layoutId={`image-${card.id}-image`} className="absolute inset-0">
      <Image
        src={card.thumbnail}
        alt={card.label ?? ""}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        placeholder={card.blurDataURL ? "blur" : "empty"}
        blurDataURL={card.blurDataURL}
        className="object-cover object-top transition duration-200"
      />
    </motion.div>
  );
};

const SelectedCard = ({ selected }: { selected: LayoutGridCard | null }) => {
  return (
    <div className="relative z-[60] flex h-full w-full flex-col justify-end rounded-lg bg-transparent shadow-2xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        className="absolute inset-0 z-10 h-full w-full bg-black opacity-60"
      />
      <motion.div
        layoutId={`content-${selected?.id}`}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative z-[70] px-8 pb-4"
      >
        {selected?.content}
      </motion.div>
    </div>
  );
};
