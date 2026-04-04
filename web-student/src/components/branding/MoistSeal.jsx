/**
 * MoistSeal – renders the MOIST, INC. institutional seal.
 *
 * How to use the real logo image:
 *   1. Save the circular seal PNG (transparent background) to:
 *        web-admin/public/moist-seal.png
 *   2. Save the full horizontal banner PNG to:
 *        web-admin/public/moist-banner.png
 *   The component will automatically use the real image once you place it there.
 *   Remove or rename the PNG to fall back to the built-in SVG.
 */

// Set to true once you've placed the real PNG in /public/
const USE_REAL_IMAGE = true;

export default function MoistSeal({ size = 72, className = '' }) {
  if (USE_REAL_IMAGE) {
    return (
      <img
        src="/moist-seal.png"
        alt="MOIST, INC. Seal"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain', display: 'inline-block' }}
      />
    );
  }

  // Fallback SVG (used only if USE_REAL_IMAGE = false)
  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={className}
      aria-label="MOIST seal"
      role="img"
    >
      <defs>
        <path id="seal-top-text" d="M 28 80 A 52 52 0 1 1 132 80" />
        <path id="seal-bottom-text" d="M 132 80 A 52 52 0 1 1 28 80" />
      </defs>
      <g>
        <circle cx="80" cy="80" r="76" fill="#f6c445" />
        <circle cx="80" cy="80" r="65" fill="#7a1324" />
        <circle cx="80" cy="80" r="57" fill="#fffaf0" />
        <circle cx="80" cy="80" r="43" fill="#f6c445" />
        <path d="M80 37 L118 58 L80 79 L42 58 Z" fill="#f3c61b" stroke="#7a1324" strokeWidth="3" />
        <path d="M42 58 L80 79 L80 122 L42 101 Z" fill="#8e1730" stroke="#7a1324" strokeWidth="3" />
        <path d="M118 58 L80 79 L80 122 L118 101 Z" fill="#ffffff" stroke="#7a1324" strokeWidth="3" />
        <circle cx="80" cy="79" r="10" fill="#7a1324" />
        <path d="M66 113 C72 102, 88 102, 94 113 C86 121, 74 121, 66 113 Z" fill="#f3c61b" stroke="#7a1324" strokeWidth="2.5" />
        <text x="80" y="116" textAnchor="middle" fontSize="12" fontWeight="800" fill="#7a1324">2002</text>
        <text fill="#7a1324" fontSize="8" fontWeight="800" letterSpacing="1.2">
          <textPath href="#seal-top-text" startOffset="50%" textAnchor="middle">
            MISAMIS ORIENTAL INSTITUTE OF SCIENCE AND TECHNOLOGY
          </textPath>
        </text>
        <text fill="#7a1324" fontSize="8" fontWeight="800" letterSpacing="1.4">
          <textPath href="#seal-bottom-text" startOffset="50%" textAnchor="middle">
            BALINGASAG, MISAMIS ORIENTAL
          </textPath>
        </text>
      </g>
    </svg>
  );
}
