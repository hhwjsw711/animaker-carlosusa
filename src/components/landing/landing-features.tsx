import { useTranslation } from "react-i18next";
import { FeatureSection } from "./feature-section";
import { FeatureBeam } from "./feature-beam";
import { FEATURE_ICONS, FEATURE_ORDER } from "./feature-icons";

export function LandingFeatures() {
  const { t } = useTranslation();

  return (
    <>
      <section
        id="features"
        aria-labelledby="features-intro-heading"
        className="border-t border-border/60"
      >
      </section>

      <FeatureBeam />

      {FEATURE_ORDER.map((key, index) => (
        <FeatureSection
          key={key}
          id={`feature-${key}`}
          icon={FEATURE_ICONS[key]}
          eyebrow={t(`landing.features.${key}.eyebrow`)}
          title={t(`landing.features.${key}.title`)}
          description={t(`landing.features.${key}.description`)}
          bullets={[
            t(`landing.features.${key}.bullets.one`),
            t(`landing.features.${key}.bullets.two`),
            t(`landing.features.${key}.bullets.three`),
          ]}
          reverse={index % 2 === 1}
        />
      ))}
    </>
  );
}
