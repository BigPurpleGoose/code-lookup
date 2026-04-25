import tokens from './tokens.json';

export const syntaxColors = tokens.color.syntax;
export const uiColors = tokens.color.ui;
export const fonts = tokens.font;
export const spacing = tokens.spacing;

export const tokenLabels: Record<string, string> = {
  'color-syntax-primary':   'Primary',
  'color-syntax-secondary': 'Secondary',
  'color-syntax-accent':    'Accent',
  'color-syntax-muted':     'Muted',
  'color-syntax-value':     'Value',
};
