"use client";

import Link from "next/link";
import React from "react";
import { FaInstagram, FaTiktok, FaLinkedinIn } from "react-icons/fa6";

type Social = {
    label: string;
    href: string;
    Icon: React.ComponentType<{ className?: string }>;
};

function accentForIndex(i: number) {
    const palette = [
        "var(--accent-yellow)",
        "var(--accent-blue)",
        "var(--accent-purple)",
    ];
    return palette[i % palette.length];
}

export function HeroSocials({ isDisabled = false }: { isDisabled?: boolean }) {
    const socials: Social[] = [
        { label: "Instagram", href: "https://instagram.com/", Icon: FaInstagram },
        { label: "TikTok", href: "https://tiktok.com/", Icon: FaTiktok },
        { label: "LinkedIn", href: "https://linkedin.com/", Icon: FaLinkedinIn },
    ];

    return (
        <div
            className={[
                "hero-socials",
                isDisabled ? "pointer-events-none opacity-60" : "pointer-events-auto",
            ].join(" ")}
        >
            {socials.map(({ label, href, Icon }, idx) => {
                const accent = accentForIndex(idx);

                return (
                    <Link
                        key={label}
                        href={href}
                        aria-label={label}
                        target="_blank"
                        rel="noreferrer"
                        className="hero-social-btn"
                        style={
                            {
                                ["--social-accent" as any]: accent,
                            } as React.CSSProperties
                        }
                    >
                        <span className="hero-social-glow" />
                        <Icon className="hero-social-icon" />
                    </Link>
                );
            })}
        </div>
    );
}
