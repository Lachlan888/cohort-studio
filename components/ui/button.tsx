import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
  secondary: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
};

type BaseButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

type NativeAnchorProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "type"
>;

type ButtonAsLinkProps = BaseButtonProps &
  NativeAnchorProps & {
    href: string;
    type?: never;
  };

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
>;

type ButtonAsButtonProps = BaseButtonProps &
  NativeButtonProps & {
    href?: never;
    type?: "button" | "submit" | "reset";
  };

export type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

function getButtonClasses(className?: string, variant: ButtonVariant = "primary") {
  const classes = [
    "inline-flex h-10 items-center justify-center rounded border px-4 text-sm font-medium transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return classes;
}

function isLinkButton(props: ButtonProps): props is ButtonAsLinkProps {
  return typeof props.href === "string";
}

export function Button(props: ButtonProps) {
  if (isLinkButton(props)) {
    const {
      children,
      className,
      href,
      variant = "primary",
      ...anchorProps
    } = props;

    return (
      <a
        className={getButtonClasses(className, variant)}
        href={href}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  const {
    children,
    className,
    type = "button",
    variant = "primary",
    ...buttonProps
  } = props;

  return (
    <button
      className={getButtonClasses(className, variant)}
      type={type}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
