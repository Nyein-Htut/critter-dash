/**
 * Every critter is drawn on a 120x100 viewBox and shares the same class
 * structure — .leg.back-leg / .leg.front-leg / .tail / .critter-body —
 * so a single CSS animation system (see styles.css) can drive the run
 * cycle, tail wag, and idle bounce for all six species uniformly.
 */
const ANIMAL_LIST = [
  { key: 'fox', label: 'Fox', emoji: '🦊' },
  { key: 'rabbit', label: 'Rabbit', emoji: '🐰' },
  { key: 'panda', label: 'Panda', emoji: '🐼' },
  { key: 'turtle', label: 'Turtle', emoji: '🐢' },
  { key: 'cat', label: 'Cat', emoji: '🐱' },
  { key: 'penguin', label: 'Penguin', emoji: '🐧' },
];

const COLOR_LIST = [
  '#FF6B5C', '#FF9F45', '#FFD23F', '#8FC93A',
  '#3FBF9F', '#4FA6E8', '#7C6EF2', '#E866C2',
];

function legs() {
  return `
    <g class="leg back-leg" style="transform-origin:38px 68px">
      <rect x="34" y="66" width="8" height="20" rx="4" />
    </g>
    <g class="leg back-leg alt" style="transform-origin:52px 68px">
      <rect x="48" y="66" width="8" height="20" rx="4" />
    </g>
    <g class="leg front-leg" style="transform-origin:70px 68px">
      <rect x="66" y="66" width="8" height="20" rx="4" />
    </g>
    <g class="leg front-leg alt" style="transform-origin:84px 68px">
      <rect x="80" y="66" width="8" height="20" rx="4" />
    </g>`;
}

