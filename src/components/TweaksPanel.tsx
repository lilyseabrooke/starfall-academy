'use client';

import React, { useState } from 'react';
import './TweaksPanel.css';

interface TweaksPanelProps {
  headlineSize: number;
  onHeadlineSizeChange: (value: number) => void;
  shimmerEnabled: boolean;
  onShimmerChange: (value: boolean) => void;
}

export default function TweaksPanel({
  headlineSize,
  onHeadlineSizeChange,
  shimmerEnabled,
  onShimmerChange,
}: TweaksPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`twk-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="twk-hd">
        <b>Tweaks</b>
        <button
          className="twk-x"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close tweaks' : 'Open tweaks'}
        >
          {isOpen ? '✕' : '⚙'}
        </button>
      </div>

      {isOpen && (
        <div className="twk-body">
          <div className="twk-sect">Typography</div>
          <div className="twk-row">
            <div className="twk-lbl">
              <span>Headline size</span>
              <span className="twk-val">{headlineSize}%</span>
            </div>
            <input
              type="range"
              className="twk-field twk-slider"
              min="55"
              max="170"
              step="5"
              value={headlineSize}
              onChange={(e) => onHeadlineSizeChange(Number(e.target.value))}
            />
          </div>

          <div className="twk-sect">Ambience</div>
          <div className="twk-row twk-row-h">
            <label className="twk-toggle-label">
              <input
                type="checkbox"
                className="twk-toggle-input"
                checked={shimmerEnabled}
                onChange={(e) => onShimmerChange(e.target.checked)}
              />
              <span>Shimmer</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
