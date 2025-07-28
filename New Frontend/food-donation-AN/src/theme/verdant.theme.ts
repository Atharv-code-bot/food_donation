import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

export const Verdant = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{green.50}',
      100: '{green.100}',
      200: '{green.200}',
      300: '{green.300}',
      400: '{green.400}',
      500: '{green.500}',
      600: '{green.600}',
      700: '{green.700}',
      800: '{green.800}',
      900: '{green.900}',
      950: '{green.950}'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{green.700}',
          inverseColor: '#ffffff',
          hoverColor: '{green.600}',
          activeColor: '{green.800}'
        },
        highlight: {
          background: '{green.100}',
          focusBackground: '{green.200}',
          color: '{green.900}',
          focusColor: '{green.950}'
        }
      },
      dark: {
        primary: {
          color: '{green.300}',
          inverseColor: '{green.950}',
          hoverColor: '{green.200}',
          activeColor: '{green.100}'
        },
        highlight: {
          background: 'rgba(34, 197, 94, 0.15)',    // soft green bg
          focusBackground: 'rgba(34, 197, 94, 0.25)',
          color: 'rgba(240, 255, 244, 0.87)',
          focusColor: 'rgba(240, 255, 244, 0.95)'
        }
      }
    }
  },
  tokens: {
    fontFamily: {
      base: "'Inter', sans-serif"
    },
    borderRadius: {
      container: '0.5rem',
      button: '0.375rem',
      input: '0.375rem'
    },
    ring: {
      width: '2px',
      color: '{green.400}'
    }
  }
});
