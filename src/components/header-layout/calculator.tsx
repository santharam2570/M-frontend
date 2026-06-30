"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalculatorProps {
  onClose: () => void
}

export function Calculator({ onClose }: CalculatorProps) {
  const [display, setDisplay] = React.useState("0")
  const [operation, setOperation] = React.useState<string | null>(null)
  const [prevValue, setPrevValue] = React.useState<number | null>(null)
  const [resetDisplay, setResetDisplay] = React.useState(false)

  const handleNumberClick = (num: string) => {
    if (display === "0" || resetDisplay) {
      setDisplay(num)
      setResetDisplay(false)
    } else {
      setDisplay(display + num)
    }
  }

  const handleOperationClick = (op: string) => {
    const currentValue = Number.parseFloat(display)

    if (prevValue === null) {
      setPrevValue(currentValue)
    } else if (operation) {
      const result = calculate(prevValue, currentValue, operation)
      setPrevValue(result)
      setDisplay(String(result))
    }

    setOperation(op)
    setResetDisplay(true)
  }

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+":
        return a + b
      case "-":
        return a - b
      case "×":
        return a * b
      case "÷":
        return a / b
      default:
        return b
    }
  }

  const handleEquals = () => {
    if (prevValue === null || operation === null) return

    const currentValue = Number.parseFloat(display)
    const result = calculate(prevValue, currentValue, operation)

    setDisplay(String(result))
    setPrevValue(null)
    setOperation(null)
    setResetDisplay(true)
  }

  const handleClear = () => {
    setDisplay("0")
    setOperation(null)
    setPrevValue(null)
    setResetDisplay(false)
  }

  const handleBackspace = () => {
    if (display.length === 1 || display === "0") {
      setDisplay("0")
    } else {
      setDisplay(display.slice(0, -1))
    }
  }

  const handleDecimal = () => {
    if (resetDisplay) {
      setDisplay("0.")
      setResetDisplay(false)
    } else if (!display.includes(".")) {
      setDisplay(display + ".")
    }
  }

  return (
    <div className="fixed right-4 top-16 z-40 w-64 bg-gray-900 rounded-lg shadow-xl border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between p-2 bg-gray-800">
        <h3 className="text-sm font-medium text-white">Calculator</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2">
        <div className="bg-gray-800 p-3 mb-2 rounded text-right text-white text-2xl font-medium h-12 overflow-hidden">
          {display}
        </div>

        <div className="grid grid-cols-4 gap-1">
          <Button variant="ghost" className="bg-gray-700 hover:bg-gray-600 text-white h-10" onClick={handleClear}>
            C
          </Button>
          <Button variant="ghost" className="bg-gray-700 hover:bg-gray-600 text-white h-10" onClick={handleBackspace}>
            ←
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-700 hover:bg-gray-600 text-white h-10"
            onClick={() => handleOperationClick("÷")}
          >
            ÷
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-700 hover:bg-gray-600 text-white h-10"
            onClick={() => handleOperationClick("×")}
          >
            ×
          </Button>

          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("7")}
          >
            7
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("8")}
          >
            8
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("9")}
          >
            9
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-700 hover:bg-gray-600 text-white h-10"
            onClick={() => handleOperationClick("-")}
          >
            -
          </Button>

          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("4")}
          >
            4
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("5")}
          >
            5
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("6")}
          >
            6
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-700 hover:bg-gray-600 text-white h-10"
            onClick={() => handleOperationClick("+")}
          >
            +
          </Button>

          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("1")}
          >
            1
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("2")}
          >
            2
          </Button>
          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10"
            onClick={() => handleNumberClick("3")}
          >
            3
          </Button>
          <Button
            variant="ghost"
            className="bg-primary hover:bg-primary/90 text-white h-10 row-span-2"
            onClick={handleEquals}
          >
            =
          </Button>

          <Button
            variant="ghost"
            className="bg-gray-800 hover:bg-gray-700 text-white h-10 col-span-2"
            onClick={() => handleNumberClick("0")}
          >
            0
          </Button>
          <Button variant="ghost" className="bg-gray-800 hover:bg-gray-700 text-white h-10" onClick={handleDecimal}>
            .
          </Button>
        </div>
      </div>
    </div>
  )
}
