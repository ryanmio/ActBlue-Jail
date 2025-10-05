"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean
    payload?: unknown[]
    label?: unknown
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    labelFormatter?: (label: unknown, payload: unknown) => React.ReactNode
    labelClassName?: string
    formatter?: (value: unknown, name: unknown, item: unknown, index: number, payload: unknown) => React.ReactNode
    color?: string
    nameKey?: string
    labelKey?: string
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const rec = item as Record<string, unknown>
      const key = `${labelKey || rec.dataKey || rec.name || "value"}`
      const itemConfig = config[key as keyof typeof config]
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item: unknown, index: number) => {
            const rec = item as Record<string, unknown>
            const key = `${nameKey || (rec.name as string | undefined) || (rec.dataKey as string | undefined) || "value"}`
            const itemConfig = config[key as keyof typeof config]
            const indicatorColor =
              color || ((rec.payload as { fill?: string } | undefined)?.fill) || (rec.color as string | undefined)

            return (
              <div
                key={String(rec.dataKey ?? key)}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-slate-500",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && rec?.value !== undefined && rec.name ? (
                  formatter(rec.value, rec.name, rec, index, rec.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : indicator === "line" ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12h6l3-8 4 16 3-8h4" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="text-slate-500">
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                    )}
                    <div className="grid auto-cols-[max-content] grid-flow-col gap-2">
                      <span className="text-slate-600">
                        {itemConfig?.label || (rec.name as string | number | undefined) || "Value"}
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {String(rec.value ?? "0")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: unknown[]
    verticalAlign?: "top" | "bottom"
    hideIcon?: boolean
    nameKey?: string
  }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item: unknown) => {
          const rec = item as Record<string, unknown>
          const key = `${nameKey || (rec.dataKey as string | undefined) || "value"}`
          const itemConfig = config[key as keyof typeof config]

          return (
            <div
              key={String(rec.value)}
              className={cn(
                "flex items-center gap-1.5",
                hideIcon && "-ml-3"
              )}
            >
              {!hideIcon && (
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: (itemConfig as { color?: string } | undefined)?.color }} />
              )}
              <span className="text-[0.8125rem] text-slate-600">
                {itemConfig?.label || (rec.value as string | number | undefined)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