function svgWrap(inner) {
  return `<svg class="critter-svg" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

function fox(color) {
  return svgWrap(`
    <g class="critter-body">
      <g class="tail" style="transform-origin:30px 60px">
        <path d="M30 60 C10 50, 6 30, 20 22 C28 34, 26 48, 34 58 Z" fill="${color}" />
        <ellipse cx="16" cy="26" rx="6" ry="8" fill="#FFF8ED" />
      </g>
      ${legs()}
      <ellipse cx="62" cy="58" rx="34" ry="20" fill="${color}" />
      <path d="M78 30 L70 46 L88 44 Z" fill="${color}" />
      <path d="M96 32 L92 46 L104 42 Z" fill="${color}" />
      <circle cx="90" cy="50" r="16" fill="${color}" />
      <path d="M90 56 C86 62, 94 64, 98 58 Z" fill="#FFF8ED" />
      <circle cx="83" cy="46" r="2.6" fill="#2B2B2B" />
      <circle cx="97" cy="45" r="2.6" fill="#2B2B2B" />
      <circle cx="99" cy="54" r="2.2" fill="#2B2B2B" />
    </g>`);
}

function rabbit(color) {
  return svgWrap(`
    <g class="critter-body">
      <g class="tail" style="transform-origin:32px 62px">
        <circle cx="28" cy="60" r="9" fill="#FFF8ED" />
      </g>
      ${legs()}
      <ellipse cx="62" cy="58" rx="32" ry="20" fill="${color}" />
      <g class="ear-flop" style="transform-origin:88px 40px">
        <path d="M82 40 C78 18, 86 4, 92 6 C96 22, 92 36, 90 44 Z" fill="${color}" />
        <path d="M85 36 C83 22, 88 12, 90 12 C92 22, 90 32, 89 38 Z" fill="#FFC9D6" />
      </g>
      <g class="ear-flop alt" style="transform-origin:100px 40px">
        <path d="M96 40 C98 16, 108 4, 113 8 C113 24, 106 36, 102 44 Z" fill="${color}" />
        <path d="M99 36 C101 22, 106 12, 108 12 C108 22, 104 32, 102 38 Z" fill="#FFC9D6" />
      </g>
      <circle cx="92" cy="52" r="15" fill="${color}" />
      <circle cx="85" cy="50" r="2.4" fill="#2B2B2B" />
      <circle cx="98" cy="49" r="2.4" fill="#2B2B2B" />
      <circle cx="93" cy="56" r="2" fill="#E8798C" />
    </g>`);
}

function panda(color) {
  return svgWrap(`
    <g class="critter-body">
      ${legs()}
      <ellipse cx="62" cy="58" rx="34" ry="20" fill="#FFF8ED" stroke="${color}" stroke-width="3" />
      <circle cx="78" cy="34" r="8" fill="${color}" />
      <circle cx="102" cy="34" r="8" fill="${color}" />
      <circle cx="90" cy="50" r="17" fill="#FFF8ED" stroke="${color}" stroke-width="2" />
      <ellipse cx="83" cy="49" rx="5" ry="6.5" fill="${color}" />
      <ellipse cx="98" cy="49" rx="5" ry="6.5" fill="${color}" />
      <circle cx="83" cy="49" r="1.8" fill="#FFF8ED" />
      <circle cx="98" cy="49" r="1.8" fill="#FFF8ED" />
      <circle cx="91" cy="57" r="2" fill="#2B2B2B" />
    </g>`);
}

function turtle(color) {
  return svgWrap(`
    <g class="critter-body">
      <g class="leg back-leg" style="transform-origin:40px 70px"><rect x="36" y="68" width="8" height="14" rx="4" fill="#3FA35A"/></g>
      <g class="leg back-leg alt" style="transform-origin:52px 70px"><rect x="48" y="68" width="8" height="14" rx="4" fill="#3FA35A"/></g>
      <g class="leg front-leg" style="transform-origin:68px 70px"><rect x="64" y="68" width="8" height="14" rx="4" fill="#3FA35A"/></g>
      <g class="leg front-leg alt" style="transform-origin:80px 70px"><rect x="76" y="68" width="8" height="14" rx="4" fill="#3FA35A"/></g>
      <ellipse cx="58" cy="56" rx="30" ry="19" fill="${color}" />
      <ellipse cx="58" cy="56" rx="22" ry="13" fill="#ffffff33" />
      <circle cx="96" cy="52" r="12" fill="#3FA35A" />
      <circle cx="101" cy="49" r="2.2" fill="#2B2B2B" />
      <path d="M104 54 C107 55, 107 58, 104 58 Z" fill="#2B7A44" />
    </g>`);
}

function cat(color) {
  return svgWrap(`
    <g class="critter-body">
      <g class="tail" style="transform-origin:28px 56px">
        <path d="M28 56 C10 52, 8 34, 22 26" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" />
      </g>
      ${legs()}
      <ellipse cx="62" cy="58" rx="32" ry="19" fill="${color}" />
      <path d="M78 32 L72 44 L86 44 Z" fill="${color}" />
      <path d="M100 32 L94 44 L108 44 Z" fill="${color}" />
      <circle cx="92" cy="50" r="15" fill="${color}" />
      <circle cx="85" cy="49" r="2.4" fill="#2B2B2B" />
      <circle cx="98" cy="49" r="2.4" fill="#2B2B2B" />
      <path d="M91 55 L93 55 L92 57 Z" fill="#E8798C" />
      <path d="M70 56 L82 54 M70 60 L82 58" stroke="#2B2B2B" stroke-width="1" opacity="0.5" />
      <path d="M114 56 L102 54 M114 60 L102 58" stroke="#2B2B2B" stroke-width="1" opacity="0.5" />
    </g>`);
}

function penguin(color) {
  return svgWrap(`
    <g class="critter-body">
      <g class="leg back-leg" style="transform-origin:52px 74px"><rect x="48" y="72" width="9" height="10" rx="3" fill="#FFB03F"/></g>
      <g class="leg front-leg alt" style="transform-origin:74px 74px"><rect x="70" y="72" width="9" height="10" rx="3" fill="#FFB03F"/></g>
      <g class="tail" style="transform-origin:76px 46px">
        <path d="M62 30 C58 40, 58 60, 68 70 C86 70, 96 56, 92 38 C88 26, 72 20, 62 30 Z" fill="${color}" />
      </g>
      <ellipse cx="80" cy="52" rx="20" ry="24" fill="#FFF8ED" />
      <circle cx="76" cy="34" r="4" fill="#FFF8ED" />
      <path d="M60 40 L48 44 L60 48 Z" fill="${color}" />
      <path d="M100 40 L112 44 L100 48 Z" fill="${color}" />
      <path d="M78 40 L86 40 L82 46 Z" fill="#FFB03F" />
      <circle cx="75" cy="34" r="2" fill="#2B2B2B" />
      <circle cx="83" cy="34" r="2" fill="#2B2B2B" />
    </g>`);
}

const BUILDERS = { fox, rabbit, panda, turtle, cat, penguin };

function getAnimalSVG(species, color) {
  const builder = BUILDERS[species] || fox;
  return builder(color || '#FF6B5C');
}

function getAnimalEmoji(species) {
  const found = ANIMAL_LIST.find(a => a.key === species);
  return found ? found.emoji : '🐾';
}
