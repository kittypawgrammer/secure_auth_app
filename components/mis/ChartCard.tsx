"use client";

import { ArrowLeft, ArrowLeftRight, ArrowRight, Trash2 } from "lucide-react";
import type { ParsedSheet } from "@/lib/excel/parseWorkbook";
import type { ChartConfig, ChartType } from "@/lib/charts/types";
import { ChartRenderer } from "./ChartRenderer";
import { CHART_TYPES } from "./chartTypes";

type Props = {
  config: ChartConfig;
  sheet: ParsedSheet | undefined;
  onRename: (title: string) => void;
  onType: (type: ChartType) => void;
  onFlip: () => void;
  onMove: (step: -1 | 1) => void;
  onRemove: () => void;
};

export function ChartCard({ config, sheet, onRename, onType, onFlip, onMove, onRemove }: Props) {
  const iconButton = "rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900";

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={config.title}
          onChange={(e) => onRename(e.target.value)}
          className="min-w-0 flex-1 rounded px-1 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-blue-500"
        />
        {CHART_TYPES.map(({ type, label, Icon }) => (
          <button
            key={type}
            title={label}
            onClick={() => onType(type)}
            className={`${iconButton} ${config.type === type ? "bg-blue-50 text-blue-600" : ""}`}
          >
            <Icon size={16} />
          </button>
        ))}
        <button title="Swap rows and columns" onClick={onFlip} className={iconButton}>
          <ArrowLeftRight size={16} />
        </button>
        <button title="Move left" onClick={() => onMove(-1)} className={iconButton}>
          <ArrowLeft size={16} />
        </button>
        <button title="Move right" onClick={() => onMove(1)} className={iconButton}>
          <ArrowRight size={16} />
        </button>
        <button title="Delete chart" onClick={onRemove} className={`${iconButton} hover:text-red-600`}>
          <Trash2 size={16} />
        </button>
      </div>
      {sheet ? (
        <ChartRenderer sheet={sheet} config={config} />
      ) : (
        <p className="p-4 text-sm text-gray-500">Tab “{config.sheet}” is not in the current file.</p>
      )}
    </div>
  );
}
