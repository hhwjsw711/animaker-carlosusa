import type { ReactNode } from "react";

export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
      {children}
    </h1>
  );
}

export function UpdatedAt({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-sm text-muted-foreground">{children}</p>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 text-base leading-relaxed text-muted-foreground md:text-lg">
      {children}
    </p>
  );
}

export function H2({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="mt-14 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground md:text-2xl"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 text-base font-semibold text-foreground md:text-lg">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-4 flex flex-col gap-2.5">{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-5 text-base leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-2.5 before:size-1.5 before:rounded-full before:bg-primary">
      {children}
    </li>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function A({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}
