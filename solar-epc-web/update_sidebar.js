const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/sidebar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add useState
if (!content.includes('useState')) {
  content = content.replace('import Link', 'import { useState } from "react";\nimport Link');
}

// Add ChevronDown
if (!content.includes('ChevronDown')) {
  content = content.replace('ChevronRight,', 'ChevronRight,\n  ChevronDown,');
}

// Update navItems
const oldNavItemsStr = `  { href: "/boq-list", label: "BOQ List", icon: Package },
  { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
  { href: "/residential-quotation", label: "Residential Quotation", icon: FileSpreadsheet },
  { href: "/applications", label: "Applications", icon: FileText },`;

const newNavItemsStr = `  { href: "/boq-list", label: "BOQ List", icon: Package },
  { 
    label: "Quotations", 
    icon: FileSpreadsheet,
    subItems: [
      { href: "/quotations?type=commercial", label: "Commercial Quotation" },
      { href: "/quotations?type=industrial", label: "Industrial Quotation" },
      { href: "/residential-quotation", label: "Residential Quotation" }
    ]
  },
  { href: "/applications", label: "Applications", icon: FileText },`;

content = content.replace(oldNavItemsStr, newNavItemsStr);

// Update Sidebar component state
content = content.replace(
  'export function Sidebar({ collapsed, onToggle }: SidebarProps) {',
  'export function Sidebar({ collapsed, onToggle }: SidebarProps) {\n  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({"Quotations": true});\n\n  const toggleSubMenu = (label: string) => {\n    setExpandedMenus(prev => ({...prev, [label]: !prev[label]}));\n  };'
);

// Update rendering loop
const oldRenderLoop = `{navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-solar-ink hover:bg-solar-sand",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="h-5 w-5 text-solar-amber" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}`;

const newRenderLoop = `{navItems.map((item) => {
              const Icon = item.icon;
              if (item.subItems) {
                const isExpanded = expandedMenus[item.label];
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleSubMenu(item.label)}
                      className={clsx(
                        "w-full group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-solar-ink hover:bg-solar-sand",
                        collapsed && "justify-center"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-solar-amber" />
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                      {!collapsed && (
                        <ChevronDown 
                          className={clsx("h-4 w-4 text-solar-muted transition-transform", isExpanded && "rotate-180")} 
                        />
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <div className="mt-1 ml-9 flex flex-col gap-1 border-l border-solar-border pl-2">
                        {item.subItems.map(sub => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className="block rounded-lg px-2 py-1.5 text-xs text-solar-muted hover:bg-solar-sand hover:text-solar-ink"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href || item.label}
                  href={item.href || '#'}
                  className={clsx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-solar-ink hover:bg-solar-sand",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="h-5 w-5 text-solar-amber" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}`;

content = content.replace(oldRenderLoop, newRenderLoop);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated Sidebar.");
