"use client";

import { useState } from "react";

export default function CardZoom({
  small,
  large,
  alt,
}: {
  small: string;
  large: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);

  if (!small) return null;

  return (
    <>
      <img
        src={small}
        alt={alt}
        style={{ width: "100%", borderRadius: 12, cursor: "zoom-in" }}
        onClick={() => setOpen(true)}
      />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <img
            src={large || small}
            alt={alt}
            style={{
              maxWidth: "95vw",
              maxHeight: "92vh",
              borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </>
  );
}
