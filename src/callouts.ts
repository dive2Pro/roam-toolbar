export type CalloutDef = {
  type: string;
  label?: string;
  color?: string;
  icon?: string;
  iconName?: string;
};

export const BUILTIN_CALLOUTS: CalloutDef[] = [
  { type: "note", label: "Note", iconName: "edit", color: "#2d72d2" },
  { type: "summary", label: "Summary", iconName: "book", color: "#2d72d2" },
  { type: "info", label: "Info", iconName: "info-sign", color: "#2d72d2" },
  { type: "tip", label: "Tip", iconName: "lightbulb", color: "#00a396" },
  { type: "success", label: "Success", iconName: "tick-circle", color: "#238551" },
  { type: "question", label: "Question", iconName: "help", color: "#2d72d2" },
  { type: "warning", label: "Warning", iconName: "warning-sign", color: "#c87619" },
  { type: "failure", label: "Failure", iconName: "cross", color: "#cd4246" },
  { type: "danger", label: "Danger", iconName: "error", color: "#cd4246" },
  { type: "bug", label: "Bug", iconName: "virus", color: "#cd4246" },
  { type: "example", label: "Example", iconName: "list", color: "#7961db" },
  { type: "quote", label: "Quote", iconName: "citation", color: "#5f6b7c" },
];

export const DEFAULT_CALLOUT_CONFIG = [
  "recipe|#f778ba|🍳",
  "tip|#1f883d|💡",
  "example|#0969da|📘",
].join(", ");

const STYLE_ID = "roam-toolbar-custom-callouts";
const TYPE_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/;
const CALLOUT_PREFIX = /^>\s*\[!([a-zA-Z][a-zA-Z0-9_-]*)\]\s*/;

let activeCallouts: CalloutDef[] = [];

type CalloutApi = {
  addType?: (args: { type: string }) => void;
  removeType?: (args: { type: string }) => void;
};

function getCalloutApi(): CalloutApi | undefined {
  const roamApi = (window as any).roamAlphaAPI;
  return roamApi?.ui?.callout;
}

function isSafeColor(value: string) {
  return COLOR_RE.test(value);
}

function trimIcon(icon: string) {
  return Array.from(icon).slice(0, 2).join("");
}

function escapeCssContent(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\n\r]/g, "")
    .replace(/</g, "");
}

export function parseCallouts(raw: string | null | undefined): CalloutDef[] {
  if (!raw) {
    return [];
  }
  const seen = new Set<string>();
  const callouts: CalloutDef[] = [];
  raw.split(/[\n,]/).forEach((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }
    const [typeRaw, secondRaw, thirdRaw] = trimmed
      .split("|")
      .map((part) => part.trim());
    if (!typeRaw || !TYPE_RE.test(typeRaw) || seen.has(typeRaw)) {
      return;
    }
    seen.add(typeRaw);
    let color: string | undefined;
    let icon: string | undefined;
    if (secondRaw && isSafeColor(secondRaw)) {
      color = secondRaw;
      icon = thirdRaw ? trimIcon(thirdRaw) : undefined;
    } else if (secondRaw && !thirdRaw) {
      icon = trimIcon(secondRaw);
    } else if (thirdRaw) {
      icon = trimIcon(thirdRaw);
    }
    callouts.push({ type: typeRaw, color, icon });
  });
  return callouts;
}

export function getCalloutType(source: string) {
  return source.match(CALLOUT_PREFIX)?.[1];
}

const CALLOUT_MARKUP = /^>\s*\[!([a-zA-Z][a-zA-Z0-9_-]*)\]\s*/gm;

export function hasCalloutMarkup(text: string) {
  return /^>\s*\[!([a-zA-Z][a-zA-Z0-9_-]*)\]/m.test(text);
}

export function stripCalloutMarkup(text: string) {
  return text
    .split("\n")
    .map((line) => {
      let next = line;
      let previous = "";
      while (next !== previous) {
        previous = next;
        next = next.replace(/^>\s*\[!([a-zA-Z][a-zA-Z0-9_-]*)\]\s*/, "");
      }
      return next;
    })
    .join("\n");
}

export function stripLeadingQuotes(text: string) {
  return text
    .split("\n")
    .map((line) => {
      if (/^>\s*\[!([a-zA-Z][a-zA-Z0-9_-]*)\]/.test(line)) {
        return line;
      }
      return line.replace(/^>\s*/, "");
    })
    .join("\n");
}


export function toggleCalloutString(source: string, type: string) {
  const match = source.match(CALLOUT_PREFIX);
  const withoutCallout = match ? source.slice(match[0].length) : source;
  if (match && match[1].toLowerCase() === type.toLowerCase()) {
    return withoutCallout;
  }
  const body = withoutCallout.replace(/^>\s*/, "");
  if (!body) {
    return `> [!${type}]`;
  }
  return `> [!${type}] ${body}`;
}

function renderCalloutCss(callouts: CalloutDef[]) {
  const css = callouts
    .map((callout) => {
      const rules: string[] = [];
      if (callout.color) {
        rules.push(
          `.rm-callout--${callout.type} { --callout-color: ${callout.color}; }`
        );
      }
      if (callout.icon) {
        rules.push(
          `.rm-callout--${callout.type} .rm-callout__icon::before { content: "${escapeCssContent(
            callout.icon
          )}"; font-family: initial; }`
        );
      }
      return rules.join("\n");
    })
    .filter(Boolean)
    .join("\n");
  const existing = document.getElementById(STYLE_ID);
  if (!css) {
    if (existing?.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    return;
  }
  const style = existing || document.createElement("style");
  if (!existing) {
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

function removeRegisteredCallouts() {
  const api = getCalloutApi();
  activeCallouts.forEach((callout) => {
    try {
      api?.removeType?.({ type: callout.type });
    } catch (error) {
      console.error(error);
    }
  });
  activeCallouts = [];
}

export function syncCallouts(
  raw: string | null | undefined,
  target: { callouts: CalloutDef[] }
) {
  const builtinTypes = new Set(
    BUILTIN_CALLOUTS.map((callout) => callout.type.toLowerCase())
  );
  const next = parseCallouts(raw).filter(
    (callout) => !builtinTypes.has(callout.type.toLowerCase())
  );
  removeRegisteredCallouts();
  const api = getCalloutApi();
  next.forEach((callout) => {
    try {
      api?.addType?.({ type: callout.type });
    } catch (error) {
      console.error(error);
    }
  });
  activeCallouts = next;
  target.callouts = next;
  renderCalloutCss(next);
}

export function clearCallouts() {
  removeRegisteredCallouts();
  const existing = document.getElementById(STYLE_ID);
  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}
