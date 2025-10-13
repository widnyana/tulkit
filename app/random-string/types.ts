export interface RandomStringOptions {
  count: number;
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
}

export interface GeneratedString {
  id: string;
  value: string;
}
