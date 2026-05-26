import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

const ignoredDirs = new Set([
  ".git",
  ".github",
  ".vscode",
  "dist",
  "node_modules"
]);

const staticRuntimeDirs = [
  "apps",
  "assets",
  "data",
  "data-json",
  "presentation-assets"
];

const staticRuntimeFiles = [
  "RIO_Tools_Suite_presentacion_comercial.pdf"
];

const copiedExtensions = new Set([
  ".css",
  ".csv",
  ".gif",
  ".jpg",
  ".jpeg",
  ".js",
  ".json",
  ".pdf",
  ".png",
  ".svg",
  ".webmanifest",
  ".webp"
]);

function findHtmlEntries(dir, entries = {}) {
  for (const item of readdirSync(dir)) {
    const absolutePath = resolve(dir, item);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (!ignoredDirs.has(item)) {
        findHtmlEntries(absolutePath, entries);
      }
      continue;
    }

    if (!item.endsWith(".html")) {
      continue;
    }

    const relativePath = relative(rootDir, absolutePath);
    const entryName = relativePath
      .replace(/\\/g, "/")
      .replace(/\.html$/, "")
      .replace(/[^a-zA-Z0-9/_-]/g, "-")
      .replace(/\//g, "-");

    entries[entryName] = absolutePath;
  }

  return entries;
}

function getExtension(fileName) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index).toLowerCase();
}

function copyRuntimeDirectory(sourceDir, targetDir) {
  if (!statSync(sourceDir, { throwIfNoEntry: false })?.isDirectory()) {
    return;
  }

  mkdirSync(targetDir, { recursive: true });

  for (const item of readdirSync(sourceDir)) {
    const sourcePath = resolve(sourceDir, item);
    const targetPath = resolve(targetDir, item);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      copyRuntimeDirectory(sourcePath, targetPath);
      continue;
    }

    if (!copiedExtensions.has(getExtension(item))) {
      continue;
    }

    copyFileSync(sourcePath, targetPath);
  }
}

function copyClassicRuntimeFiles() {
  return {
    name: "copy-classic-runtime-files",
    writeBundle() {
      const outDir = resolve(rootDir, "dist");

      for (const dir of staticRuntimeDirs) {
        copyRuntimeDirectory(resolve(rootDir, dir), resolve(outDir, dir));
      }

      for (const file of staticRuntimeFiles) {
        const sourcePath = resolve(rootDir, file);
        if (statSync(sourcePath, { throwIfNoEntry: false })?.isFile()) {
          copyFileSync(sourcePath, resolve(outDir, file));
        }
      }
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [copyClassicRuntimeFiles()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: findHtmlEntries(rootDir)
    }
  },
  server: {
    open: true
  }
});
