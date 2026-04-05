"use client";

import {
  TrendingUp,
  Zap,
  Moon,
  Scale,
  AlertTriangle,
  Calendar,
  Target,
  Activity,
  Heart,
  ClipboardList,
  Lightbulb,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

interface Section {
  number: number;
  title: string;
  subtitle?: string;
  content: string;
}

interface Theme {
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

const THEMES: { keywords: string[]; theme: Theme }[] = [
  {
    keywords: ["critique", "risque", "blessure", "surveillance", "danger", "alerte"],
    theme: { icon: AlertTriangle, text: "text-red-700", bg: "bg-red-50", border: "border-l-red-400", dot: "bg-red-400" },
  },
  {
    keywords: ["charge", "volume"],
    theme: { icon: TrendingUp, text: "text-blue-700", bg: "bg-blue-50", border: "border-l-blue-400", dot: "bg-blue-400" },
  },
  {
    keywords: ["performance", "allure", "vo2"],
    theme: { icon: Zap, text: "text-emerald-700", bg: "bg-emerald-50", border: "border-l-emerald-400", dot: "bg-emerald-400" },
  },
  {
    keywords: ["récupération", "sommeil", "repos"],
    theme: { icon: Moon, text: "text-amber-700", bg: "bg-amber-50", border: "border-l-amber-400", dot: "bg-amber-400" },
  },
  {
    keywords: ["poids", "nutrition", "alimentation"],
    theme: { icon: Scale, text: "text-violet-700", bg: "bg-violet-50", border: "border-l-violet-400", dot: "bg-violet-400" },
  },
  {
    keywords: ["plan", "adhérence", "programme"],
    theme: { icon: Calendar, text: "text-indigo-700", bg: "bg-indigo-50", border: "border-l-indigo-400", dot: "bg-indigo-400" },
  },
  {
    keywords: ["recommandation", "semaine", "prochain"],
    theme: { icon: Lightbulb, text: "text-teal-700", bg: "bg-teal-50", border: "border-l-teal-400", dot: "bg-teal-400" },
  },
  {
    keywords: ["résumé", "global"],
    theme: { icon: ClipboardList, text: "text-slate-700", bg: "bg-slate-50", border: "border-l-slate-400", dot: "bg-slate-400" },
  },
  {
    keywords: ["split", "régularité"],
    theme: { icon: BarChart3, text: "text-cyan-700", bg: "bg-cyan-50", border: "border-l-cyan-400", dot: "bg-cyan-400" },
  },
  {
    keywords: ["cardiaque", "fréquence", "fc", "zone"],
    theme: { icon: Heart, text: "text-rose-700", bg: "bg-rose-50", border: "border-l-rose-400", dot: "bg-rose-400" },
  },
  {
    keywords: ["dynamique", "cadence", "foulée"],
    theme: { icon: Activity, text: "text-teal-700", bg: "bg-teal-50", border: "border-l-teal-400", dot: "bg-teal-400" },
  },
  {
    keywords: ["training effect", "effet"],
    theme: { icon: Target, text: "text-orange-700", bg: "bg-orange-50", border: "border-l-orange-400", dot: "bg-orange-400" },
  },
  {
    keywords: ["améliorer", "conseil", "point"],
    theme: { icon: Lightbulb, text: "text-yellow-700", bg: "bg-yellow-50", border: "border-l-yellow-400", dot: "bg-yellow-400" },
  },
  {
    keywords: ["comparaison", "positionnement"],
    theme: { icon: BarChart3, text: "text-purple-700", bg: "bg-purple-50", border: "border-l-purple-400", dot: "bg-purple-400" },
  },
];

const FALLBACK_THEMES: Theme[] = [
  { icon: ClipboardList, text: "text-blue-700", bg: "bg-blue-50", border: "border-l-blue-400", dot: "bg-blue-400" },
  { icon: Zap, text: "text-emerald-700", bg: "bg-emerald-50", border: "border-l-emerald-400", dot: "bg-emerald-400" },
  { icon: Target, text: "text-violet-700", bg: "bg-violet-50", border: "border-l-violet-400", dot: "bg-violet-400" },
  { icon: Heart, text: "text-amber-700", bg: "bg-amber-50", border: "border-l-amber-400", dot: "bg-amber-400" },
  { icon: TrendingUp, text: "text-rose-700", bg: "bg-rose-50", border: "border-l-rose-400", dot: "bg-rose-400" },
  { icon: Calendar, text: "text-indigo-700", bg: "bg-indigo-50", border: "border-l-indigo-400", dot: "bg-indigo-400" },
  { icon: Activity, text: "text-teal-700", bg: "bg-teal-50", border: "border-l-teal-400", dot: "bg-teal-400" },
];

function getTheme(title: string, subtitle: string | undefined, index: number): Theme {
  const searchStr = (title + " " + (subtitle || "")).toLowerCase();
  const found = THEMES.find((t) => t.keywords.some((k) => searchStr.includes(k)));
  return found?.theme ?? FALLBACK_THEMES[index % FALLBACK_THEMES.length];
}

// --- Parsing ---

function parseSections(text: string): { intro: string; sections: Section[] } {
  // Normalize: split inline bullet items (mid-sentence) onto their own lines
  let normalized = text
    .replace(/([.!?…)»"])\s+\*\s+\*\*/g, "$1\n* **")
    .replace(/([.!?…)»"])\s+\*\s+(?=[A-ZÉÀÈÙÂÊÎÔÛÇ])/g, "$1\n* ");

  const lines = normalized.split("\n");
  let intro = "";
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    // Match numbered headings: "## 1. Title", "1. **Title**", "### 1. Title", "1. Title"
    const match = line.match(/^#{0,3}\s*(\d+)\.\s+(.+)/);

    if (match) {
      if (currentSection) {
        currentSection.content = buffer.join("\n").trim();
        sections.push(currentSection);
      }
      buffer = [];

      const num = parseInt(match[1]);
      const titleFull = match[2].replace(/\*\*/g, "").trim();

      let title = titleFull;
      let subtitle: string | undefined;
      const colonIdx = titleFull.indexOf(":");
      if (colonIdx > 0 && colonIdx < titleFull.length - 1) {
        title = titleFull.slice(0, colonIdx).trim();
        subtitle = titleFull.slice(colonIdx + 1).trim();
      }

      currentSection = { number: num, title, subtitle, content: "" };
    } else if (currentSection) {
      buffer.push(line);
    } else {
      intro += line + "\n";
    }
  }

  if (currentSection) {
    currentSection.content = buffer.join("\n").trim();
    sections.push(currentSection);
  }

  // Merge sub-items back into parent section when numbering restarts
  // e.g. sections [1,2,3,4,5,6,7, 1,2,3, 8] → sub-items 1,2,3 merge into section 7
  const merged: Section[] = [];
  for (let i = 0; i < sections.length; i++) {
    const prev = merged[merged.length - 1];
    if (prev && sections[i].number <= prev.number) {
      // This is a sub-item: convert to bullet in parent content
      const subTitle = sections[i].title;
      const subDesc = sections[i].subtitle || sections[i].content;
      const extra = sections[i].subtitle ? sections[i].content : "";
      prev.content += `\n* **${subTitle}** : ${subDesc}`;
      if (extra) prev.content += `\n${extra}`;
    } else {
      merged.push(sections[i]);
    }
  }

  return { intro: intro.trim(), sections: merged };
}

// --- Markdown to HTML ---

function formatContent(text: string): string {
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map((para) => {
      // Process bold
      let processed = para.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>'
      );

      const lines = processed.split("\n");
      const parts: string[] = [];
      let textLines: string[] = [];

      for (const line of lines) {
        const bulletMatch = line.match(/^[*-]\s+(.*)/);
        if (bulletMatch) {
          // Flush accumulated text as a paragraph
          if (textLines.length > 0) {
            parts.push(
              `<p class="mb-3 leading-relaxed text-[var(--text-secondary)]">${textLines.join(" ")}</p>`
            );
            textLines = [];
          }
          parts.push(
            `<div class="flex gap-2.5 items-start py-1.5"><span class="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] flex-shrink-0"></span><span class="text-[var(--text-secondary)] leading-relaxed">${bulletMatch[1]}</span></div>`
          );
        } else if (line.trim()) {
          textLines.push(line.trim());
        }
      }

      if (textLines.length > 0) {
        parts.push(
          `<p class="mb-3 leading-relaxed text-[var(--text-secondary)]">${textLines.join(" ")}</p>`
        );
      }

      return parts.join("");
    })
    .join("");
}

// --- Component ---

export default function MarkdownContent({ content }: { content: string }) {
  const { intro, sections } = parseSections(content);

  // Fallback: no sections detected, render as plain formatted markdown
  if (sections.length === 0) {
    return (
      <div
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {intro && (
        <div
          className="rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 px-6 py-4"
          dangerouslySetInnerHTML={{ __html: formatContent(intro) }}
        />
      )}

      {sections.map((section, i) => {
        const theme = getTheme(section.title, section.subtitle, i);
        const Icon = theme.icon;

        return (
          <div
            key={`${i}-${section.number}`}
            className={`rounded-xl border-l-4 ${theme.border} bg-[var(--bg-surface)] shadow-sm overflow-hidden`}
          >
            {/* Section header */}
            <div className={`${theme.bg} px-5 py-3`}>
              <div className="flex items-center gap-2.5">
                <Icon className={`h-5 w-5 ${theme.text} flex-shrink-0`} />
                <h3 className={`font-semibold ${theme.text}`}>
                  {section.title}
                </h3>
              </div>
            </div>

            {/* Section content */}
            {(section.subtitle || section.content) && (
              <div className="px-5 py-4">
                {section.subtitle && (
                  <p className="mb-2 text-[var(--text-secondary)] leading-relaxed">{section.subtitle}</p>
                )}
                {section.content && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatContent(section.content),
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
