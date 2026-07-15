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
  "flex shrink-0 flex-col-reverse items-stretch gap-2 border-t border-border bg-muted/40 px-4 pt-4 pb-5 sm:flex-row sm:flex-row-reverse sm:items-center sm:gap-3 sm:px-6 sm:pb-6"
export const formModalFooterButtonClassName = "h-10 w-full min-w-0 rounded-md px-5 sm:w-auto sm:min-w-[96px]"

/** Lead detail page typography scale */
export const leadDetailPageTitleClassName =
  "text-xl lg:text-2xl font-bold text-foreground tracking-tight"
export const leadDetailSectionTitleClassName = "text-base font-semibold text-foreground"
export const leadDetailSubsectionLabelClassName =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
export const leadDetailFieldLabelClassName = "text-xs font-medium text-muted-foreground"
export const leadDetailFieldValueClassName = "text-sm font-medium text-foreground"
/** Sidebar detail fields (Current Staying, Customer Type, etc.) */
export const leadDetailSidebarFieldLabelClassName =
  "text-sm font-extrabold text-primary"
export const leadDetailSidebarFieldValueClassName =
  "text-base font-normal text-foreground"
export const leadDetailSidebarInputClassName = "h-10 text-base font-normal text-foreground"
export const leadDetailMetaTextClassName = "text-sm text-muted-foreground"
export const leadDetailMetaLabelClassName = "text-sm font-medium text-muted-foreground"
export const leadDetailCaptionClassName = "text-xs text-muted-foreground"
export const leadDetailBodyClassName = "text-sm text-foreground/90"
export const leadDetailBodyMutedClassName = "text-sm text-muted-foreground"
export const leadDetailInlineFieldClassName = "h-9 text-sm"

/** Detail page layout & surfaces (theme-aware for light + Dark Night) */
export const leadDetailPageBackgroundClassName = "bg-background"
export const leadDetailContentAreaClassName = "bg-background"
export const leadDetailCardClassName =
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
export const leadDetailHeaderClassName = "bg-card border-b border-border"
export const leadDetailTabBarClassName = "border-b border-border bg-card"
export const leadDetailIconBoxClassName =
  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
export const leadDetailIconBoxSmClassName =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-sm"
export const leadDetailListItemClassName =
  "flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5"
export const leadDetailDashedEmptyClassName =
  "rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground"
export const leadDetailDividerClassName = "border-b border-border"
export const leadDetailTimelineLineClassName = "bg-border"
export const leadDetailActivityCardClassName =
  "rounded-xl border border-border bg-card p-4 flex-1 shadow-sm"
export const leadDetailActionButtonClassName =
  "h-8 w-8 rounded-full border-border bg-card hover:bg-muted"
export const leadDetailPopoverClassName =
  "rounded-lg border border-border bg-popover p-3 shadow-lg"
export const leadDetailMetricBoxClassName = "border-border bg-muted/50 hover:bg-muted"
export const leadDetailStatCardClassName =
  "rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
export const leadDetailTableWrapClassName =
  "overflow-auto rounded-lg border border-border bg-card"
export const leadDetailTableHeaderRowClassName = "bg-muted/80 hover:bg-muted/80"
export const leadDetailTableRowClassName = "even:bg-muted/40 hover:bg-muted/50"
export const leadDetailInputClassName =
  "border-border bg-background hover:bg-muted/50"
export const leadDetailContactRowClassName =
  "flex items-start gap-3 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0"

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
