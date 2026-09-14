"use client";

import Link from "next/link";
import { useState, useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { GeneratedString, RandomStringOptions } from "./types";
import { generateRandomStrings } from "./utils";

export default function RandomStringPage() {
  const [count, setCount] = useState(1);
  const [length, setLength] = useState(16);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [results, setResults] = useState<GeneratedString[]>([]);

  const countId = useId();
  const lengthId = useId();

  const handleGenerate = () => {
    const options: RandomStringOptions = {
      count,
      length,
      useUppercase,
      useLowercase,
      useNumbers,
      useSymbols,
    };
    const generated = generateRandomStrings(options);
    setResults(generated);
  };

  const copyAll = () => {
    const text = results.map((r) => r.value).join("\n");
    navigator.clipboard.writeText(text);
  };

  const copySingle = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const handleClear = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Random String Generator
          </h1>
          <p className="text-muted-foreground mb-4">
            Generate secure random strings with customizable options
          </p>
          <p className="sr-only">
            Generate random strings for API keys, tokens, temporary passwords,
            or test data. Configure character sets (alphanumeric, hex, base64,
            custom), length, and output format — single string,
            newline-separated list, or comma-delimited. Useful for seeding dev
            environments, generating test fixtures, or when you need a quick
            crypto-practice token that's at least trying. Everything runs in
            your browser; nothing is sent to a server.
          </p>
        </header>

        <div className="bg-card rounded-lg shadow-lg p-6 mb-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label
                htmlFor={countId}
                className="block text-sm font-medium text-foreground mb-2"
              >
                Number of Strings (min: 1, max: 50)
              </label>
              <input
                id={countId}
                type="number"
                min="1"
                max="50"
                value={count === 0 ? "" : count}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow empty string for deletion, update state with number
                  if (val === "") {
                    setCount(0);
                  } else {
                    setCount(Number(val));
                  }
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isNaN(val) || val < 1) setCount(1);
                  else if (val > 50) setCount(50);
                }}
                className="w-full px-4 py-2 text-foreground border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor={lengthId}
                className="block text-sm font-medium text-foreground mb-2"
              >
                String Length (min: 4, max: 255)
              </label>
              <input
                id={lengthId}
                type="number"
                min="4"
                max="255"
                value={length === 0 ? "" : length}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow empty string for deletion, update state with number
                  if (val === "") {
                    setLength(0);
                  } else {
                    setLength(Number(val));
                  }
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isNaN(val) || val < 4) setLength(4);
                  else if (val > 255) setLength(255);
                }}
                className="w-full px-4 py-2 text-foreground border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="block text-sm font-medium text-foreground mb-3">
              Character Types
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={useUppercase}
                  onCheckedChange={(checked) =>
                    setUseUppercase(checked === true)
                  }
                />
                <span className="text-sm text-foreground">Uppercase (A-Z)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={useLowercase}
                  onCheckedChange={(checked) =>
                    setUseLowercase(checked === true)
                  }
                />
                <span className="text-sm text-foreground">Lowercase (a-z)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={useNumbers}
                  onCheckedChange={(checked) => setUseNumbers(checked === true)}
                />
                <span className="text-sm text-foreground">Numbers (0-9)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={useSymbols}
                  onCheckedChange={(checked) => setUseSymbols(checked === true)}
                />
                <span className="text-sm text-foreground">Symbols (!@#$)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleGenerate}
              className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Generate
            </button>
            {results.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={copyAll}
                  className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Copy All
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Generated Strings ({results.length})
              </h2>
            </div>
            <div className="space-y-2">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-muted border border-border rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <code className="font-mono text-sm text-foreground break-all flex-1">
                    {item.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => copySingle(item.value)}
                    className="ml-4 px-3 py-1 text-xs bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
