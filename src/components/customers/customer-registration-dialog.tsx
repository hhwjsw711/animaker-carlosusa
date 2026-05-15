import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Spinner from "@/components/ui/custom/spinner";
import {
  DATE_MASKS,
  applyMask,
  isoToDisplay,
  displayToIso,
} from "@/lib/date-mask";
import { DOCUMENT_MASKS, formatDocument } from "@/lib/document-mask";

const PHONE_MASKS: Record<string, { mask: string; placeholder: string }> = {
  "pt-BR": { mask: "(##) #####-####", placeholder: "(00) 00000-0000" },
  "en-US": { mask: "(###) ###-####", placeholder: "(000) 000-0000" },
};

type Gender = "male" | "female" | "nonBinary" | "other" | "preferNotToSay";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

export function CustomerRegistrationDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: Id<"customers">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const customer = useQuery(api.customers.queries.getCustomer, { customerId });
  const updateRegistration = useMutation(
    api.customers.mutations.updateCustomerRegistration,
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [document, setDocument] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [birthDateError, setBirthDateError] = useState(false);
  const [documentError, setDocumentError] = useState(false);

  const phoneMask = PHONE_MASKS[i18n.language] ?? PHONE_MASKS["en-US"];
  const dateMask = DATE_MASKS[i18n.language] ?? DATE_MASKS["en-US"];
  const docMask = DOCUMENT_MASKS[i18n.language] ?? DOCUMENT_MASKS["en-US"];

  const genderItems = useMemo(
    () => ({
      male: t("labels.genderMale"),
      female: t("labels.genderFemale"),
      nonBinary: t("labels.genderNonBinary"),
      other: t("labels.genderOther"),
      preferNotToSay: t("labels.genderPreferNotToSay"),
    }),
    [t],
  );

  useEffect(() => {
    if (open && customer) {
      setName(customer.name ?? "");
      setEmail(customer.email ?? "");
      setBirthDate(
        customer.birthDate
          ? isoToDisplay(customer.birthDate, i18n.language)
          : "",
      );
      setPhone(
        customer.phone ? applyMask(customer.phone, phoneMask.mask) : "",
      );
      setGender(customer.gender ?? "");
      setDocument(
        customer.document
          ? formatDocument(customer.document, docMask.mask)
          : "",
      );
      setCompany(customer.company ?? "");
      setJobTitle(customer.jobTitle ?? "");
      setAddress(customer.address ?? "");
      setCity(customer.city ?? "");
      setState(customer.state ?? "");
      setZipCode(customer.zipCode ?? "");
      setCountry(customer.country ?? "");
      setInstagram(customer.instagram ?? "");
      setTwitter(customer.twitter ?? "");
      setLinkedin(customer.linkedin ?? "");
      setFacebook(customer.facebook ?? "");
      setTiktok(customer.tiktok ?? "");
      setYoutube(customer.youtube ?? "");
      setBirthDateError(false);
      setDocumentError(false);
    }
  }, [open, customer, phoneMask.mask, docMask.mask, i18n.language]);

  const handleSave = useCallback(async () => {
    if (!customer) return;

    let birthDateIso = "";
    if (birthDate) {
      const iso = displayToIso(birthDate, i18n.language);
      if (!iso) {
        setBirthDateError(true);
        return;
      }
      birthDateIso = iso;
    }
    setBirthDateError(false);

    const docDigits = document.replace(/\D/g, "");
    if (docDigits && docDigits.length !== docMask.digits) {
      setDocumentError(true);
      return;
    }
    setDocumentError(false);

    const newPhone = phone.replace(/\D/g, "");
    const sanitize = (v: string) => v.replace(/^@/, "").trim();

    setIsSaving(true);
    try {
      await updateRegistration({
        customerId,
        name: name.trim(),
        email,
        birthDate: birthDateIso,
        phone: newPhone,
        gender: gender ? (gender as Gender) : undefined,
        document: docDigits,
        documentType: docDigits ? docMask.type : undefined,
        company,
        jobTitle,
        address,
        city,
        state,
        zipCode,
        country,
        instagram: sanitize(instagram),
        twitter: sanitize(twitter),
        linkedin: linkedin.trim(),
        facebook: facebook.trim(),
        tiktok: sanitize(tiktok),
        youtube: youtube.trim(),
      });
      onOpenChange(false);
    } catch {
      // will re-sync from server
    } finally {
      setIsSaving(false);
    }
  }, [
    customer,
    name,
    email,
    birthDate,
    phone,
    gender,
    document,
    company,
    jobTitle,
    address,
    city,
    state,
    zipCode,
    country,
    instagram,
    twitter,
    linkedin,
    facebook,
    tiktok,
    youtube,
    i18n.language,
    docMask,
    customerId,
    updateRegistration,
    onOpenChange,
  ]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhone(applyMask(e.target.value, phoneMask.mask));
    },
    [phoneMask.mask],
  );

  const handleBirthDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBirthDate(applyMask(e.target.value, dateMask.mask));
      setBirthDateError(false);
    },
    [dateMask.mask],
  );

  const handleDocumentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDocument(formatDocument(e.target.value, docMask.mask));
      setDocumentError(false);
    },
    [docMask.mask],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSaving) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("actions.edit")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Personal Information */}
          <SectionTitle>{t("labels.personalInfo")}</SectionTitle>
          <div className="space-y-1.5">
            <Label>{t("labels.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.phone")}</Label>
            <Input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder={phoneMask.placeholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.birthDate")}</Label>
            <Input
              value={birthDate}
              onChange={handleBirthDateChange}
              placeholder={dateMask.placeholder}
              aria-invalid={birthDateError || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.gender")}</Label>
            <Select
              value={gender}
              onValueChange={(v) => setGender(v)}
              items={genderItems}
            >
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("labels.genderMale")}</SelectItem>
                <SelectItem value="female">{t("labels.genderFemale")}</SelectItem>
                <SelectItem value="nonBinary">{t("labels.genderNonBinary")}</SelectItem>
                <SelectItem value="other">{t("labels.genderOther")}</SelectItem>
                <SelectItem value="preferNotToSay">{t("labels.genderPreferNotToSay")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t(`labels.${docMask.type}`)}</Label>
            <Input
              value={document}
              onChange={handleDocumentChange}
              placeholder={docMask.placeholder}
              aria-invalid={documentError || undefined}
            />
          </div>

          <Separator />

          {/* Professional */}
          <SectionTitle>{t("labels.professional")}</SectionTitle>
          <div className="space-y-1.5">
            <Label>{t("labels.company")}</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.jobTitle")}</Label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <Separator />

          {/* Address */}
          <SectionTitle>{t("labels.locationInfo")}</SectionTitle>
          <div className="space-y-1.5">
            <Label>{t("labels.address")}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("labels.city")}</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("labels.state")}</Label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("labels.zipCode")}</Label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("labels.country")}</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Social Media */}
          <SectionTitle>{t("labels.socialMedia")}</SectionTitle>
          <div className="space-y-1.5">
            <Label>{t("labels.instagram")}</Label>
            <div className="flex items-center">
              <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-input bg-muted/50 px-3 text-sm text-muted-foreground">@</span>
              <Input
                className="rounded-l-none"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.twitter")}</Label>
            <div className="flex items-center">
              <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-input bg-muted/50 px-3 text-sm text-muted-foreground">@</span>
              <Input
                className="rounded-l-none"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value.replace(/^@/, ""))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.linkedin")}</Label>
            <Input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.facebook")}</Label>
            <Input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.tiktok")}</Label>
            <div className="flex items-center">
              <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-input bg-muted/50 px-3 text-sm text-muted-foreground">@</span>
              <Input
                className="rounded-l-none"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value.replace(/^@/, ""))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.youtube")}</Label>
            <Input
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Spinner size={5} /> : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
