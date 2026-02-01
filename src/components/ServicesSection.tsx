"use client";

import { motion } from "framer-motion";

type Service = {
    n: string;
    title: string;
    desc: string;
    ghost: string;
};

const services: Service[] = [
    { n: "01", title: "Consulenza", desc: "Definiamo obbiettivi, contesto e giusta taglia dell'intervento", ghost: "C" },
    { n: "02", title: "Analisi", desc: "Analizziamo e strutturiamo i tuoi processi aziendali", ghost: "A" },
    { n: "03", title: "Sviluppo", desc: "Costruiamo sistemi digitali e soluzioni digitali su misura", ghost: "S" },
];

export function ServicesSection() {
    return (
        <section className="theme-light">
            <div className="services-wrap">
                <div className="services-pad">
                    <div className="services-grid">
                        {services.map((s) => (
                            <div key={s.n} className="service-card group">
                                <div className="service-ghost-layer">
                                    <div className="relative">
                                        <div className="service-ghost-text">{s.ghost}</div>
                                        <motion.div
                                            className="service-ghost-underline"
                                            initial={{ scaleX: 0 }}
                                            whileHover={{ scaleX: 1 }}
                                            transition={{ duration: 0.22, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <div className="service-n">{s.n}</div>
                                    <h3 className="service-title">{s.title}</h3>
                                    <p className="service-desc">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

