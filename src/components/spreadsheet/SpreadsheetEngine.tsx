"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Cell data structure
interface CellData {
  value: string;
  formula?: string;
  computedValue?: string | number;
  type: 'text' | 'number' | 'formula' | 'date';
  validation?: {
    type: 'number' | 'text' | 'date' | 'list';
    min?: number;
    max?: number;
    options?: string[];
    required?: boolean;
  };
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
}

// Spreadsheet data structure
interface SpreadsheetData {
  [key: string]: CellData; // key format: "A1", "B2", etc.
}

// Formula evaluation context
class FormulaEngine {
  private data: SpreadsheetData;

  constructor(data: SpreadsheetData) {
    this.data = data;
  }

  // Convert column letter to number (A=1, B=2, etc.)
  private columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  }

  // Convert number to column letter
  private numberToColumn(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }

  // Parse cell reference (e.g., "A1" -> {col: 1, row: 1})
  private parseCellRef(ref: string): { col: number; row: number } {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell reference: ${ref}`);
    return {
      col: this.columnToNumber(match[1]),
      row: parseInt(match[2])
    };
  }

  // Get cell value for formula evaluation
  private getCellValue(ref: string): number {
    const cell = this.data[ref];
    if (!cell) return 0;
    
    if (cell.type === 'formula' && cell.computedValue !== undefined) {
      return typeof cell.computedValue === 'number' ? cell.computedValue : 0;
    }
    
    const numValue = parseFloat(cell.value);
    return isNaN(numValue) ? 0 : numValue;
  }

  // Evaluate basic formulas
  evaluateFormula(formula: string): number | string {
    try {
      // Remove leading = if present
      const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
      
      // Handle SUM function
      if (cleanFormula.startsWith('SUM(')) {
        const range = cleanFormula.slice(4, -1);
        return this.evaluateSum(range);
      }
      
      // Handle AVERAGE function
      if (cleanFormula.startsWith('AVERAGE(')) {
        const range = cleanFormula.slice(8, -1);
        return this.evaluateAverage(range);
      }
      
      // Handle COUNT function
      if (cleanFormula.startsWith('COUNT(')) {
        const range = cleanFormula.slice(6, -1);
        return this.evaluateCount(range);
      }
      
      // Handle simple arithmetic with cell references
      return this.evaluateArithmetic(cleanFormula);
    } catch (error) {
      return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private evaluateSum(range: string): number {
    const cells = this.parseRange(range);
    return cells.reduce((sum, cellRef) => sum + this.getCellValue(cellRef), 0);
  }

  private evaluateAverage(range: string): number {
    const cells = this.parseRange(range);
    const sum = cells.reduce((sum, cellRef) => sum + this.getCellValue(cellRef), 0);
    return cells.length > 0 ? sum / cells.length : 0;
  }

  private evaluateCount(range: string): number {
    const cells = this.parseRange(range);
    return cells.filter(cellRef => {
      const cell = this.data[cellRef];
      return cell && cell.value.trim() !== '';
    }).length;
  }

  private parseRange(range: string): string[] {
    if (range.includes(':')) {
      // Range like A1:C3
      const [start, end] = range.split(':');
      const startRef = this.parseCellRef(start);
      const endRef = this.parseCellRef(end);
      
      const cells: string[] = [];
      for (let row = startRef.row; row <= endRef.row; row++) {
        for (let col = startRef.col; col <= endRef.col; col++) {
          cells.push(`${this.numberToColumn(col)}${row}`);
        }
      }
      return cells;
    } else {
      // Single cell or comma-separated cells
      return range.split(',').map(ref => ref.trim());
    }
  }

  private evaluateArithmetic(formula: string): number {
    // Replace cell references with their values
    let processedFormula = formula;
    const cellRefRegex = /[A-Z]+\d+/g;
    const matches = formula.match(cellRefRegex);
    
    if (matches) {
      matches.forEach(ref => {
        const value = this.getCellValue(ref);
        processedFormula = processedFormula.replace(ref, value.toString());
      });
    }
    
    // Evaluate the mathematical expression
    try {
      // Simple evaluation (in production, use a proper expression parser)
      return Function(`"use strict"; return (${processedFormula})`)();
    } catch {
      throw new Error('Invalid arithmetic expression');
    }
  }
}

// Data validation functions
class DataValidator {
  static validateCell(value: string, validation?: CellData['validation']): { isValid: boolean; error?: string } {
    if (!validation) return { isValid: true };
    
    if (validation.required && (!value || value.trim() === '')) {
      return { isValid: false, error: 'This field is required' };
    }
    
    switch (validation.type) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return { isValid: false, error: 'Must be a valid number' };
        }
        if (validation.min !== undefined && num < validation.min) {
          return { isValid: false, error: `Must be at least ${validation.min}` };
        }
        if (validation.max !== undefined && num > validation.max) {
          return { isValid: false, error: `Must be at most ${validation.max}` };
        }
        break;
        
      case 'list':
        if (validation.options && !validation.options.includes(value)) {
          return { isValid: false, error: `Must be one of: ${validation.options.join(', ')}` };
        }
        break;
        
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { isValid: false, error: 'Must be a valid date' };
        }
        break;
    }
    
    return { isValid: true };
  }
}

const SpreadsheetEngine: React.FC = () => {
  const [data, setData] = useState<SpreadsheetData>({});
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [rows] = useState(20);
  const [cols] = useState(10);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate column headers (A, B, C, ...)
  const getColumnHeader = (index: number): string => {
    let result = '';
    let num = index;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  };

  // Get cell reference from row and column indices
  const getCellRef = (row: number, col: number): string => {
    return `${getColumnHeader(col)}${row + 1}`;
  };

  // Update cell data
  const updateCell = useCallback((cellRef: string, value: string) => {
    setData(prevData => {
      const newData = { ...prevData };
      const currentCell = newData[cellRef] || { value: '', type: 'text' as const };
      
      // Determine cell type
      let type: CellData['type'] = 'text';
      if (value.startsWith('=')) {
        type = 'formula';
      } else if (!isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
        type = 'number';
      }
      
      const updatedCell: CellData = {
        ...currentCell,
        value,
        type
      };
      
      // Validate the cell
      const validation = DataValidator.validateCell(value, currentCell.validation);
      if (!validation.isValid) {
        setValidationErrors(prev => ({ ...prev, [cellRef]: validation.error || '' }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[cellRef];
          return newErrors;
        });
      }
      
      newData[cellRef] = updatedCell;
      
      // Evaluate formulas
      const engine = new FormulaEngine(newData);
      Object.keys(newData).forEach(ref => {
        const cell = newData[ref];
        if (cell.type === 'formula') {
          cell.computedValue = engine.evaluateFormula(cell.value);
        }
      });
      
      return newData;
    });
  }, []);

  // Handle cell selection
  const handleCellClick = (cellRef: string) => {
    setSelectedCell(cellRef);
    const cell = data[cellRef];
    setFormulaBarValue(cell?.value || '');
  };

  // Handle formula bar change
  const handleFormulaBarChange = (value: string) => {
    setFormulaBarValue(value);
    updateCell(selectedCell, value);
  };

  // Add validation to a cell
  const addValidation = (cellRef: string, validation: CellData['validation']) => {
    setData(prevData => {
      const newData = { ...prevData };
      const currentCell = newData[cellRef] || { value: '', type: 'text' as const };
      newData[cellRef] = { ...currentCell, validation };
      return newData;
    });
  };

  // Render cell content
  const renderCellContent = (cellRef: string) => {
    const cell = data[cellRef];
    if (!cell) return '';
    
    if (cell.type === 'formula') {
      return cell.computedValue?.toString() || '';
    }
    
    return cell.value;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Spreadsheet Engine</h2>
        <p className="text-gray-600">Advanced spreadsheet with formula support and data validation</p>
      </div>

      {/* Formula Bar */}
      <div className="mb-4 flex items-center space-x-2">
        <Label className="font-medium">{selectedCell}:</Label>
        <Input
          ref={inputRef}
          value={formulaBarValue}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          placeholder="Enter value or formula (e.g., =SUM(A1:A5))"
          className="flex-1"
        />
        {validationErrors[selectedCell] && (
          <span className="text-red-500 text-sm">{validationErrors[selectedCell]}</span>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Add Validation
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addValidation(selectedCell, { type: 'number', required: true })}>
              Number (Required)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addValidation(selectedCell, { type: 'number', min: 0, max: 100 })}>
              Number (0-100)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addValidation(selectedCell, { type: 'list', options: ['Yes', 'No', 'Maybe'] })}>
              List (Yes/No/Maybe)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addValidation(selectedCell, { type: 'date' })}>
              Date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleFormulaBarChange('=SUM(A1:A5)')}
        >
          Insert SUM
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleFormulaBarChange('=AVERAGE(A1:A5)')}
        >
          Insert AVERAGE
        </Button>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto border border-gray-300 rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-12 h-8 bg-gray-100 border border-gray-300 text-xs font-medium"></th>
              {Array.from({ length: cols }, (_, colIndex) => (
                <th key={colIndex} className="min-w-24 h-8 bg-gray-100 border border-gray-300 text-xs font-medium">
                  {getColumnHeader(colIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="w-12 h-8 bg-gray-100 border border-gray-300 text-xs font-medium text-center">
                  {rowIndex + 1}
                </td>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const cellRef = getCellRef(rowIndex, colIndex);
                  const isSelected = selectedCell === cellRef;
                  const hasError = validationErrors[cellRef];
                  
                  return (
                    <td
                      key={colIndex}
                      className={`min-w-24 h-8 border border-gray-300 cursor-pointer hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-100 border-blue-500' : ''
                      } ${hasError ? 'bg-red-50 border-red-300' : ''}`}
                      onClick={() => handleCellClick(cellRef)}
                    >
                      <div className="px-2 py-1 text-sm truncate">
                        {renderCellContent(cellRef)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="mt-4 text-sm text-gray-600">
        <p>Selected: {selectedCell} | Cells with data: {Object.keys(data).length} | Formulas: {Object.values(data).filter(cell => cell.type === 'formula').length}</p>
      </div>
    </div>
  );
};

export default SpreadsheetEngine;