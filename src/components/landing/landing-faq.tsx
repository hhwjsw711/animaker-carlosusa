import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { animate } from "animejs";
import { useReveal } from "./use-reveal";

export const FAQ_KEYS = [
  "what",
  "trial",
  "credits",
  "noCreditsLeft",
  "changePlan",
  "billing",
  "cancel",
  "team",
  "security",
  "agents",
] as const;

export function LandingFaq() {
  const { t } = useTranslation();
  const headerRef = useReveal<HTMLDivElement>();
  const listRef = useReveal<HTMLDivElement>({
    childSelector: "[data-reveal-item]",
    staggerDelay: 60,
  });
  const collapseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = collapseRef.current;
    if (!container) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const cleanups: Array<() => void> = [];
    const detailsList = container.querySelectorAll<HTMLDetailsElement>("details");

    for (const details of detailsList) {
      const summary = details.querySelector<HTMLElement>("summary");
      const panel = details.querySelector<HTMLElement>("[data-faq-panel]");
      if (!summary || !panel) continue;

      let current: ReturnType<typeof animate> | null = null;

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        if (current) current.cancel();

        const isOpening = !details.open;

        if (isOpening) {
          details.open = true;
          const targetHeight = panel.scrollHeight;

          panel.style.height = "0px";
          panel.style.overflow = "hidden";
          panel.style.willChange = "height";
          void panel.offsetHeight;

          current = animate(panel, {
            height: targetHeight,
            duration: 360,
            ease: "outCubic",
            onComplete: () => {
              panel.style.height = "";
              panel.style.overflow = "";
              panel.style.willChange = "";
              current = null;
            },
          });
        } else {
          const startHeight = panel.getBoundingClientRect().height;

          panel.style.height = `${startHeight}px`;
          panel.style.overflow = "hidden";
          panel.style.willChange = "height";
          void panel.offsetHeight;

          current = animate(panel, {
            height: 0,
            duration: 280,
            ease: "outCubic",
            onComplete: () => {
              details.open = false;
              panel.style.height = "";
              panel.style.overflow = "";
              panel.style.willChange = "";
              current = null;
            },
          });
        }
      };

      summary.addEventListener("click", handleClick);
      cleanups.push(() => summary.removeEventListener("click", handleClick));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 items-start gap-10 md:gap-16 lg:grid-cols-5">
          <div ref={headerRef} className="lg:col-span-2 lg:sticky lg:top-24">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
              {t("landing.faq.eyebrow")}
            </span>
            <h2
              id="faq-heading"
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              {t("landing.faq.title")}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              {t("landing.faq.subtitle")}
            </p>
          </div>

          <div
            ref={(node) => {
              listRef.current = node;
              collapseRef.current = node;
            }}
            className="flex flex-col gap-3 lg:col-span-3"
          >
            {FAQ_KEYS.map((key) => (
              <details
                key={key}
                data-reveal-item
                className="group rounded-xl border border-border bg-card transition-colors open:border-primary"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="line-clamp-1">{t(`landing.faq.items.${key}.question`)}</span>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-open:rotate-45">
                    <Plus className="size-4" strokeWidth={2.5} />
                  </span>
                </summary>
                <div
                  data-faq-panel
                  className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground md:text-base"
                >
                  {t(`landing.faq.items.${key}.answer`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
