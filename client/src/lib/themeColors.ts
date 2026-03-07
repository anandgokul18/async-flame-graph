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
  bg: '#FFFFFF',
  bgPanel: '#F6F8FA',
  bgHover: '#F3F4F6',
  bgActive: '#E5E7EB',
  bgOverlay: 'rgba(255, 255, 255, 0.9)',

  border: '#D0D7DE',
  borderSubtle: '#E5E7EB',

  text: '#1F2328',
  textSecondary: '#57606A',
  textMuted: '#6E7781',
  textDimmed: '#8C959F',

  accent: '#0078D4',
  accentDim: 'rgba(0, 120, 212, 0.7)',
  accentBg: 'rgba(0, 120, 212, 0.08)',
  accentBorder: 'rgba(0, 120, 212, 0.25)',

  amber: '#D97706',
  amberBg: 'rgba(217, 119, 6, 0.08)',
  amberBorder: 'rgba(217, 119, 6, 0.2)',

  canvasBg: '#FFFFFF',
  canvasBarBorder: 'rgba(0, 0, 0, 0.12)',
  canvasBarText: '#1F2328',
  canvasTimelineText: '#57606A',
  canvasGridLine: '#E5E7EB',
  canvasAsyncBar: 'rgba(0, 120, 212, 0.6)',

  scrollbarTrack: 'rgba(246, 248, 250, 0.95)',
  scrollbarThumb: 'rgba(0, 120, 212, 0.35)',
  scrollbarThumbHover: 'rgba(0, 120, 212, 0.55)',
  scrollbarThumbActive: 'rgba(0, 120, 212, 0.7)',
  scrollbarThumbBorder: 'rgba(0, 120, 212, 0.2)',
  scrollbarGrip: 'rgba(255, 255, 255, 0.5)',
  scrollbarGripHover: 'rgba(255, 255, 255, 0.7)',

  selectionBorder: 'rgba(0, 120, 212, 0.8)',
  selectionFill: 'rgba(0, 120, 212, 0.08)',
  selectionOverlay: 'rgba(255, 255, 255, 0.5)',
  selectionText: 'rgba(0, 120, 212, 0.9)',

  badgeBg: 'rgba(0, 120, 212, 0.85)',
  badgeText: '#FFFFFF',
  badgeBorder: 'rgba(0, 120, 212, 0.3)',

  searchMatchBorder: 'rgba(202, 138, 4, 0.8)',
  hoverBorder: 'rgba(0, 120, 212, 0.7)',

  successBg: 'rgba(34, 197, 94, 0.1)',
  successBorder: 'rgba(34, 197, 94, 0.25)',
  successText: '#16a34a',
};

export function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
