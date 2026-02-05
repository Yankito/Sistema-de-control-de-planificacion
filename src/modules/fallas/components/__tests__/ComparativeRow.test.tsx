// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparativeRow } from '../ComparativeRow';

// Mock de datos
const mockItem = {
  label: 'MOTOR_A',
  count: 10,      // Actual
  prevCount: 5,   // Anterior
  gasto: 1000,
  prevGasto: 1200,
};

describe('ComparativeRow Component', () => {
  const formatFn = (v: number) => `${v}`;
  const onClick = vi.fn();

  it('debería renderizar datos básicos correctamente', () => {
    render(
      <ComparativeRow 
        item={mockItem}
        maxValGlobal={20}
        formatFn={formatFn}
        type="FREQ"
        onClick={onClick}
        active={false}
        showComparison={false}
        anioFiltro={2026}
      />
    );

    expect(screen.getByText('MOTOR_A')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // Valor actual
  });

  it('debería mostrar barra ROJA si empeoró (subió frecuencia) en modo comparación', () => {
    // Frecuencia subió de 5 a 10 -> MALO -> Rojo
    render(
      <ComparativeRow 
        item={mockItem}
        maxValGlobal={20}
        formatFn={formatFn}
        type="FREQ"
        onClick={onClick}
        active={false}
        showComparison={true} // Activamos comparación
        anioFiltro={2026}
      />
    );

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.className).toContain('bg-red-500');
  });

  it('debería mostrar barra VERDE si mejoró (bajó costo) en modo comparación', () => {
    // Gasto bajó de 1200 a 1000 -> BUENO -> Verde
    render(
      <ComparativeRow 
        item={mockItem}
        maxValGlobal={2000}
        formatFn={formatFn}
        type="COST" // Tipo Costo
        onClick={onClick}
        active={false}
        showComparison={true}
        anioFiltro={2026}
      />
    );

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.className).toContain('bg-emerald-500');
  });

  it('debería usar colores estándar (no semáforo) si NO está en modo comparación', () => {
    render(
      <ComparativeRow 
        item={mockItem}
        maxValGlobal={20}
        formatFn={formatFn}
        type="FREQ"
        onClick={onClick}
        active={false}
        showComparison={false} // Desactivado
        anioFiltro={2026}
      />
    );

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar.className).toContain('bg-blue-600'); // Azul por defecto para FREQ
  });
});