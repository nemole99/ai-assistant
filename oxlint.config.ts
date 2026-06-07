import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, remix, vitest],
  rules: {
    complexity: "warn",
    "default-case": "off",
    eqeqeq: "off",
    "func-name-matching": "off",
    "func-style": "off",
    "import/no-cycle": "off",
    "jsx-a11y/anchor-has-content": "off",
    "jsx-a11y/control-has-associated-label": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "jsx-a11y/prefer-tag-over-role": "off",
    "no-barrel-file": "off",
    "no-empty-function": "off",
    "no-inline-comments": "off",
    "no-negated-condition": "warn",
    "no-nested-ternary": "warn",
    "no-param-reassign": "warn",
    "no-plusplus": "off",
    "no-shadow": "warn",
    "no-use-before-define": "off",
    "prefer-destructuring": "warn",
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "warn",
    "react/no-children-prop": "off",
    "require-unicode-regexp": "off",
    "typescript/ban-types": "warn",
    "typescript/consistent-type-imports": "off",
    "typescript/no-explicit-any": "warn",
    "typescript/no-non-null-assertion": "warn",
    "unicorn/filename-case": "warn",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-reverse": "off",
    "unicorn/no-document-cookie": "warn",
    "unicorn/no-negated-condition": "off",
    "unicorn/prefer-add-event-listener": "off",
    "vitest/require-mock-type-parameters": "off",
  },
});
