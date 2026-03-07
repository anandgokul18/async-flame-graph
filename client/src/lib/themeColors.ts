/**
 * Theme color definitions for both canvas rendering and DOM components.
 * 
 * The canvas cannot read CSS variables directly, so we define all colors here
 * and export them for both the canvas renderer and Tailwind classes.
 */

export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgPanel: string;
  bgHover: string;
  bgActive: string;
  bgOverlay: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textDimmed: string;

  // Accent
  accent: string;
  accentDim: string;
  accentBg: string;
  accentBorder: string;

  // Amber (scaled mode)
  amber: string;
  amberBg: string;
  amberBorder: string;

  // Canvas-specific
  canvasBg: string;
  canvasBarBorder: string;
  canvasBarText: string;
  canvasTimelineText: string;
  canvasGridLine: string;
  canvasAsyncBar: string;

  // Scrollbar
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  scrollbarThumbActive: string;
  scrollbarThumbBorder: string;
  scrollbarGrip: string;
  scrollbarGripHover: string;

  // Selection / area-zoom
  selectionBorder: string;
  selectionFill: string;
  selectionOverlay: string;
  selectionText: string;

  // Badge
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;

  // Search
  searchMatchBorder: string;
  hoverBorder: string;

  // Status
  successBg: string;
  successBorder: string;
  successText: string;
}

export const darkTheme: ThemeColors = {
  bg: '#0D1117',
  bgPanel: '#161B22',
  bgHover: '#161B22',
  bgActive: '#21262D',
  bgOverlay: 'rgba(13, 17, 23, 0.85)',

  border: '#21262D',
  borderSubtle: '#30363D',

  text: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',
  textDimmed: '#484F58',

  accent: '#00D4FF',
  accentDim: 'rgba(0, 212, 255, 0.7)',
  accentBg: 'rgba(0, 212, 255, 0.1)',
  accentBorder: 'rgba(0, 212, 255, 0.3)',

  amber: '#FFB020',
  amberBg: 'rgba(255, 176, 32, 0.1)',
  amberBorder: 'rgba(255, 176, 32, 0.2)',

  canvasBg: '#0D1117',
  canvasBarBorder: 'rgba(0, 0, 0, 0.3)',
  canvasBarText: '#E6EDF3',
  canvasTimelineText: '#8B949E',
  canvasGridLine: '#30363D',
  canvasAsyncBar: 'rgba(0, 212, 255, 0.7)',

  scrollbarTrack: 'rgba(22, 27, 34, 0.95)',
  scrollbarThumb: 'rgba(0, 212, 255, 0.5)',
  scrollbarThumbHover: 'rgba(0, 212, 255, 0.7)',
  scrollbarThumbActive: 'rgba(0, 212, 255, 0.85)',
  scrollbarThumbBorder: 'rgba(0, 212, 255, 0.3)',
  scrollbarGrip: 'rgba(13, 17, 23, 0.4)',
  scrollbarGripHover: 'rgba(13, 17, 23, 0.6)',

  selectionBorder: 'rgba(0, 212, 255, 0.9)',
  selectionFill: 'rgba(0, 212, 255, 0.08)',
  selectionOverlay: 'rgba(0, 0, 0, 0.4)',
  selectionText: 'rgba(0, 212, 255, 0.9)',

  badgeBg: 'rgba(0, 212, 255, 0.9)',
  badgeText: '#0D1117',
  badgeBorder: 'rgba(0, 212, 255, 0.4)',

  searchMatchBorder: 'rgba(255, 215, 0, 0.8)',
  hoverBorder: 'rgba(0, 212, 255, 0.8)',

  successBg: 'rgba(34, 197, 94, 0.15)',
  successBorder: 'rgba(34, 197, 94, 0.3)',
  successText: '#4ade80',
};

export const lightTheme: ThemeColors = {
  // Warm grays — Manus-style, not pure white
  bg: '#F0F1F3',
  bgPanel: '#E8EAED',
  bgHover: '#E2E4E8',
  bgActive: '#D8DBE0',
  bgOverlay: 'rgba(240, 241, 243, 0.92)',

  border: '#C4C8CE',
  borderSubtle: '#D8DBE0',

  text: '#1A1D21',
  textSecondary: '#4A5058',
  textMuted: '#636B74',
  textDimmed: '#8A929B',

  accent: '#0066B8',
  accentDim: 'rgba(0, 102, 184, 0.7)',
  accentBg: 'rgba(0, 102, 184, 0.1)',
  accentBorder: 'rgba(0, 102, 184, 0.3)',

  amber: '#B45309',
  amberBg: 'rgba(180, 83, 9, 0.1)',
  amberBorder: 'rgba(180, 83, 9, 0.25)',

  canvasBg: '#F0F1F3',
  canvasBarBorder: 'rgba(0, 0, 0, 0.15)',
  canvasBarText: '#1A1D21',
  canvasTimelineText: '#4A5058',
  canvasGridLine: '#D8DBE0',
  canvasAsyncBar: 'rgba(0, 102, 184, 0.6)',

  scrollbarTrack: 'rgba(232, 234, 237, 0.95)',
  scrollbarThumb: 'rgba(0, 102, 184, 0.4)',
  scrollbarThumbHover: 'rgba(0, 102, 184, 0.6)',
  scrollbarThumbActive: 'rgba(0, 102, 184, 0.75)',
  scrollbarThumbBorder: 'rgba(0, 102, 184, 0.25)',
  scrollbarGrip: 'rgba(240, 241, 243, 0.5)',
  scrollbarGripHover: 'rgba(240, 241, 243, 0.7)',

  selectionBorder: 'rgba(0, 102, 184, 0.8)',
  selectionFill: 'rgba(0, 102, 184, 0.1)',
  selectionOverlay: 'rgba(240, 241, 243, 0.5)',
  selectionText: 'rgba(0, 102, 184, 0.9)',

  badgeBg: 'rgba(0, 102, 184, 0.85)',
  badgeText: '#FFFFFF',
  badgeBorder: 'rgba(0, 102, 184, 0.3)',

  searchMatchBorder: 'rgba(180, 83, 9, 0.8)',
  hoverBorder: 'rgba(0, 102, 184, 0.7)',

  successBg: 'rgba(22, 163, 74, 0.12)',
  successBorder: 'rgba(22, 163, 74, 0.3)',
  successText: '#15803d',
};

export function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
