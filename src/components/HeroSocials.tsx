"use client";

import Link from "next/link";
import { FaInstagram, FaTiktok, FaLinkedinIn } from "react-icons/fa6";

type Social = {
    label: string;
    href: string;
    Icon: React.ComponentType<{ className?: string }>;
};

export function HeroSocials({ isDisabled = false }: { isDisabled?: boolean }) {
    const socials: Social[] = [
        { label: "Instagram", href: "https://instagram.com/", Icon: FaInstagram },
        { label: "TikTok", href: "https://tiktok.com/", Icon: FaTiktok },
        { label: "LinkedIn", href: "https://linkedin.com/", Icon: FaLinkedinIn },
    ];

    return (
        <div
            className={[
                "absolute bottom-7 left-7 z-20 hidden md:flex items-center gap-3", // ✅ gap più piccolo
                isDisabled ? "pointer-events-none opacity-60" : "pointer-events-auto",
            ].join(" ")}
        >
            {socials.map(({ label, href, Icon }) => (
                <Link
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noreferrer"
                    className="
            group relative grid h-9 w-9 place-items-center rounded-full  /* ✅ 44 -> 36 */
            border border-white/25 bg-white/0 text-white/85
            transition duration-300
            hover:border-white/40 hover:bg-white/5 hover:text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
          "
                >
                    {/* glow più piccolo */}
                    <span
                        className="
              pointer-events-none absolute inset-0 rounded-full
              ring-1 ring-white/0
              transition duration-300
              group-hover:ring-white/20
              group-hover:shadow-[0_0_0_8px_rgba(255,255,255,0.04)] /* ✅ 10 -> 8 */
            "
                    />
                    <Icon className="relative text-[15px] opacity-90 transition group-hover:opacity-100" /> {/* ✅ 18 -> 15 */}
                </Link>
            ))}
        </div>
    );
}
