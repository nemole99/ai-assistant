import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, tanstack, vitest],
  ignorePatterns: core.ignorePatterns,
  rules: {
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
    "no-negated-condition": "off",
    "no-nested-ternary": "off",
    "no-param-reassign": "off",
    "no-plusplus": "off",
    "no-shadow": "off",
    "no-use-before-define": "off",
    "prefer-destructuring": "off",
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "off",
    "react/no-children-prop": "off",
    "require-unicode-regexp": "off",
    "typescript/ban-types": "off",
    "typescript/consistent-type-imports": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "unicorn/filename-case": "off",
    "unicorn/no-abusive-eslint-disable": "off",
    "unicorn/no-array-reduce": "off",
    "unicorn/no-array-reverse": "off",
    "unicorn/no-document-cookie": "off",
    "unicorn/no-negated-condition": "off",
    "unicorn/no-nested-ternary": "off",
    "unicorn/prefer-add-event-listener": "off",
    "vitest/require-mock-type-parameters": "off",
  },
});
