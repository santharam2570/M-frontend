/** Shared field sizing for global modal / sheet forms (matches Add Lead). */

export const formInputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export const formSelectTriggerClassName =
  "w-full justify-between text-left font-normal rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:text-left"

export const formSelectContentClassName =
  "z-[200] max-h-60 w-[var(--radix-select-trigger-width)] rounded-md border border-border bg-popover p-1 shadow-lg"

export const formSelectItemClassName =
  "cursor-pointer rounded-sm py-2.5 pl-3 pr-8 text-sm focus:bg-accent focus:text-accent-foreground"

export const formTextareaClassName =
  "min-h-[110px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export const formDatePickerButtonClassName =
  "h-10 w-full justify-start px-3 text-left font-normal bg-transparent"

export const formMultiSelectTriggerClassName =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm shadow-xs ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"

/** Shared centered popup modal form layout (Add Custom Field standard) */
export const formModalContentClassName =
  "flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[550px]"
export const formModalHeaderClassName =
  "shrink-0 space-y-1.5 border-b border-border px-6 pb-4 pt-6 pr-12 text-left"
export const formModalTitleClassName = "text-lg font-semibold tracking-tight"
export const formModalDescriptionClassName = "text-sm text-muted-foreground"
export const formModalBodyClassName = "min-h-0 flex-1 overflow-y-auto px-6 py-6"
export const formModalFieldsClassName = "space-y-5"
export const formModalFieldGroupClassName = "space-y-2"
export const formModalLabelClassName = "text-sm font-medium text-foreground"
export const formModalRequiredClassName = "text-destructive"
export const formModalFooterClassName =
  "flex shrink-0 flex-row-reverse items-center gap-3 border-t border-border bg-muted/40 px-6 pt-4 pb-6"
export const formModalFooterButtonClassName = "h-10 min-w-[96px] rounded-md px-5"

/** Lead detail page typography scale */
export const leadDetailPageTitleClassName =
  "text-xl lg:text-2xl font-bold text-slate-900 tracking-tight"
export const leadDetailSectionTitleClassName = "text-base font-semibold text-slate-900"
export const leadDetailSubsectionLabelClassName =
  "text-xs font-semibold uppercase tracking-wide text-slate-500"
export const leadDetailFieldLabelClassName = "text-xs font-medium text-slate-500"
export const leadDetailFieldValueClassName = "text-sm font-medium text-slate-900"
/** Sidebar detail fields (Current Staying, Customer Type, etc.) */
export const leadDetailSidebarFieldLabelClassName =
  "text-sm font-extrabold text-primary"
export const leadDetailSidebarFieldValueClassName =
  "text-base font-normal text-foreground"
export const leadDetailSidebarInputClassName = "h-10 text-base font-normal text-foreground"
export const leadDetailMetaTextClassName = "text-sm text-slate-500"
export const leadDetailMetaLabelClassName = "text-sm font-medium text-slate-500"
export const leadDetailCaptionClassName = "text-xs text-slate-500"
export const leadDetailBodyClassName = "text-sm text-slate-700"
export const leadDetailBodyMutedClassName = "text-sm text-slate-500"
export const leadDetailInlineFieldClassName = "h-9 text-sm"

/** Shared theme tokens for lead list, detail, and settings pages */
export const themePrimaryLinkClassName = "text-primary hover:text-primary/80 hover:underline"
export const themePrimaryLinkBoldClassName =
  "text-primary font-semibold hover:underline hover:text-primary/80"
export const themeActiveTabTriggerClassName =
  "rounded-none border-b-2 border-transparent px-4 py-3.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
export const themePrimaryBadgeClassName = "bg-primary/10 text-primary"
export const themePrimarySolidBadgeClassName =
  "bg-primary hover:bg-primary text-primary-foreground border-0"
export const themePrimaryAvatarClassName = "bg-primary/10 text-primary"
export const themeFilterCountBadgeClassName =
  "bg-primary/10 text-[10px] font-medium text-primary"
export const themeMetricPrimaryIconClassName = "text-primary bg-primary/10"
export const themeMetricPrimaryAccentClassName =
  "hover:border-primary/30 data-[active=true]:border-primary/40 data-[active=true]:bg-primary/10"
export const themePrimaryButtonSmClassName = "h-8 px-3 text-xs gap-1"
/** Fallback when API color is missing; matches :root --primary */
export const THEME_PRIMARY_COLOR = "#003399"
