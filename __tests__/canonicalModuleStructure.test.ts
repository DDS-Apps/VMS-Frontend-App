const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("@babel/parser");

const MODULE_PATHS = [
  path.resolve(__dirname, "../screens/Dashboard/OverviewScreen.tsx"),
  path.resolve(__dirname, "../constants/requestConstants.ts"),
];

function bindingNames(pattern) {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [pattern.name];
  if (pattern.type === "RestElement" || pattern.type === "AssignmentPattern") {
    return bindingNames(pattern.argument || pattern.left);
  }
  if (pattern.type === "ObjectPattern") {
    return pattern.properties.flatMap((property) =>
      property.type === "RestElement"
        ? bindingNames(property.argument)
        : bindingNames(property.value),
    );
  }
  if (pattern.type === "ArrayPattern") {
    return pattern.elements.flatMap((element) => bindingNames(element));
  }
  return [];
}

function topLevelBindingNames(source, filePath) {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  const names = [];

  const collectDeclaration = (declaration) => {
    if (!declaration) return;
    if (declaration.type === "VariableDeclaration") {
      declaration.declarations.forEach((item) => {
        names.push(...bindingNames(item.id));
      });
      return;
    }
    if (
      declaration.type === "FunctionDeclaration" ||
      declaration.type === "ClassDeclaration" ||
      declaration.type === "TSInterfaceDeclaration" ||
      declaration.type === "TSTypeAliasDeclaration" ||
      declaration.type === "TSEnumDeclaration" ||
      declaration.type === "TSDeclareFunction"
    ) {
      if (declaration.id) names.push(declaration.id.name);
    }
  };

  ast.program.body.forEach((node) => {
    if (node.type === "ImportDeclaration") {
      node.specifiers.forEach((specifier) => names.push(specifier.local.name));
      return;
    }
    if (node.type === "ExportNamedDeclaration") {
      collectDeclaration(node.declaration);
      return;
    }
    if (node.type === "ExportDefaultDeclaration") {
      collectDeclaration(node.declaration);
      return;
    }
    collectDeclaration(node);
  });

  return { filePath, names };
}

describe("canonical module structure", () => {
  it.each(MODULE_PATHS)(
    "has no repeated top-level imports or declarations: %s",
    (filePath) => {
      const { names } = topLevelBindingNames(fs.readFileSync(filePath, "utf8"), filePath);
      const repeated = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];

      expect(repeated).toEqual([]);
    },
  );
});