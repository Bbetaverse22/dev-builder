"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { isValidElement } from "react";
import type { ComponentProps, ReactNode } from "react";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  type: string;
  state: ToolUIPart["state"] | DynamicToolUIPart["state"];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"] | DynamicToolUIPart["state"]) => {
  const labels = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "output-available": "Completed",
    "output-error": "Error",
  } as const;

  const icons = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
  } as const;

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center justify-between gap-4 p-3",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">{type}</span>
      {getStatusBadge(state)}
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: unknown;
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: unknown;
  errorText: string | undefined;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (isValidElement(output)) {
    Output = <>{output}</>;
  } else if (typeof output === "object" && output !== null) {
    if (isKnowledgeBaseResult(output)) {
      Output = <KnowledgeBaseResult {...output} />;
    } else {
      Output = (
        <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
      );
    }
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};

type KnowledgeBaseResultShape = {
  context?: string;
  sources?: Array<{
    id: string;
    title: string;
    url?: string;
    snippet?: string;
  }>;
};

const isKnowledgeBaseResult = (value: any): value is KnowledgeBaseResultShape => {
  return (
    typeof value === "object" &&
    value !== null &&
    (typeof value.context === "string" || Array.isArray(value.sources))
  );
};

const KnowledgeBaseResult = ({ context, sources }: KnowledgeBaseResultShape) => {
  const sections = (context ?? "")
    .split("\n\n---\n\n")
    .map((section) => section.trim())
    .filter(Boolean);

  // Check if this is a synthesized answer (starts with "Based on")
  const isSynthesizedAnswer = sections.length > 0 && sections[0].startsWith("Based on");

  return (
    <div className="space-y-4 text-sm">
      {sections.length > 0 && (
        <div className="space-y-3">
          <h5 className="font-medium text-muted-foreground uppercase tracking-wide text-xs">
            {isSynthesizedAnswer ? "Answer" : "Context"}
          </h5>
          <div className={cn(
            "rounded-md border p-4",
            isSynthesizedAnswer
              ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
              : "bg-muted/40"
          )}>
            {sections.map((section, index) => (
              <div key={index} className="space-y-3">
                <div className="leading-snug whitespace-pre-wrap">
                  {section}
                </div>
                {index < sections.length - 1 && (
                  <hr className="border-muted-foreground/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(sources) && sources.length > 0 && (
        <div className="space-y-3">
          <h5 className="font-medium text-muted-foreground uppercase tracking-wide text-xs">
            Sources ({sources.length})
          </h5>
          <ul className="space-y-2 rounded-md border bg-muted/30 p-3">
            {sources.map((source, index) => (
              <li key={source.id || index} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">
                      {source.title}
                    </div>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {source.url}
                      </a>
                    )}
                    {source.snippet && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                        {source.snippet.length > 150
                          ? `${source.snippet.slice(0, 150)}...`
                          : source.snippet
                        }
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
