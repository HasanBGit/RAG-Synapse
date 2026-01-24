import React, { useState } from 'react';
import './CitationBadge.css';

const CitationBadge = ({ number, citation, onClick, onHover }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick && citation) {
      onClick(citation);
    }
  };

  const handleMouseEnter = () => {
    setShowTooltip(true);
    if (onHover) {
      onHover(citation);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const tooltipText = citation 
    ? `${citation.filename} - صفحة ${citation.page}`
    : `المصدر ${number}`;

  return (
    <span className="citation-badge-wrapper">
      <span
        className="citation-badge"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={tooltipText}
        title={tooltipText}
      >
        [{number}]
      </span>
      {showTooltip && citation && (
        <div className="citation-tooltip">
          <div className="citation-tooltip-content">
            <div className="citation-tooltip-filename">{citation.filename}</div>
            <div className="citation-tooltip-meta">
              صفحة {citation.page} • جزء {citation.chunk}
            </div>
            {citation.source?.score && (
              <div className="citation-tooltip-score">
                صلة: {(citation.source.score * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
};

export default CitationBadge;
