"use client";
import Link from "next/link";
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui",
          margin: 0,
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <h1>We couldn’t load Drivio</h1>
        <p>
          Please try again. Review your saved orders before repeating a
          purchase.
        </p>
        <button
          onClick={retry}
          style={{ padding: "12px 24px", cursor: "pointer" }}
        >
          Try again
        </button>{" "}
        <Link href="/">Return home</Link>
      </body>
    </html>
  );
}
