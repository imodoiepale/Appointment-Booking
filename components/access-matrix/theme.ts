// Visual theme for the access-matrix kit — the ONLY file that differs between apps.
// This copy: BCL Registry's User Rights look (compact text-xs, primary header).

export const theme = {
  button:
    "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium shadow-none transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
  buttonDefault: "border-border bg-card text-foreground hover:bg-muted",
  buttonPrimary: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  buttonDanger: "text-red-600 hover:text-red-700",
  compactButton: "h-7",

  input:
    "h-8 w-full rounded-md border border-border bg-card pl-8 pr-7 text-xs shadow-none outline-none focus-visible:ring-1 focus-visible:ring-ring",
  inputIcon: "left-2.5 h-3.5 w-3.5",
  searchWidth: "max-w-xs",

  tabList: "inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-muted p-1 shadow-sm",
  tab: "inline-flex h-full items-center gap-1.5 rounded-md px-3.5 text-sm font-semibold transition-colors",
  tabActive: "bg-primary text-primary-foreground shadow-md",
  tabInactive: "text-muted-foreground hover:text-foreground",
  tabCountInBrackets: true,
  tabCount: "text-xs font-semibold tabular-nums opacity-70",
  subTabList: "inline-flex h-8 items-center gap-0.5 rounded-lg bg-muted p-0.5",
  subTab: "inline-flex h-full items-center gap-1.5 rounded-md px-3 text-xs transition-colors",
  subTabActive: "bg-card text-foreground shadow-sm",

  pickerButton:
    "inline-flex h-8 w-72 items-center justify-between rounded-md border border-border bg-card px-3 text-xs text-foreground hover:bg-muted",
  pickerItem: "text-sm",

  tableWrap: "flex h-full min-h-[500px] max-h-[95vh] flex-col overflow-hidden bg-card shadow-sm",
  toolbar: "flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2",
  th: "select-none border-r border-primary-foreground/20 bg-primary px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground last:border-r-0",
  thGroup:
    "border-b border-r-2 border-primary-foreground/20 bg-primary px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-primary-foreground",
  controlsCell: "border-b border-r border-border bg-muted px-3 py-1.5 text-xs last:border-r-0",
  td: "border-b border-r border-border px-3 py-1.5 text-xs text-foreground last:border-r-0",
  rowEven: "bg-card",
  rowOdd: "bg-muted",
  sectionLabel: "font-semibold",
  sectionDetail: "text-[11px] text-muted-foreground",
  empty: "px-4 py-16 text-center text-xs text-muted-foreground",

  footer: "flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-2",
  footerText: "text-xs font-medium text-muted-foreground",
  footerStrong: "text-foreground",
  footerSelect:
    "h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary",
  pageButton: "min-w-[32px] justify-center px-2.5",
  pageArrow: "w-8 justify-center px-0",

  checkbox: "h-4 w-4 cursor-pointer rounded accent-primary disabled:cursor-not-allowed disabled:opacity-50",
  hint: "text-sm text-muted-foreground",
  hintStrong: "font-semibold text-foreground",
};
