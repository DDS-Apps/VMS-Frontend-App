#!/usr/bin/env node

/**
 * Fail before an EAS build when a source module has been appended to itself.
 *
 * This intentionally uses only Node's standard library because
 * eas-build-pre-install runs before project dependencies are installed. It is
 * a build guard, not a repair step: duplicate source is reported and the
 * process exits without changing any files.
 */

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MODULE_PATHS = [
  path.resolve(__dirname, "../screens/Dashboard/OverviewScreen.tsx"),
  path.resolve(__dirname, "../constants/requestConstants.ts"),
];
const MODULE_PATHS = process.argv.slice(2).length
  ? process.argv.slice(2).map((filePath) => path.resolve(process.cwd(), filePath))
  : DEFAULT_MODULE_PATHS;

function maskCommentsAndStrings(source) {
  const output = source.split("");
  let state = "code";
  let quote = "";

  const blank = (index) => {
    if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
  };

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (state === "lineComment") {
      blank(index);
      if (current === "\n") state = "code";
      continue;
    }

    if (state === "blockComment") {
      blank(index);
      if (current === "*" && next === "/") {
        blank(index + 1);
        index += 1;
        state = "code";
      }
      continue;
    }

    if (state === "string") {
      blank(index);
      if (current === "\\") {
        blank(index + 1);
        index += 1;
      } else if (current === quote) {
        state = "code";
      }
      continue;
    }

    if (current === "/" && next === "/") {
      blank(index);
      blank(index + 1);
      index += 1;
      state = "lineComment";
      continue;
    }

    if (current === "/" && next === "*") {
      blank(index);
      blank(index + 1);
      index += 1;
      state = "blockComment";
      continue;
    }

    if (current === "'" || current === '"' || current === "`") {
      quote = current;
      blank(index);
      state = "string";
    }
  }

  return output.join("");
}

function declarationNames(line) {
  const declarationMatch = line.match(
    /^\s*(?:export\s+(?:default\s+)?|declare\s+)?(const|let|var|function|class|interface|type|enum|namespace)\b([\s\S]*)/,
  );
  if (!declarationMatch) return [];

  const [, kind, remainder] = declarationMatch;
  if (kind !== "const" && kind !== "let" && kind !== "var") {
    const name = remainder.match(/^\s*([A-Za-z_$][\w$]*)/);
    return name ? [name[1]] : [];
  }

  const firstBinding = remainder.match(/^\s*([A-Za-z_$][\w$]*)/);
  if (firstBinding) return [firstBinding[1]];

  const objectBinding = remainder.match(/^\s*\{([^}]*)\}/);
  if (!objectBinding) return [];

  return objectBinding[1]
    .split(",")
    .map((part) => part.trim().replace(/=.*/, ""))
    .map((part) => {
      const binding = part.includes(":") ? part.split(":").pop() : part;
      return binding.trim().match(/^([A-Za-z_$][\w$]*)/)?.[1];
    })
    .filter(Boolean);
}

function topLevelStructure(source) {
  const masked = maskCommentsAndStrings(source);
  const lines = masked.split(/\r?\n/);
  const names = [];
  let braceDepth = 0;

  lines.forEach((line, index) => {
    if (braceDepth === 0) {
      names.push(
        ...declarationNames(line).map((name) => ({ name, line: index + 1 })),
      );
    }

    for (const character of line) {
      if (character === "{") braceDepth += 1;
      if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
    }
  });

  return names;
}

function repeatedItems(items, key) {
  const seen = new Map();
  const repeated = [];

  for (const item of items) {
    const value = item[key];
    if (seen.has(value)) {
      repeated.push({ ...item, firstLine: seen.get(value) });
    } else {
      seen.set(value, item.line);
    }
  }

  return repeated;
}

let failed = false;

for (const filePath of MODULE_PATHS) {
  const source = fs.readFileSync(filePath, "utf8");
  const names = topLevelStructure(source);
  const repeatedNames = repeatedItems(names, "name");

  if (repeatedNames.length === 0) {
    console.log(`canonical module check passed: ${path.relative(process.cwd(), filePath)}`);
    continue;
  }

  failed = true;
  console.error(`canonical module check failed: ${path.relative(process.cwd(), filePath)}`);
  for (const duplicate of repeatedNames) {
    console.error(
      `  duplicate declaration "${duplicate.name}" at lines ${duplicate.firstLine} and ${duplicate.line}`,
    );
  }
  console.error("Source was not modified; remove the appended module before building.");
}

if (failed) process.exit(1);