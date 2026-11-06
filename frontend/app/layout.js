import { Archivo } from "next/font/google";
import "./globals.css";

// One family, used across its width axis: condensed for signs, normal for reading.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap", variable: "--font" });

export const metadata = {
  title: "PneumoScan — chest X-ray in, evidence out",
  description:
    "Upload a chest X-ray. A DenseNet121 model reads it, shows where it looked, and explains the result in plain language.",
};

export const viewport = { themeColor: "#0a2bcb" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
