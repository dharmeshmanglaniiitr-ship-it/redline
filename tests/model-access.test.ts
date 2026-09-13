/**
 * Whether this deployment can call a model, and what it does when it cannot.
 *
 * There is no model id in this repository and there is no default for one. A missing
 * `OPENROUTER_MODEL` has to come back as a stated absence naming the variable, because
 * the alternative is Redline quietly picking a model nobody chose and producing analysis
 * nobody tested. That is the whole of what is asserted here: the state, and which
 * variable it names. Nothing calls OpenRouter.
 */

import { afterEach, describe, expect, it } from "vitest";

import { openRouterAccess } from "@/lib/model/openrouter";

const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;

afterEach(() => {
  restore("OPENROUTER_API_KEY", OPENROUTER_API_KEY);
  restore("OPENROUTER_MODEL", OPENROUTER_MODEL);
});

describe("model access", () => {
  it("names both variables when the environment has neither", () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;

    const access = openRouterAccess();
    expect(access.outcome).toBe("not-set-up");
    if (access.outcome !== "not-set-up") return;
    expect(access.missing).toEqual(["OPENROUTER_API_KEY", "OPENROUTER_MODEL"]);
  });

  it("refuses to guess a model when only the key is set", () => {
    process.env.OPENROUTER_API_KEY = "not-a-real-key";
    delete process.env.OPENROUTER_MODEL;

    const access = openRouterAccess();
    expect(access.outcome).toBe("not-set-up");
    if (access.outcome !== "not-set-up") return;
    expect(access.missing).toEqual(["OPENROUTER_MODEL"]);
  });

  it("treats a variable that is only whitespace as unset", () => {
    process.env.OPENROUTER_API_KEY = "   ";
    process.env.OPENROUTER_MODEL = "a-model-id-from-the-environment";

    const access = openRouterAccess();
    expect(access.outcome).toBe("not-set-up");
    if (access.outcome !== "not-set-up") return;
    expect(access.missing).toEqual(["OPENROUTER_API_KEY"]);
  });

  it("is ready once both are set", () => {
    process.env.OPENROUTER_API_KEY = "not-a-real-key";
    process.env.OPENROUTER_MODEL = "a-model-id-from-the-environment";

    expect(openRouterAccess().outcome).toBe("ready");
  });
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
